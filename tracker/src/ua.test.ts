import { expect, test } from "vitest";

import { isBot, parseUA } from "./ua";

const IPAD_AS_MAC =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";

test("an iPad asking for the desktop site is a tablet, a Mac is not", () => {
    expect(parseUA(IPAD_AS_MAC, true)).toEqual({
        browser: "Safari 17.0",
        os: "iPadOS 17.0",
        device: "Tablet",
    });
    expect(parseUA(IPAD_AS_MAC, false).device).toBe("Desktop");
});

test("browsers that also name another are told apart", () => {
    const browser = (ua: string) => parseUA(ua).browser;
    expect(
        browser(
            "Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.6099.119 Mobile/15E148 Safari/604.1",
        ),
    ).toBe("Chrome 120");
    expect(
        browser(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0",
        ),
    ).toBe("Edge 141");
    expect(
        browser(
            "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36 EdgA/141.0.0.0",
        ),
    ).toBe("Edge 141");
});

test("crawlers are bots, phones whose names end in bot are not", () => {
    expect(
        isBot(
            "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        ),
    ).toBe(true);
    expect(
        isBot(
            "Mozilla/5.0 (Linux; Android 11; CUBOT X30) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
        ),
    ).toBe(false);
});
