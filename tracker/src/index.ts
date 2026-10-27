// The site's visitor tracker. The page sends two kinds of beacon:
//
//   POST /visit   once a visit starts: numbers the browser, adds where it
//                 is from Cloudflare's request.cf, posts the Discord embed
//   POST /events  when the tab hides, or an email link opens: the pages and
//                 clicks so far, which edit that post's session field
//
// Both come by sendBeacon as text/plain JSON, which needs no CORS: the page
// never reads a reply. The Discord webhook stays here, a secret: the page
// never sees it.

import {
    AREAS,
    type Area,
    keepEvents,
    MAX_BODY,
    MAX_HREF,
    MAX_LABEL,
    type VisitEvent,
} from "./beacon";
import {
    duration,
    type Embed,
    type Payload,
    SESSION,
    sessionField,
    sessionLines,
    SITE,
    visitPayload,
} from "./embed";
import { isBot, parseUA } from "./ua";

export interface Env {
    DB: D1Database;
    DISCORD_WEBHOOK_URL: string;
    DEV_VISITS: string;
}

type Body = Record<string, unknown>;
type Result = { status: number; body: unknown };

const ID = /^[A-Za-z0-9-]{8,64}$/;
// A dev server on this machine or the local network, reached the ways
// next.config.ts allows. Taken while DEV_VISITS is "on", and marked "dev".
const DEV_ORIGIN =
    /^http:\/\/(localhost|127\.0\.0\.1|10(\.\d+){3}|192\.168(\.\d+){2}|[\w-]+\.local)(:\d+)?$/;

const OK: Result = { status: 200, body: { ok: true } };

