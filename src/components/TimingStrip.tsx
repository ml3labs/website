"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

import { onFrame } from "@/lib/frameLoop";
import { BOOT_END_MS, BOOT_TICK_MS, prefersReducedMotion } from "@/lib/motion";

import { Crosses, VRule } from "./Grid";
import styles from "./TimingStrip.module.css";

// A WaveDrom-style divider: CLK, REQ, ACK and DEADLINE, hand-drawn in SVG
// at the strip's real pixel width, so strokes and type never scale. The
// clock period is chosen so a whole number of cycles ends exactly on the
// page's deadline x. When the strip scrolls into view it is clocked in
// left to right, one half-cycle per step.
//
//   met    ACK resolves with slack before the deadline
//   late   the same handshake, ACK half a cycle past it
//   empty  no request yet, so ACK stays undefined (x) throughout
//   lost   REQ goes up and stays up; nothing ever answers

export type Variant = "met" | "late" | "empty" | "lost";

type Level = 0 | 1 | "x";
type Seg = [cycle: number, level: Level];

type Geo = {
    W: number;
    H: number;
    D: number;
    x0: number;
    p: number; // clock period, px
    d: number; // cycles from x0 to the deadline
    pad: number;
    top: number;
    rowH: number;
    slant: number;
};

const WIDE = "(min-width: 900px)";
const NAMES = ["CLK", "REQ", "ACK", "DEADLINE"];

function measure(area: HTMLElement, probes: HTMLElement): Geo {
    const wide = window.matchMedia(WIDE).matches;
    const box = area.getBoundingClientRect();
    // The probes sit at x positions CSS owns: the deadline, where the
    // waveforms start, and the side padding the row names sit in
    const [D, x0, pad] = Array.from(
        probes.children,
        (p) => p.getBoundingClientRect().left - box.left,
    );
    const d = Math.max(7, Math.round((D - x0) / (wide ? 64 : 34)));
    return {
        W: box.width,
        H: box.height,
        D,
        x0,
        d,
        p: (D - x0) / d,
        pad,
        top: wide ? 24 : 18,
        rowH: wide ? 36 : 32,
        slant: wide ? 3 : 2,
    };
}

const f = (n: number) => Math.round(n * 10) / 10;

// The two contours of a signal: upper and lower. For 0 and 1 they coincide;
// for x they split to hi and lo and the gap between them is hatched.
function signal(segs: Seg[], g: Geo, hi: number, lo: number) {
    const X = (c: number) => g.x0 + c * g.p;
    const up = (v: Level) => (v === 0 ? lo : hi);
    const dn = (v: Level) => (v === 1 ? hi : lo);
    const [c0, v0] = segs[0];
    let a = `M${f(X(c0))} ${up(v0)}`;
    let b = `M${f(X(c0))} ${dn(v0)}`;
    let end = g.W + 4;
    for (const [c, v] of segs.slice(1)) {
        const x = X(c);
        a += `H${f(x)}L${f(x + g.slant)} ${up(v)}`;
        b += `H${f(x)}L${f(x + g.slant)} ${dn(v)}`;
        end = Math.max(end, x + g.slant);
    }
    // Run on past the right edge (the svg clips it), never back left
    a += `H${f(end)}`;
    b += `H${f(end)}`;

    const fills: string[] = [];
    segs.forEach(([c, v], i) => {
        if (v !== "x") return;
        const prev = segs[i - 1]?.[1];
        const next = segs[i + 1];
        const xa = X(c);
        const xb = next ? X(next[0]) : g.W + 8;
        const nu = next ? up(next[1]) : hi;
        const nl = next ? dn(next[1]) : lo;
        const sl = g.slant;
        const head =
            prev === undefined
                ? `M${f(xa)} ${lo}L${f(xa)} ${hi}`
                : `M${f(xa)} ${dn(prev)}L${f(xa)} ${up(prev)}L${f(xa + sl)} ${hi}`;
        fills.push(
            `${head}L${f(xb)} ${hi}L${f(xb + sl)} ${nu}L${f(xb + sl)} ${nl}L${f(xb)} ${lo}L${f(xa + sl)} ${lo}Z`,
        );
    });
    return { line: `${a}${b}`, fills };
}

