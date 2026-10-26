"use client";

import {
    type MouseEvent,
    type ReactNode,
    useEffect,
    useLayoutEffect,
    useId,
    useMemo,
    useRef,
    useState,
    useSyncExternalStore,
} from "react";

import {
    type CartPole,
    DEG,
    MAX_DELAY_MS,
    MODEL,
    SCENARIO_MS,
    runScenario,
} from "@/lib/cartpole";
import { onFrame } from "@/lib/frameLoop";

import {
    applyMech,
    applyScope,
    bobScreenX,
    type MechGeom,
    mechFrame,
    mechGeom,
    mechNodes,
    SCOPE_H,
    type ScopeGeom,
    scopeFrame,
    scopeGeom,
    scopeNodes,
} from "./cartpolePaint";
import styles from "./ControlToy.module.css";
import { Crosses, VRule } from "./Grid";
import { LatencyKnob } from "./LatencyKnob";

const INITIAL_DELAY_MS = 30;
const CATCH_TILT = 0.5 * DEG;

const RM = "(prefers-reduced-motion: reduce)";
function subscribeRM(cb: () => void) {
    const mq = window.matchMedia(RM);
    mq.addEventListener("change", cb);
    return () => mq.removeEventListener("change", cb);
}
const getRM = () => window.matchMedia(RM).matches;
const getRMServer = () => false;

type Props = {
    deadlineMs: number; // from findDeadline(), run at build time
    // Typeset by the server (Tex), so KaTeX never ships to the browser
    math: { d: ReactNode; theta: ReactNode };
    details: ReactNode;
};

