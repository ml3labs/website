import type { Ref } from "react";

import { MODEL, SCENARIO_MS } from "@/lib/cartpole";

import {
    type MechFrame,
    type MechGeom,
    SCOPE_H,
    type ScopeFrame,
    type ScopeGeom,
    signed,
} from "./cartpolePaint";
import styles from "./ControlToy.module.css";

// The cart-pole figure's two drawings, as their first frame. ControlToy
// animates them afterwards through the nodes marked data-k, which
// mechNodes() and scopeNodes() in cartpolePaint.ts look up by those names:
// rename one here and rename it there.

export function Mechanism({
    ref,
    g,
    f0,
    hatchId,
}: {
    ref: Ref<SVGSVGElement>;
    g: MechGeom;
    f0: MechFrame;
    hatchId: string;
}) {
    return (
        <svg
            ref={ref}
            className={styles.mech}
            viewBox={`0 0 ${g.w} ${g.h}`}
            data-state={f0.state}
            role="img"
            aria-label="Line drawing of the simulated cart and pole"
        >
            <defs>
                <pattern
                    id={hatchId}
                    width="5"
                    height="5"
                    patternUnits="userSpaceOnUse"
                    patternTransform="rotate(45)"
                >
                    <line
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="5"
                        className={styles.hatchLine}
                    />
                </pattern>
            </defs>

            {/* The floor runs on past both ends, so it stays put
                        while the rest pans */}
            <path className={styles.floor} d={`M12 ${g.railY}H${g.w - 12}`} />

            <g data-k="view" transform={f0.view}>
                {/* Track and end stops */}
                <rect
                    x={g.cx - g.trackEnd - g.stopW - 10}
                    y={g.railY + 0.5}
                    width={2 * (g.trackEnd + g.stopW + 10)}
                    height={8}
                    fill={`url(#${hatchId})`}
                />
                <path
                    className={styles.track}
                    d={`M${g.cx - g.trackEnd} ${g.railY - 1}H${g.cx + g.trackEnd}`}
                />
                <rect
                    className={styles.stop}
                    x={g.cx - g.trackEnd - g.stopW}
                    y={g.railY - g.stopH}
                    width={g.stopW}
                    height={g.stopH}
                />
                <rect
                    className={styles.stop}
                    x={g.cx + g.trackEnd}
                    y={g.railY - g.stopH}
                    width={g.stopW}
                    height={g.stopH}
                />
                <path
                    className={styles.centerline}
                    d={`M${g.cx} ${g.railY + 30}V${g.pivotY - g.L - 24}`}
                />

                {/* What the controller sees: the state d ms ago */}
                <g data-k="ghost" visibility={f0.ghost}>
                    <g data-k="gcart" transform={f0.gcart}>
                        <rect
                            className={styles.ghostShape}
                            x={g.cx - g.cw / 2}
                            y={g.pivotY}
                            width={g.cw}
                            height={g.ch}
                        />
                    </g>
                    <g data-k="gpole" transform={f0.gpole}>
                        <path
                            className={styles.ghostShape}
                            d={`M0 0V${-(g.L - g.br)}`}
                        />
                        <circle
                            className={styles.ghostShape}
                            cx="0"
                            cy={-g.L}
                            r={g.br}
                        />
                    </g>
                </g>

                <path data-k="vref" className={styles.vref} d={f0.vref} />
                <path data-k="arc" className={styles.dim} d={f0.arc} />
                <path data-k="xdim" className={styles.dim} d={f0.xdim} />

                <g data-k="cart" transform={f0.cart}>
                    {[-1, 1].map((side) => (
                        <g key={side}>
                            <circle
                                className={styles.wheel}
                                cx={g.cx + side * g.cw * 0.3}
                                cy={g.railY - 2 - g.wr}
                                r={g.wr}
                            />
                            <circle
                                className={styles.hub}
                                cx={g.cx + side * g.cw * 0.3}
                                cy={g.railY - 2 - g.wr}
                                r={1.5}
                            />
                        </g>
                    ))}
                    <rect
                        className={styles.cartBody}
                        x={g.cx - g.cw / 2}
                        y={g.pivotY}
                        width={g.cw}
                        height={g.ch}
                    />
                    {g.showMass && (
                        <text
                            className={styles.mass}
                            x={g.cx}
                            y={g.pivotY + g.ch / 2 + 3.5}
                            textAnchor="middle"
                        >
                            {MODEL.cartMass.toFixed(1)} kg
                        </text>
                    )}
                </g>

                <g data-k="pole" transform={f0.pole}>
                    <path className={styles.rod} d={`M0 0V${-(g.L - g.br)}`} />
                    <circle className={styles.bob} cx="0" cy={-g.L} r={g.br} />
                    <circle className={styles.pivot} cx="0" cy="0" r="3.5" />
                </g>

                <path data-k="force" className={styles.force} d={f0.force} />
                <text
                    data-k="th"
                    className={styles.value}
                    x={f0.th.x}
                    y={f0.th.y}
                    textAnchor={f0.th.anchor}
                >
                    {f0.th.text}
                </text>
                <text
                    data-k="u"
                    className={styles.value}
                    x={f0.u.x}
                    y={f0.u.y}
                    textAnchor={f0.u.anchor}
                >
                    {f0.u.text || " "}
                </text>
                <text
                    data-k="x"
                    className={styles.value}
                    x={f0.x.x}
                    y={f0.x.y}
                    textAnchor={f0.x.anchor}
                >
                    {f0.x.text}
                </text>
                <g
                    data-k="nudge"
                    transform={f0.nudge}
                    opacity={f0.nudgeOpacity}
                >
                    <path
                        className={styles.force}
                        d={`M${-(g.br + 30)} 0H${-(g.br + 5)}M${-(g.br + 5)} 0l-6 -3.5M${-(g.br + 5)} 0l-6 3.5`}
                    />
                </g>
            </g>
        </svg>
    );
}

