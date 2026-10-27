import { expect, test } from "vitest";

import type { VisitEvent } from "./beacon";
import { sessionField, sessionLines, visitPayload } from "./embed";

const link = (href: string, label = "x"): VisitEvent => ({
    t: "link",
    label,
    href,
    area: "nav",
    at: 2000,
});

test("a page's time runs to the next page, the last to the visit's end", () => {
    const lines = sessionLines(
        [
            { t: "page", path: "/", at: 0 },
            { t: "page", path: "/team/", at: 12_000 },
        ],
        75_000,
        "ml3labs.com",
    );
    expect(lines).toEqual(["; /  (12s)", "; /team/  (1m 3s)"]);
});

test("links to the visit's own site are clicks, the rest open other sites", () => {
    const lines = (site: string) =>
        sessionLines(
            [
                link("http://192.168.2.10:3001/team/", "Team"),
                link("https://www.linkedin.com/company/ml3labs/", "LinkedIn"),
                link("mailto:contact@ml3labs.com?subject=Hi"),
            ],
            0,
            site,
        );
    expect(lines("192.168.2.10:3001")).toEqual([
        '[ Clicked "Team" in the nav ]',
        "[ Opened LinkedIn → www.linkedin.com ]",
        "[ Emailed contact@ml3labs.com ]",
    ]);
    expect(lines("ml3labs.com")[0]).toBe("[ Opened Team → 192.168.2.10 ]");
});

test("a long session keeps its newest lines under Discord's 1024 characters", () => {
    const lines = Array.from(
        { length: 120 },
        (_, k) => `; /page-${k}/  (${k}s)`,
    );
    const field = sessionField(lines);
    expect(field.length).toBeLessThanOrEqual(1024);
    expect(field).toMatch(/^```ini\n; … \d+ earlier\n/);
    expect(field).toContain("; /page-119/  (119s)```");
    const kept = field.split("\n").length - 2;
    expect(field).toContain(`; … ${120 - kept} earlier`);
    expect(sessionField(lines.slice(0, 3))).toBe(
        "```ini\n" + lines.slice(0, 3).join("\n") + "```",
    );
    expect(sessionField([])).toBe("```ini\n; (no pages yet)```");
});

test("a referrer can't break out of its link", () => {
    const p = visitPayload(
        {
            n: 1,
            visits: 1,
            label: "",
            city: null,
            region: null,
            country: null,
            timezone: null,
            ip: null,
            network: null,
            agent: { browser: "Chrome", os: "macOS", device: "Desktop" },
            lang: "en",
            entry: "/",
            referrer: "https://example.com/a)[x](https://evil.example",
        },
        new Date(0),
    );
    const ref = p.embeds[0].fields.find((f) => f.name === "🔗 Referrer");
    expect(ref?.value).toBe(
        "[example.com](https://example.com/a%29%5Bx%5D%28https://evil.example)",
    );
});