export function ControlToy({ deadlineMs, math, details }: Props) {
    const reduced = useSyncExternalStore(subscribeRM, getRM, getRMServer);
    const [delay, setDelay] = useState(INITIAL_DELAY_MS);
    const [liveFall, setLiveFall] = useState<number | null>(null);
    const [size, setSize] = useState({ w: 640, h: 320, sw: 640 });
    const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");

    const stageRef = useRef<HTMLDivElement>(null);
    const scopeBoxRef = useRef<HTMLDivElement>(null);
    const mechRef = useRef<SVGSVGElement>(null);
    const scopeRef = useRef<SVGSVGElement>(null);
    const simRef = useRef<CartPole | null>(null);
    const wakeRef = useRef<(() => void) | null>(null);
    const geomRef = useRef<{ mg: MechGeom; sg: ScopeGeom } | null>(null);

    // The still frame. Live, it is the 8 s warm-up the loop continues from,
    // so the static HTML and the first live frame agree. Under reduced
    // motion it is recomputed for each setting of the knob.
    const scenarioDelay = reduced ? delay : INITIAL_DELAY_MS;
    const shown = useMemo(() => runScenario(scenarioDelay), [scenarioDelay]);
    const mg = useMemo(() => mechGeom(size.w, size.h), [size.w, size.h]);
    const sg = useMemo(() => scopeGeom(size.sw), [size.sw]);
    const f0 = mechFrame(shown, mg);
    const sc0 = scopeFrame(shown, sg);

    const fall = reduced
        ? shown.fallen
            ? shown.fellWithDelay
            : null
        : liveFall;
    const late = delay > deadlineMs;

    // Draw at the real CSS size, so 1 unit is 1px and text stays 10–11px
    useEffect(() => {
        const stage = stageRef.current;
        const box = scopeBoxRef.current;
        if (!stage || !box) return;
        const ro = new ResizeObserver(() => {
            const w = Math.round(stage.clientWidth);
            const h = Math.round(stage.clientHeight);
            const sw = Math.round(box.clientWidth);
            if (!w || !h || !sw) return;
            setSize((p) =>
                p.w === w && p.h === h && p.sw === sw ? p : { w, h, sw },
            );
        });
        ro.observe(stage);
        ro.observe(box);
        return () => ro.disconnect();
    }, []);

    useEffect(() => {
        geomRef.current = { mg, sg };
    });

    // Fixed 1 ms physics steps against real time, then one paint, capped
    // near 60 fps, on the page's shared frame loop. It sleeps off-screen,
    // in a hidden tab, and once a fallen pole has come to rest.
    useEffect(() => {
        if (reduced) return;
        const stage = stageRef.current;
        const box = scopeBoxRef.current;
        const mech = mechRef.current;
        const scope = scopeRef.current;
        if (!stage || !box || !mech || !scope) return;
        if (!simRef.current) simRef.current = runScenario(INITIAL_DELAY_MS);
        const sim = simRef.current;
        const mn = mechNodes(mech);
        const sn = scopeNodes(scope);

        let stop: (() => void) | null = null;
        let last = -1;
        let acc = 0;
        let lastPaint = -1e9;
        let lastText = -1e9;
        let frame = 0;
        let visible = false;
        let fallen = sim.fallen;

        const paint = (now: number, all: boolean) => {
            const g = geomRef.current;
            if (!g) return;
            const text = all || now - lastText >= 100;
            if (text) lastText = now;
            applyMech(mn, mechFrame(sim, g.mg), text);
            if (all || (frame++ & 1) === 0)
                applyScope(sn, scopeFrame(sim, g.sg));
        };

        const sleep = () => {
            stop?.();
            stop = null;
        };

        const tick = (now: number) => {
            // 120 Hz screens get every other frame
            if (now - lastPaint < 15) return;
            const dt = last < 0 ? 0 : Math.min(now - last, 50);
            last = now;
            lastPaint = now;
            acc += dt;
            const n = Math.floor(acc / MODEL.stepMs);
            acc -= n * MODEL.stepMs;
            for (let i = 0; i < n; i++) sim.step();
            paint(now, false);
            if (sim.fallen !== fallen) {
                fallen = sim.fallen;
                setLiveFall(fallen ? sim.fellWithDelay : null);
            }
            if (sim.settled) {
                paint(now, true);
                sleep();
            }
        };

        const wake = () => {
            if (stop || !visible || document.hidden) return;
            last = -1;
            stop = onFrame(tick);
        };

        // Runs while the drawing or its trace is on screen
        const onScreen = new Set<Element>();
        const io = new IntersectionObserver((entries) => {
            for (const e of entries) {
                if (e.isIntersecting) onScreen.add(e.target);
                else onScreen.delete(e.target);
            }
            visible = onScreen.size > 0;
            if (visible) wake();
            else sleep();
        });
        io.observe(stage);
        io.observe(box);
        const onVisibility = () => (document.hidden ? sleep() : wake());
        document.addEventListener("visibilitychange", onVisibility);
        wakeRef.current = wake;

        return () => {
            sleep();
            io.disconnect();
            document.removeEventListener("visibilitychange", onVisibility);
            wakeRef.current = null;
        };
    }, [reduced]);

    // Also when the live loop starts, so a simulation created after the
    // knob has moved runs at the knob's delay
    useEffect(() => {
        if (simRef.current) simRef.current.delay = delay;
    }, [delay, reduced]);

    // A React render re-applies the first-frame attributes only when they
    // change (a resize). Put the live pose back before the browser paints.
    useLayoutEffect(() => {
        if (reduced) return;
        const sim = simRef.current;
        const mech = mechRef.current;
        const scope = scopeRef.current;
        if (!sim || !mech || !scope) return;
        applyMech(mechNodes(mech), mechFrame(sim, mg), true);
        applyScope(scopeNodes(scope), scopeFrame(sim, sg));
    });

    function nudge(dir: 1 | -1) {
        const sim = simRef.current;
        if (reduced || !sim || sim.fallen) return;
        sim.nudge(dir);
        wakeRef.current?.();
    }

    function catchIt() {
        const sim = simRef.current;
        if (reduced || !sim) return;
        sim.reset(CATCH_TILT);
        setLiveFall(null);
        wakeRef.current?.();
    }

    // Tap either side of the pole to push it the other way
    function onStageClick(e: MouseEvent<HTMLDivElement>) {
        if ((e.target as Element).closest("[data-overlay]")) return;
        const sim = simRef.current;
        const g = geomRef.current?.mg;
        if (reduced || !sim || !g || sim.fallen) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const bobX = rect.left + (bobScreenX(sim, g) * rect.width) / g.w;
        nudge(e.clientX < bobX ? 1 : -1);
    }

    const g = mg;
    const viewKey = reduced ? "still" : "live";
    const hatchId = `${uid}-hatch`;
    const clipId = `${uid}-clip`;
    const traceId = `${uid}-trace`;
    const capId = `${uid}-cap`;
    const secTicks: number[] = [];
    for (let k = 0; k <= SCENARIO_MS / 1000; k++) secTicks.push(k);
    const yOf = (deg: number) => sg.mid - deg * sg.degPx;

    return (
        <figure className={styles.fig} aria-labelledby={capId}>
            <div className={styles.meta}>
                <Crosses />
                <VRule />
                <span className={styles.metaFig}>
                    Fig. 3<span>Cart-pole, {reduced ? "still" : "live"}</span>
                </span>
                <dl className={styles.readouts}>
                    <div>
                        <dt>Loop</dt>
                        <dd>1 kHz</dd>
                    </div>
                    <div>
                        <dt>{math.d}</dt>
                        <dd data-late={late}>{delay} ms</dd>
                    </div>
                    <div>
                        <dt>Deadline</dt>
                        <dd>{deadlineMs} ms</dd>
                    </div>
                    <div>
                        <dt className={styles.srOnly}>Deadline status</dt>
                        <dd className={styles.status} data-late={late}>
                            {late ? "Missed" : "Met"}
                        </dd>
                    </div>
                </dl>
                <span className={styles.tag}>Simulated</span>
            </div>

            <div className={styles.stageRow}>
                <Crosses />
                <VRule />
                <div
                    ref={stageRef}
                    className={styles.stage}
                    data-reduced={reduced}
                    onClick={onStageClick}
                >
                    <svg
                        key={viewKey}
                        ref={mechRef}
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
                        <path
                            className={styles.floor}
                            d={`M12 ${g.railY}H${g.w - 12}`}
                        />

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

                            <path
                                data-k="vref"
                                className={styles.vref}
                                d={f0.vref}
                            />
                            <path
                                data-k="arc"
                                className={styles.dim}
                                d={f0.arc}
                            />
                            <path
                                data-k="xdim"
                                className={styles.dim}
                                d={f0.xdim}
                            />

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
                                <path
                                    className={styles.rod}
                                    d={`M0 0V${-(g.L - g.br)}`}
                                />
                                <circle
                                    className={styles.bob}
                                    cx="0"
                                    cy={-g.L}
                                    r={g.br}
                                />
                                <circle
                                    className={styles.pivot}
                                    cx="0"
                                    cy="0"
                                    r="3.5"
                                />
                            </g>

                            <path
                                data-k="force"
                                className={styles.force}
                                d={f0.force}
                            />
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

                    {fall === null ? (
                        <div className={styles.legend} aria-hidden="true">
                            <span>
                                <i className={styles.keySolid} />
                                pole
                            </span>
                            <span>
                                <i className={styles.keyDashed} />
                                what the controller sees, {delay} ms old
                            </span>
                        </div>
                    ) : (
                        <div className={styles.fallen} data-overlay="">
                            <p className={styles.fallenTitle}>
                                {fall > deadlineMs
                                    ? "Late answer. Wrong answer."
                                    : "Knocked over."}
                            </p>
                            <p className={styles.fallenNote}>
                                {fall > deadlineMs
                                    ? `The controller acted on a state ${fall} ms old. The deadline is ${deadlineMs} ms.`
                                    : `On time (${fall} ms against a ${deadlineMs} ms deadline), but pushed further than ±${MODEL.forceLimit} N can recover.`}
                            </p>
                            {reduced ? (
                                <p className={styles.fallenNote}>
                                    Set the latency at or under {deadlineMs} ms
                                    to see it hold.
                                </p>
                            ) : (
                                <button
                                    type="button"
                                    className={styles.catch}
                                    onClick={catchIt}
                                >
                                    Catch it
                                </button>
                            )}
                        </div>
                    )}
                    <p className={styles.srOnly} aria-live="polite">
                        {fall === null
                            ? ""
                            : fall > deadlineMs
                              ? `The pole fell at ${fall} ms latency. Late answer. Wrong answer.`
                              : `The pole was knocked over at ${fall} ms latency.`}
                    </p>
                </div>

                <div className={styles.controls}>
                    {reduced ? (
                        <p className={styles.note}>
                            Reduced motion: each setting runs{" "}
                            {SCENARIO_MS / 1000} s of simulation, with nudges at
                            0.5 s and 4.5 s, and shows where it ends up.
                        </p>
                    ) : (
                        <>
                            <div className={styles.buttons}>
                                <button
                                    type="button"
                                    className={styles.tool}
                                    onClick={() => nudge(-1)}
                                    aria-label="Nudge the pole left"
                                >
                                    <span aria-hidden="true">←</span> Nudge
                                </button>
                                <button
                                    type="button"
                                    className={styles.tool}
                                    onClick={() => nudge(1)}
                                    aria-label="Nudge the pole right"
                                >
                                    Nudge <span aria-hidden="true">→</span>
                                </button>
                                <button
                                    type="button"
                                    className={styles.tool}
                                    onClick={catchIt}
                                >
                                    Reset
                                </button>
                            </div>
                            <span className={styles.note}>
                                or tap the drawing
                            </span>
                        </>
                    )}
                </div>
            </div>

            <LatencyKnob
                id={`${uid}-d`}
                value={delay}
                max={MAX_DELAY_MS}
                deadline={deadlineMs}
                symbol={math.d}
                onChange={setDelay}
            />

            <div className={styles.scopeRow}>
                <Crosses />
                <VRule />
                <div className={styles.scopeHead}>
                    <span>
                        <b>Fig. 4</b>Pole angle {math.theta},{" "}
                        {reduced ? "first" : "last"} {SCENARIO_MS / 1000} s
                    </span>
                    <span className={styles.scopeKey} aria-hidden="true">
                        <span>
                            <i className={styles.keySolid} />
                            {math.theta}
                        </span>
                        <span>
                            <i className={styles.keyDashed} />
                            as the controller sees it
                        </span>
                        <span>
                            <i className={styles.keyMark} />
                            nudge
                        </span>
                    </span>
                </div>
                <div ref={scopeBoxRef} className={styles.scopeBox}>
                    <svg
                        key={viewKey}
                        ref={scopeRef}
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
                                {d > 0 ? `+${d}°` : d < 0 ? `−${-d}°` : "0°"}
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
                                textAnchor={
                                    i === 0
                                        ? "start"
                                        : i === 1
                                          ? "middle"
                                          : "end"
                                }
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
                            <use
                                href={`#${traceId}`}
                                className={styles.trace}
                            />
                            <path
                                data-k="fall"
                                className={styles.fallMark}
                                d={sc0.fall}
                            />
                        </g>
                        <path
                            data-k="marks"
                            className={styles.marks}
                            d={sc0.marks}
                        />
                    </svg>
                </div>
            </div>

            <figcaption className={styles.caption}>
                <Crosses />
                <VRule />
                <p className={styles.capLabel}>Model</p>
                <div className={styles.capBody}>
                    <p id={capId} className={styles.capText}>
                        <b>Fig. 3</b>A cart-pole under state feedback, read{" "}
                        {math.d} ms late.{" "}
                        <span className={styles.tag}>Simulated</span>
                    </p>
                    {details}
                </div>
            </figcaption>
        </figure>
    );
}