export function Scope({
    ref,
    sg,
    sc0,
    reduced,
    clipId,
    traceId,
}: {
    ref: Ref<SVGSVGElement>;
    sg: ScopeGeom;
    sc0: ScopeFrame;
    reduced: boolean;
    clipId: string;
    traceId: string;
}) {
    const secTicks: number[] = [];
    for (let k = 0; k <= SCENARIO_MS / 1000; k++) secTicks.push(k);
    const yOf = (deg: number) => sg.mid - deg * sg.degPx;

    return (
        <svg
            ref={ref}
            className={styles.scope}
            viewBox={`0 0 ${sg.w} ${SCOPE_H}`}
            role="img"
            aria-label={`Trace of the pole angle over ${
                reduced ? "the first" : "the last"
            } ${SCENARIO_MS / 1000} seconds`}
        >
            <defs>
                <clipPath id={clipId}>
                    <rect
                        x={sg.left}
                        y={sg.top}
                        width={sg.right - sg.left}
                        height={sg.bottom - sg.top}
                    />
                </clipPath>
                <polyline
                    id={traceId}
                    data-k="trace"
                    points={sc0.points}
                    fill="none"
                />
            </defs>
            {[-20, -10, 10, 20].map((d) => (
                <path
                    key={d}
                    className={styles.grid}
                    d={`M${sg.left} ${yOf(d)}H${sg.right}`}
                />
            ))}
            <path
                className={styles.zero}
                d={`M${sg.left} ${sg.mid}H${sg.right}`}
            />
            {[20, 0, -20].map((d) => (
                <text
                    key={d}
                    className={styles.axis}
                    x={sg.left - 6}
                    y={yOf(d) + 3.5}
                    textAnchor="end"
                >
                    {signed(d, 0, "°")}
                </text>
            ))}
            {secTicks.map((k) => (
                <path
                    key={k}
                    className={styles.zero}
                    d={`M${sg.right - k * 1000 * sg.msPx} ${sg.bottom}v4`}
                />
            ))}
            {(reduced
                ? (["0 s", "4 s", "8 s"] as const)
                : (["−8 s", "−4 s", "now"] as const)
            ).map((t, i) => (
                <text
                    key={t}
                    className={styles.axis}
                    x={sg.left + (i * (sg.right - sg.left)) / 2}
                    y={sg.bottom + 15}
                    textAnchor={i === 0 ? "start" : i === 1 ? "middle" : "end"}
                >
                    {t}
                </text>
            ))}
            <rect
                className={styles.plotFrame}
                x={sg.left}
                y={sg.top}
                width={sg.right - sg.left}
                height={sg.bottom - sg.top}
            />
            <g clipPath={`url(#${clipId})`}>
                <use
                    href={`#${traceId}`}
                    data-k="ghostTrace"
                    className={styles.traceGhost}
                    transform={sc0.ghost}
                />
                <use href={`#${traceId}`} className={styles.trace} />
                <path data-k="fall" className={styles.fallMark} d={sc0.fall} />
            </g>
            <path data-k="marks" className={styles.marks} d={sc0.marks} />
        </svg>
    );
}