function draw(g: Geo, variant: Variant) {
    const X = (c: number) => g.x0 + c * g.p;
    const rows = NAMES.map((name, i) => {
        const t = g.top + i * g.rowH;
        const hi = t + 6;
        const lo = t + g.rowH - 12;
        return { name, hi, lo, mid: (hi + lo) / 2 };
    });

    // Dashed gridline on every rising clock edge
    let grid = "";
    for (let c = 0; X(c) <= g.W; c++) {
        grid += `M${f(X(c)) + 0.5} ${g.top - 10}V${g.H - 8}`;
    }

    const [clk, req, ack, dl] = rows;
    let clock = `M${f(g.x0)} ${clk.lo}`;
    for (let c = 0; X(c) <= g.W; c++) {
        clock += `V${clk.hi}H${f(Math.min(X(c + 0.5), g.W + 2))}`;
        if (X(c + 0.5) > g.W) break;
        clock += `V${clk.lo}H${f(Math.min(X(c + 1), g.W + 2))}`;
    }

    const d = g.d;
    const plan: Record<Variant, { req: Seg[]; ack: Seg[] }> = {
        met: {
            req: [
                [0, 0],
                [d - 6, 1],
                [d - 1, 0],
            ],
            ack: [
                [0, 0],
                [d - 5, "x"],
                [d - 2, 1],
                [d - 1, 0],
            ],
        },
        late: {
            req: [
                [0, 0],
                [d - 5, 1],
                [d + 1.5, 0],
            ],
            ack: [
                [0, 0],
                [d - 4, "x"],
                [d + 0.5, 1],
                [d + 1.5, 0],
            ],
        },
        empty: {
            req: [[0, 0]],
            ack: [[0, "x"]],
        },
        lost: {
            req: [
                [0, 0],
                [d - 6, 1],
            ],
            ack: [[0, "x"]],
        },
    };
    const r = signal(plan[variant].req, g, req.hi, req.lo);
    const a = signal(plan[variant].ack, g, ack.hi, ack.lo);

    // Slack: from the ACK edge to the deadline, between the ACK and
    // DEADLINE rows. It is a property of the drawing, not a measurement.
    let slack: { path: string; x: number; y: number } | null = null;
    if (variant === "met") {
        const xa = X(d - 2);
        const y = ack.lo + (g.rowH - (ack.lo - ack.hi)) / 2;
        const mid = (xa + g.D) / 2;
        const gap = 21;
        slack = {
            path: `M${f(xa)} ${y - 3}V${y + 3}M${f(g.D)} ${y - 3}V${y + 3}M${f(xa)} ${y}H${f(mid - gap)}M${f(mid + gap)} ${y}H${f(g.D)}`,
            x: mid,
            y: y + 3.5,
        };
    }

    return {
        rows,
        grid,
        clock,
        req: r,
        ack: a,
        dlIdle: `M${f(g.x0)} ${dl.lo}H${f(g.D)}`,
        dlLate: `M${f(g.D)} ${dl.lo}V${dl.hi}H${f(g.W + 4)}`,
        slack,
    };
}

