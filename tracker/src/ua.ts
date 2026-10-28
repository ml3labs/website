// Browser, OS and device class from a User-Agent string

export type Agent = { browser: string; os: string; device: string };

// First match wins: Edge and Opera also say Chrome, and Chrome says Safari
const BROWSERS: [RegExp, string][] = [
    [/Edg(?:A|iOS)?\/(\d+)/, "Edge"],
    [/OPR\/(\d+)/, "Opera"],
    [/Chromium\/(\d+)/, "Chromium"],
    [/(?:Chrome|CriOS)\/(\d+)/, "Chrome"],
    [/(?:Firefox|FxiOS)\/(\d+)/, "Firefox"],
    [/Version\/([\d.]+).*Safari\//, "Safari"],
    [/curl\/([\d.]+)/, "curl"],
];

// Crawlers and page checkers, which run a page without anyone reading it
export const isBot = (ua: string) =>
    /bot\/|crawler|spider|HeadlessChrome|Lighthouse/i.test(ua);

// An iPad asks for the desktop site as a Mac, so `touch` (a touch screen,
// which no Mac has) tells the two apart
export function parseUA(ua: string, touch = false): Agent {
    let browser = "Unknown browser";
    for (const [re, name] of BROWSERS) {
        const v = ua.match(re)?.[1];
        if (v) {
            browser = `${name} ${v}`;
            break;
        }
    }

    let os = "Unknown OS";
    const ipad = /iPad/.test(ua) || (/Macintosh/.test(ua) && touch);
    if (/iPhone/.test(ua)) {
        const v = ua.match(/iPhone OS ([\d_]+)/)?.[1]?.replace(/_/g, ".") ?? "";
        os = `iOS ${v} (iPhone)`;
    } else if (ipad) {
        const v =
            ua.match(/CPU OS ([\d_]+)/)?.[1]?.replace(/_/g, ".") ??
            ua.match(/Version\/([\d.]+)/)?.[1] ??
            "";
        os = `iPadOS ${v}`;
    } else if (/Android/.test(ua)) {
        const v = ua.match(/Android ([\d.]+)/)?.[1] ?? "";
        const model =
            ua.match(/Android [\d.]+;\s*([^)]+)\)/)?.[1]?.trim() ?? "";
        os = `Android ${v}${model ? ` · ${model}` : ""}`;
    } else if (/Windows NT 10.0/.test(ua)) os = "Windows 10/11";
    else if (/Windows NT/.test(ua)) os = "Windows (older)";
    else if (/Mac OS X/.test(ua)) {
        const v = ua.match(/Mac OS X ([\d_]+)/)?.[1]?.replace(/_/g, ".") ?? "";
        os = `macOS ${v}`;
    } else if (/CrOS/.test(ua)) os = "ChromeOS";
    else if (/Linux/.test(ua)) os = "Linux";

    const mobile = /Mobi|Android|iPhone|iPod/i.test(ua);
    const device = ipad ? "Tablet" : mobile ? "Mobile" : "Desktop";

    return { browser: browser.trim(), os: os.trim(), device };
}