// A string from the client, cut to size, with backticks out so it can't
// break the code spans and ini block it lands in
const text = (v: unknown, n: number) =>
    typeof v === "string" ? v.replace(/`/g, "'").slice(0, n) : "";
const time = (v: unknown) =>
    typeof v === "number" && Number.isFinite(v) ? v : NaN;

export default {
    async fetch(req, env): Promise<Response> {
        const reply = ({ status, body }: Result) =>
            new Response(JSON.stringify(body), {
                status,
                headers: { "Content-Type": "application/json" },
            });

        const path = new URL(req.url).pathname;
        if (req.method !== "POST" || (path !== "/visit" && path !== "/events"))
            return reply({ status: 404, body: { error: "not found" } });

        // Anything but a browser can claim any origin; this only keeps
        // other sites' pages from sending visits
        const origin = req.headers.get("Origin") ?? "";
        const dev = env.DEV_VISITS === "on" && DEV_ORIGIN.test(origin);
        if (origin !== SITE && !dev)
            return reply({ status: 403, body: { error: "origin" } });

        if (Number(req.headers.get("Content-Length")) > MAX_BODY)
            return reply({ status: 413, body: { error: "too large" } });
        const raw = await req.text();
        if (raw.length > MAX_BODY)
            return reply({ status: 413, body: { error: "too large" } });
        let body: unknown;
        try {
            body = JSON.parse(raw);
        } catch {
            return reply({ status: 400, body: { error: "json" } });
        }
        if (typeof body !== "object" || body === null || Array.isArray(body))
            return reply({ status: 400, body: { error: "json" } });

        const site = new URL(origin).host;
        return reply(
            path === "/visit"
                ? await visit(req, env, body as Body, dev ? "dev" : "", site)
                : await events(env, body as Body, site),
        );
    },
} satisfies ExportedHandler<Env>;

async function visit(
    req: Request,
    env: Env,
    b: Body,
    label: string,
    site: string,
): Promise<Result> {
    const sid = text(b.sid, 64);
    const vid = text(b.vid, 64);
    if (!ID.test(sid) || !ID.test(vid))
        return { status: 400, body: { error: "id" } };
    const ua = req.headers.get("User-Agent") ?? "";
    if (isBot(ua)) return OK;

    const now = Date.now();
    const cf = req.cf as IncomingRequestCfProperties | undefined;
    const agent = parseUA(ua, b.touch === true);
    const network = cf?.asOrganization
        ? `${cf.asOrganization} (AS${cf.asn})`
        : null;
    const path = text(b.path, 200);
    const entry = path.startsWith("/") ? path : "/";
    const ref = text(b.referrer, 500);
    const referrer = /^https?:\/\//.test(ref) ? ref : "";
    const lang = text(b.lang, 35);

    // Claim the visit first: the same one sent twice posts once, and the
    // page's first /events finds its row even before the post is up
    const claim = await env.DB.prepare(
        `INSERT OR IGNORE INTO sessions (sid, vid, started, updated, events,
            country, region, city, network, device, browser, os, lang,
            referrer, entry)
         VALUES (?, ?, ?, ?, '[]', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
        .bind(
            sid,
            vid,
            now,
            now,
            cf?.country ?? null,
            cf?.region ?? null,
            cf?.city ?? null,
            network,
            agent.device,
            agent.browser,
            agent.os,
            lang,
            referrer || null,
            entry,
        )
        .run();
    if (!claim.meta.changes) return OK;

    // The browser's number is fixed on its first visit. One batch, so two
    // tabs opening at once can't both take a new number.
    const [numbered] = await env.DB.batch([
        env.DB.prepare(
            `INSERT INTO visitors (vid, n, visits, first_seen)
             VALUES (?, (SELECT value + 1 FROM counters WHERE name = 'visitors'), 1, ?)
             ON CONFLICT (vid) DO UPDATE SET visits = visits + 1
             RETURNING n, visits`,
        ).bind(vid, now),
        env.DB.prepare(
            `UPDATE counters SET value = value + 1
             WHERE name = 'visitors'
               AND value < (SELECT n FROM visitors WHERE vid = ?)`,
        ).bind(vid),
    ]);
    const row = numbered.results[0] as { n: number; visits: number };

    const payload = visitPayload(
        {
            n: row.n,
            visits: row.visits,
            label,
            city: cf?.city ?? null,
            region: cf?.region ?? null,
            country: cf?.country ?? null,
            timezone: cf?.timezone ?? null,
            ip: req.headers.get("CF-Connecting-IP"),
            network,
            agent,
            lang,
            entry,
            referrer,
        },
        new Date(now),
    );
    const res = await hook(env, "POST", null, payload);
    if (!res) return OK;
    const { id } = (await res.json()) as { id: string };

    // Events that came in while the post was on its way go up now, since
    // no other beacon may follow
    const s = await env.DB.prepare(
        "UPDATE sessions SET message_id = ? WHERE sid = ? RETURNING events, duration_ms",
    )
        .bind(id, sid)
        .first<{ events: string; duration_ms: number }>();
    const list = JSON.parse(s?.events ?? "[]") as VisitEvent[];
    if (s && list.length)
        await editSession(env, id, list, list[0].at + s.duration_ms, site);
    return OK;
}

// The events the client sends, kept to the shapes the post knows how to show
function clean(list: unknown): VisitEvent[] {
    if (!Array.isArray(list)) return [];
    const out: VisitEvent[] = [];
    for (const e of keepEvents(list)) {
        if (typeof e !== "object" || e === null) continue;
        const r = e as Body;
        const at = time(r.at);
        if (Number.isNaN(at)) continue;
        if (r.t === "page") {
            const path = text(r.path, 200);
            if (path.startsWith("/")) out.push({ t: "page", path, at });
        } else if (r.t === "link") {
            const href = text(r.href, MAX_HREF);
            const area = text(r.area, 10) as Area;
            if (/^(https?:|mailto:)/.test(href))
                out.push({
                    t: "link",
                    label: text(r.label, MAX_LABEL) || href,
                    href,
                    area: AREAS.includes(area) ? area : "page",
                    at,
                });
        }
    }
    return out.sort((a, b) => a.at - b.at);
}

async function events(env: Env, b: Body, site: string): Promise<Result> {
    const sid = text(b.sid, 64);
    if (!ID.test(sid)) return { status: 400, body: { error: "id" } };
    const s = await env.DB.prepare(
        "SELECT message_id, events, duration_ms FROM sessions WHERE sid = ?",
    )
        .bind(sid)
        .first<{
            message_id: string | null;
            events: string;
            duration_ms: number;
        }>();
    if (!s) return { status: 404, body: { error: "no such visit" } };

    const list = clean(b.events);
    const json = JSON.stringify(list);
    // The client's own clock, the one the events were stamped with
    const last = list[list.length - 1]?.at ?? 0;
    const sent = time(b.now);
    const until = Number.isNaN(sent) ? last : Math.max(sent, last);
    const spent = list.length ? until - list[0].at : 0;
    // The same beacon twice, or nothing new since the last: leave it be
    if (json === s.events && Math.abs(spent - s.duration_ms) < 1000) return OK;

    await Promise.all([
        s.message_id &&
            list.length &&
            editSession(env, s.message_id, list, until, site),
        env.DB.prepare(
            "UPDATE sessions SET events = ?, updated = ?, duration_ms = ? WHERE sid = ?",
        )
            .bind(json, Date.now(), spent, sid)
            .run(),
    ]);
    return OK;
}

// Puts the session so far into the post. Discord replaces a post's embeds
// whole, so the rest of the visit is read back from the post itself: the
// IP a post shows stays in Discord, never in D1.
async function editSession(
    env: Env,
    messageId: string,
    list: VisitEvent[],
    until: number,
    site: string,
) {
    const res = await hook(env, "GET", messageId);
    const e = res && ((await res.json()) as { embeds: Embed[] }).embeds[0];
    const field = e?.fields.find((f) => f.name.startsWith(SESSION));
    if (!e || !field) return;
    field.name = `${SESSION} · ${duration(until - list[0].at)}`;
    field.value = sessionField(sessionLines(list, until, site));
    const { title, color, fields, footer, timestamp } = e;
    await hook(env, "PATCH", messageId, {
        embeds: [
            { title, color, fields, footer: { text: footer.text }, timestamp },
        ],
    });
}

// The webhook's own API: post a message, or read back or edit one. Its
// query, a thread_id say, goes along with each.
async function hook(
    env: Env,
    method: "POST" | "GET" | "PATCH",
    messageId: string | null,
    body?: Payload | { embeds: Embed[] },
) {
    const url = new URL(env.DISCORD_WEBHOOK_URL);
    if (messageId) url.pathname += `/messages/${messageId}`;
    else url.searchParams.set("wait", "true");
    const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body && JSON.stringify(body),
    });
    if (res.ok) return res;
    console.error("discord", method, res.status, await res.text());
    return null;
}
