import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import {
    MARK_BAR_1,
    MARK_BAR_2,
    MARK_BAR_3,
    MARK_THREE,
    MARK_VIEWBOX,
} from "@/components/markData";

import { OG_IMAGE } from "../shared-metadata";

// The link preview (Discord, X, iMessage, Slack, LinkedIn), rendered once at
// build time at 1200x630, the 1.91:1 that LinkedIn and X crop previews to.
//
// A route handler rather than the opengraph-image convention: that one
// exports an extensionless file, which GitHub Pages serves as
// application/octet-stream, and crawlers want an image type. This exports
// out/og.png. The meta tags point at it from shared-metadata.ts.

export const dynamic = "force-static";

const BG = "#f9f7f3";
const INK = "#11151b";
const ACCENT = "#8b2145";

const font = (file: string) =>
    readFile(join(process.cwd(), "assets/fonts", file));

export async function GET() {
    const [medium, semibold, mono] = await Promise.all([
        font("InterTight-Medium.ttf"),
        font("InterTight-SemiBold.ttf"),
        font("IBMPlexMono-Medium.ttf"),
    ]);

    return new ImageResponse(
        <div
            style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                width: "100%",
                height: "100%",
                background: BG,
                color: INK,
                fontFamily: "Inter Tight",
            }}
        >
            {/* Three bands in the corner at the mark's own angle */}
            <svg
                width="1200"
                height="630"
                viewBox="0 0 1200 630"
                style={{ position: "absolute", top: 0, left: 0 }}
            >
                <polygon
                    points="1010,630 1200,345 1200,410 1053,630"
                    fill={ACCENT}
                    fillOpacity="0.14"
                />
                <polygon
                    points="1078,630 1200,447 1200,512 1121,630"
                    fill={ACCENT}
                    fillOpacity="0.1"
                />
                <polygon
                    points="1146,630 1200,549 1200,614 1189,630"
                    fill={ACCENT}
                    fillOpacity="0.07"
                />
            </svg>

            <div
                style={{
                    position: "absolute",
                    left: 96,
                    top: 150,
                    width: 4,
                    height: 330,
                    background: ACCENT,
                }}
            />

            <svg
                width="300"
                height="216"
                viewBox={MARK_VIEWBOX}
                style={{ marginLeft: 160 }}
            >
                <path d={MARK_BAR_1} fill={INK} />
                <path d={MARK_BAR_2} fill={INK} />
                <path d={MARK_BAR_3} fill={INK} />
                <path d={MARK_THREE} fill={ACCENT} />
            </svg>

            <div
                style={{
                    width: 1,
                    height: 250,
                    marginLeft: 52,
                    background: "rgba(17, 21, 27, 0.16)",
                }}
            />

            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    marginLeft: 52,
                }}
            >
                <div
                    style={{
                        fontSize: 84,
                        fontWeight: 600,
                        letterSpacing: "-0.02em",
                        lineHeight: 1,
                    }}
                >
                    McMaster
                </div>
                <div
                    style={{
                        marginTop: 14,
                        fontSize: 44,
                        fontWeight: 500,
                        letterSpacing: "0.06em",
                        lineHeight: 1,
                    }}
                >
                    LOW LATENCY LABS
                </div>
                <div
                    style={{
                        width: 52,
                        height: 3,
                        marginTop: 34,
                        background: ACCENT,
                    }}
                />
                <div
                    style={{
                        marginTop: 26,
                        fontFamily: "IBM Plex Mono",
                        fontSize: 22,
                        fontWeight: 500,
                        color: "rgba(17, 21, 27, 0.66)",
                    }}
                >
                    A deadline is a correctness condition.
                </div>
            </div>
        </div>,
        {
            width: OG_IMAGE.width,
            height: OG_IMAGE.height,
            fonts: [
                { name: "Inter Tight", data: medium, weight: 500 },
                // The file is the 650 cut, the weight the site sets the name in;
                // Satori only takes the standard steps, so it is filed under 600
                { name: "Inter Tight", data: semibold, weight: 600 },
                { name: "IBM Plex Mono", data: mono, weight: 500 },
            ],
        },
    );
}
