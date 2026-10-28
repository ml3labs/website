"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import {
    keepEvents,
    MAX_HREF,
    MAX_LABEL,
    type VisitEvent,
} from "../../tracker/src/beacon";

// Visit tracking: the tracker Worker (tracker/) numbers each browser, posts
// the visit to Discord and edits that post as the visit goes on. Off unless
// NEXT_PUBLIC_TRACKER_URL is set.
const ENDPOINT = process.env.NEXT_PUBLIC_TRACKER_URL?.replace(/\/+$/, "");

const VID = "ml3.vid"; // localStorage: this browser, across visits
const SID = "ml3.sid"; // sessionStorage: this visit
const EVENTS = "ml3.events";

// Tracking must never break the page: whatever throws (blocked or full
// storage, a browser without beacons) just stops it
function safely(run: () => void) {
    try {
        run();
    } catch {}
}

function store(kind: "local" | "session") {
    try {
        return kind === "local" ? window.localStorage : window.sessionStorage;
    } catch {
        return null;
    }
}

// randomUUID needs a secure context, which a plain-http address on the
// local network is not
function uuid() {
    if (crypto.randomUUID) return crypto.randomUUID();
    const b = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

function id(s: Storage, key: string) {
    let v = s.getItem(key);
    if (!v) {
        v = uuid();
        s.setItem(key, v);
    }
    return v;
}

function readEvents(s: Storage): VisitEvent[] {
    try {
        return JSON.parse(s.getItem(EVENTS) ?? "[]") as VisitEvent[];
    } catch {
        return [];
    }
}

function record(e: VisitEvent) {
    const s = store("session");
    if (!s) return;
    s.setItem(EVENTS, JSON.stringify(keepEvents([...readEvents(s), e])));
}

// A beacon posts its string as text/plain, which needs no CORS, and still
// goes out as the page closes
function send(path: "/visit" | "/events", body: object) {
    navigator.sendBeacon(`${ENDPOINT}${path}`, JSON.stringify(body));
}

function flush() {
    const s = store("session");
    const sid = s?.getItem(SID);
    if (!s || !sid) return;
    send("/events", { sid, events: readEvents(s), now: Date.now() });
}

// What a click on a link was: its words (or label), where it goes, and
// which part of the page it sat in
function linkEvent(a: HTMLAnchorElement): VisitEvent {
    const words = (a.getAttribute("aria-label") ?? a.textContent ?? "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, MAX_LABEL);
    const area = a.closest("header")
        ? "nav"
        : a.closest("footer")
          ? "footer"
          : "page";
    return {
        t: "link",
        label: words,
        href: a.href.slice(0, MAX_HREF),
        area,
        at: Date.now(),
    };
}

export function Tracker() {
    const pathname = usePathname();

    // Start the visit, once per tab, then listen for clicks and leaving
    useEffect(() => {
        if (!ENDPOINT) return;
        const local = store("local");
        const session = store("session");
        if (!local || !session) return;

        // A new tab is a new visit; a reload carries on the one it is part
        // of. The stored id also stops React's second run in development
        // from starting another.
        safely(() => {
            if (session.getItem(SID) !== null) return;
            send("/visit", {
                sid: id(session, SID),
                vid: id(local, VID),
                path: window.location.pathname,
                referrer: document.referrer,
                lang: navigator.language,
                // An iPad asks for the desktop site as a Mac
                touch: navigator.maxTouchPoints > 1,
            });
        });

        const onClick = (e: MouseEvent) =>
            safely(() => {
                const a = (e.target as Element | null)?.closest?.("a[href]");
                if (!(a instanceof HTMLAnchorElement)) return;
                record(linkEvent(a));
                // An email link opens another app and leaves the page
                // showing, so nothing else would send it
                if (a.protocol === "mailto:") flush();
            });
        // Leaving, switching tabs or opening another site in a new one
        const onHide = () => {
            if (document.visibilityState === "hidden") safely(flush);
        };
        document.addEventListener("click", onClick, true);
        document.addEventListener("visibilitychange", onHide);
        return () => {
            document.removeEventListener("click", onClick, true);
            document.removeEventListener("visibilitychange", onHide);
        };
    }, []);

    // Each page, as it is reached
    useEffect(() => {
        if (!ENDPOINT) return;
        const s = store("session");
        if (!s) return;
        const pages = readEvents(s).filter((e) => e.t === "page");
        if (pages[pages.length - 1]?.path === pathname) return;
        safely(() => record({ t: "page", path: pathname, at: Date.now() }));
    }, [pathname]);

    return null;
}
