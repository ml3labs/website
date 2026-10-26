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
import { prefersReducedMotion, subscribeReducedMotion } from "@/lib/motion";

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
import { Mechanism, Scope } from "./CartPoleDrawings";
import { Crosses, VRule } from "./Grid";
import { LatencyKnob } from "./LatencyKnob";

const INITIAL_DELAY_MS = 30;
const CATCH_TILT = 0.5 * DEG;

type Props = {
    deadlineMs: number; // from findDeadline(), run at build time
    // Typeset by the server (Tex), so KaTeX never ships to the browser
    math: { d: ReactNode; theta: ReactNode };
    details: ReactNode;
};

export function ControlToy({ deadlineMs, math, details }: Props) {
    const reduced = useSyncExternalStore(
        subscribeReducedMotion,
        prefersReducedMotion,
        () => false,
    );
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
    const f0 = useMemo(() => mechFrame(shown, mg), [shown, mg]);
    const sc0 = useMemo(() => scopeFrame(shown, sg), [shown, sg]);

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
        // Live, the still frame is the 8 s warm-up: carry on from a copy
        if (!simRef.current) simRef.current = shown.clone();
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
    }, [reduced, shown]);

    // Also when the live loop starts, so a simulation created after the
    // knob has moved runs at the knob's delay
    useEffect(() => {
        if (simRef.current) simRef.current.delay = delay;
    }, [delay, reduced]);

    // A React render re-applies the first-frame attributes only when they
    // change: a resize, or the drawings remounting. Put the live pose back
    // before the browser paints.
    useLayoutEffect(() => {
        if (reduced) return;
        const sim = simRef.current;
        const mech = mechRef.current;
        const scope = scopeRef.current;
        if (!sim || !mech || !scope) return;
        applyMech(mechNodes(mech), mechFrame(sim, mg), true);
        applyScope(scopeNodes(scope), scopeFrame(sim, sg));
    }, [reduced, mg, sg]);

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
        if (reduced || !sim || sim.fallen) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const bobX = rect.left + (bobScreenX(sim, mg) * rect.width) / mg.w;
        nudge(e.clientX < bobX ? 1 : -1);
    }

    const g = mg;
    const viewKey = reduced ? "still" : "live";
    const hatchId = `${uid}-hatch`;
    const clipId = `${uid}-clip`;
    const traceId = `${uid}-trace`;
    const capId = `${uid}-cap`;

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
                    <Mechanism
                        key={viewKey}
                        ref={mechRef}
                        g={g}
                        f0={f0}
                        hatchId={hatchId}
                    />

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
                <div
                    ref={scopeBoxRef}
                    className={styles.scopeBox}
                    style={{ height: SCOPE_H }}
                >
                    <Scope
                        key={viewKey}
                        ref={scopeRef}
                        sg={sg}
                        sc0={sc0}
                        reduced={reduced}
                        clipId={clipId}
                        traceId={traceId}
                    />
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