export function TimingStrip({
    variant,
    fig,
    caption,
    grow = false,
}: {
    variant: Variant;
    fig: string;
    caption: string;
    grow?: boolean;
}) {
    const area = useRef<HTMLDivElement>(null);
    const probes = useRef<HTMLDivElement>(null);
    const [geo, setGeo] = useState<Geo | null>(null);
    // Half-cycles revealed so far: -1 before the run, Infinity when done
    const [k, setK] = useState(-1);
    const hatch = `strip-hatch-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

    useEffect(() => {
        const el = area.current;
        const probeEl = probes.current;
        if (!el || !probeEl) return;
        const reduce = prefersReducedMotion();

        // Fires once on observe, then on every width change
        const ro = new ResizeObserver(() => setGeo(measure(el, probeEl)));
        ro.observe(el);

        let stop = () => {};
        let wait = 0;
        const run = () => {
            if (reduce || document.hidden) {
                setK(Infinity);
                return;
            }
            const g = measure(el, probeEl);
            const n = Math.ceil((g.W - g.x0) / (g.p / 2));
            const dt = Math.min(60, Math.max(26, 1000 / n));
            let t0 = -1;
            let shown = 0;
            setK(0);
            // Clocked in on the page's shared frame loop, one state update
            // per half-cycle rather than per frame
            stop = onFrame((now) => {
                if (t0 < 0) t0 = now;
                const i = Math.floor((now - t0) / dt);
                if (i > n) {
                    stop();
                    setK(Infinity);
                } else if (i !== shown) {
                    shown = i;
                    setK(i);
                }
            });
        };

        const io = new IntersectionObserver(
            (entries) => {
                if (!entries.some((e) => e.isIntersecting)) return;
                io.disconnect();
                // On first load, let the hero's boot finish first, plus
                // a tick
                wait = window.setTimeout(
                    run,
                    Math.max(0, BOOT_END_MS + BOOT_TICK_MS - performance.now()),
                );
            },
            { rootMargin: "0px 0px -12% 0px" },
        );
        io.observe(el);

        return () => {
            ro.disconnect();
            io.disconnect();
            stop();
            window.clearTimeout(wait);
        };
    }, []);

    const art = useMemo(
        () => (geo ? draw(geo, variant) : null),
        [geo, variant],
    );

    const done = k === Infinity;
    const revealX = geo ? (k < 0 ? -1 : geo.x0 + (k * geo.p) / 2) : -1;
    const clip =
        geo && !done
            ? `inset(0 ${Math.max(0, geo.W - revealX)}px 0 0)`
            : undefined;

    return (
        <figure
            className={grow ? `${styles.strip} ${styles.grow}` : styles.strip}
        >
            <Crosses />
            <VRule />
            <div ref={probes} aria-hidden="true" className={styles.probes}>
                <i />
                <i />
                <i />
            </div>
            <div ref={area} className={styles.area} aria-hidden="true">
                {geo && art && (
                    <>
                        <svg
                            className={styles.svg}
                            width={geo.W}
                            height={geo.H}
                            viewBox={`0 0 ${geo.W} ${geo.H}`}
                        >
                            {art.rows.map((row) => (
                                <text
                                    key={row.name}
                                    className={styles.name}
                                    x={geo.pad}
                                    y={row.mid + 3.5}
                                >
                                    {row.name}
                                </text>
                            ))}
                        </svg>
                        <svg
                            className={styles.svg}
                            width={geo.W}
                            height={geo.H}
                            viewBox={`0 0 ${geo.W} ${geo.H}`}
                            style={{ clipPath: clip }}
                        >
                            <defs>
                                <pattern
                                    id={hatch}
                                    width="5"
                                    height="5"
                                    patternUnits="userSpaceOnUse"
                                    patternTransform="rotate(45)"
                                >
                                    <rect
                                        className={styles.hatchLine}
                                        width="1.1"
                                        height="5"
                                    />
                                </pattern>
                            </defs>
                            <path className={styles.grid} d={art.grid} />
                            {[...art.req.fills, ...art.ack.fills].map((p) => (
                                <path key={p} d={p} fill={`url(#${hatch})`} />
                            ))}
                            <path className={styles.wave} d={art.clock} />
                            <path className={styles.wave} d={art.req.line} />
                            <path className={styles.wave} d={art.ack.line} />
                            <path className={styles.idle} d={art.dlIdle} />
                            <path className={styles.due} d={art.dlLate} />
                            {art.slack && (
                                <>
                                    <path
                                        className={styles.dim}
                                        d={art.slack.path}
                                    />
                                    <text
                                        className={styles.dimText}
                                        x={art.slack.x}
                                        y={art.slack.y}
                                        textAnchor="middle"
                                    >
                                        slack
                                    </text>
                                </>
                            )}
                        </svg>
                    </>
                )}
                {geo && k >= 0 && !done && (
                    <div
                        className={styles.cursor}
                        style={{ transform: `translateX(${revealX}px)` }}
                    />
                )}
            </div>
            <figcaption className={styles.caption}>
                <b>{fig}</b>
                {caption}
            </figcaption>
        </figure>
    );
}
