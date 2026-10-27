// The Discord post for a visit: one embed, sent when the visit starts and
// edited with the session as it goes on

import type { VisitEvent } from "./beacon";
import type { Agent } from "./ua";

// The site the visits come from, which names the posts
export const SITE = "https://ml3labs.com";
const HOST = new URL(SITE).host;

export type Visit = {
    n: number; // visitor number
    visits: number; // this browser's visit count, this one included
    label: string; // "dev" for test visits from a dev server
    city: string | null;
    region: string | null;
    country: string | null;
    timezone: string | null;
    ip: string | null;
    network: string | null;
    agent: Agent;
    lang: string;
    entry: string;
    referrer: string;
};

export type Embed = {
    title: string;
    color: number;
    fields: { name: string; value: string; inline: boolean }[];
    footer: { text: string };
    timestamp: string;
};

export type Payload = {
    username: string;
    avatar_url: string;
    embeds: Embed[];
};

const MAROON = 0x8b2145;
export const SESSION = "📊 Session";

const ordinal = (k: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = k % 100;
    return `${k}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
};

function countryName(code: string | null) {
    if (!code) return "?";
    try {
        return (
            new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code
        );
    } catch {
        return code;
    }
}

function localTime(tz: string | null, now: Date) {
    if (!tz) return "?";
    try {
        return now.toLocaleString("en-US", {
            timeZone: tz,
            weekday: "short",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        });
    } catch {
        return "?";
    }
}

// Brackets and parentheses in the address would end the link early, and
// let a forged referrer add a link of its own
const linkSafe = (href: string) =>
    href.replace(
        /[()[\]]/g,
        (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
    );

// Discord refuses the whole post if a field runs past 1024 characters, so
// a long address shows as its host alone
function referrerText(referrer: string) {
    if (!referrer) return "Direct";
    try {
        const url = new URL(referrer);
        const link = `[${url.hostname}](${linkSafe(url.href)})`;
        return link.length <= 1024 ? link : url.hostname;
    } catch {
        return "Direct";
    }
}

export function visitPayload(v: Visit, now: Date): Payload {
    const again = v.visits > 1 ? ` · ${ordinal(v.visits)} visit` : "";
    const label = v.label ? ` · ${v.label}` : "";
    const network = v.network ?? "?";
    return {
        username: HOST,
        avatar_url: `${SITE}/icon.png`,
        embeds: [
            {
                title: `Visitor #${v.n.toLocaleString("en-US")}${again}${label}`,
                color: MAROON,
                fields: [
                    {
                        name: "📍 Location",
                        value: `${v.city ?? "?"}, ${v.region ?? "?"}\n${countryName(v.country)}\n\`${localTime(v.timezone, now)}\``,
                        inline: true,
                    },
                    {
                        name: "🌐 Network",
                        value:
                            v.agent.device === "Desktop" && v.ip
                                ? `\`${v.ip}\`\n${network}`
                                : network,
                        inline: true,
                    },
                    {
                        name: "🖥 Device",
                        value: `${v.agent.browser}\n${v.agent.os}`,
                        inline: true,
                    },
                    {
                        name: "🌍 Language",
                        value: `\`${v.lang || "?"}\``,
                        inline: true,
                    },
                    { name: "📄 Entry", value: `\`${v.entry}\``, inline: true },
                    {
                        name: "🔗 Referrer",
                        value: referrerText(v.referrer),
                        inline: true,
                    },
                    {
                        name: SESSION,
                        value: "```ini\nTracking (has not left the site yet)...```",
                        inline: false,
                    },
                ],
                footer: { text: `${HOST} analytics${label}` },
                timestamp: now.toISOString(),
            },
        ],
    };
}

export function duration(ms: number) {
    const s = Math.max(0, Math.round(ms / 1000));
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
    return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}

// One line a page (with the time spent on it) or a click, oldest first.
// Pages are ini comments and clicks ini sections, so Discord colours the
// two apart. `site` is the host the visit came from: links to it are
// clicks around the site, the rest open other sites.
export function sessionLines(
    events: VisitEvent[],
    until: number,
    site: string,
) {
    const pages = events.filter((e) => e.t === "page");
    return events.map((e) => {
        if (e.t === "page") {
            const next = pages.find((p) => p.at > e.at);
            return `; ${e.path}  (${duration((next?.at ?? until) - e.at)})`;
        }
        if (e.href.startsWith("mailto:"))
            return `[ Emailed ${e.href.slice(7).split("?")[0]} ]`;
        let url: URL | null = null;
        try {
            url = new URL(e.href);
        } catch {}
        if (url && url.host !== site)
            return `[ Opened ${e.label} → ${url.hostname} ]`;
        return `[ Clicked "${e.label}" in the ${e.area} ]`;
    });
}

// Discord rejects embed fields over 1024 characters, and a rejected edit
// leaves the post stuck as it was. Keep the newest lines that fit, after a
// note of how many earlier ones were left out.
const FIELD_LIMIT = 1024;
const block = (body: string) => `\`\`\`ini\n${body}\`\`\``;

export function sessionField(lines: string[]) {
    if (!lines.length) return block("; (no pages yet)");
    const whole = block(lines.join("\n"));
    if (whole.length <= FIELD_LIMIT) return whole;
    // Room beside the note at its longest, so whatever is kept fits
    let room = FIELD_LIMIT - block(`; … ${lines.length} earlier`).length;
    let k = lines.length;
    while (k > 0 && lines[k - 1].length + 1 <= room)
        room -= lines[--k].length + 1;
    return block([`; … ${k} earlier`, ...lines.slice(k)].join("\n"));
}
