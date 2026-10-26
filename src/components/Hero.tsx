"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties, PointerEvent } from "react";

import { onFrame } from "@/lib/frameLoop";

import { ButtonLink } from "./Button";
import { Crosses, VRule } from "./Grid";
import styles from "./Hero.module.css";
import {
    MARK_BAR_1,
    MARK_BAR_2,
    MARK_BAR_3,
    MARK_THREE,
    MARK_VIEWBOX,
} from "./markData";
import { href } from "./siteData";

// The boot itself is pure CSS (see "Boot sequence" in Hero.module.css).
// This component only adds two controls on top: Replay, and scrubbing the
// clock by dragging across the mark.

const SWEEP_MS = 480; // four ticks of 120 ms, as in the CSS

// at: when each row flips, t0 (300 ms) + k ticks
const LEGEND = [
    { k: 1, tick: "t1", signal: "bar-1", lo: "low", hi: "high", at: "420ms" },
    { k: 2, tick: "t2", signal: "bar-2", lo: "low", hi: "high", at: "540ms" },
    { k: 3, tick: "t3", signal: "bar-3", lo: "low", hi: "high", at: "660ms" },
    {
        k: 4,
        tick: "t4",
        signal: "³",
        lo: "pending",
        hi: "on deadline",
        at: "780ms",
    },
];

const LAYERS = [
    { k: 1, d: MARK_BAR_1, cls: styles.l1, fill: styles.ink },
    { k: 2, d: MARK_BAR_2, cls: styles.l2, fill: styles.ink },
    { k: 3, d: MARK_BAR_3, cls: styles.l3, fill: styles.ink },
    { k: 4, d: MARK_THREE, cls: styles.l4, fill: styles.accent },
];

// Four clock periods across the mark; the last rising edge is the deadline
const CLK = "M0 13V1H50V13H100V1H150V13H200V1H250V13H300V1H350V13H400V1";

const reducedMotion = () =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function Hero() {
    const root = useRef<HTMLElement>(null);
    const mark = useRef<HTMLDivElement>(null);
    const drag = useRef({ id: -1, x: 0, y: 0, on: false, p: 1 });
    const stopFinish = useRef<(() => void) | null>(null);

    useEffect(() => () => stopFinish.current?.(), []);

    // Put the clock at p (0..1). Ticks still in the future get data-off.
    const setP = (p: number) => {
        const el = root.current;
        if (!el) return;
        drag.current.p = p;
        const tick = p >= 1 ? 4 : Math.floor(p * 4);
        el.style.setProperty("--p", p.toFixed(4));
        el.querySelectorAll<HTMLElement | SVGElement>("[data-k]").forEach((n) =>
            n.toggleAttribute("data-off", Number(n.dataset.k) > tick),
        );
    };

    const toStatic = () => {
        const el = root.current;
        if (!el) return;
        el.classList.remove(styles.scrub);
        el.style.removeProperty("--p");
        el.querySelectorAll("[data-off]").forEach((n) =>
            n.removeAttribute("data-off"),
        );
    };

    const cancelFinish = () => {
        stopFinish.current?.();
        stopFinish.current = null;
    };

    const replay = () => {
        const el = root.current;
        if (!el) return;
        cancelFinish();
        drag.current.on = false;
        toStatic();
        el.classList.remove(styles.boot);
        void el.offsetWidth; // flush, so re-adding the class restarts the CSS
        el.classList.add(styles.boot);
    };

    // After a drag, run the rest of the sweep at boot speed, then hand back
    // to the static final frame. A few frames on the shared loop, not a
    // loop of its own. Reduced motion skips straight to the end.
    const finish = () => {
        cancelFinish();
        if (reducedMotion()) {
            toStatic();
            return;
        }
        const from = drag.current.p;
        let t0 = -1;
        stopFinish.current = onFrame((now) => {
            if (t0 < 0) t0 = now;
            const p = Math.min(1, from + (now - t0) / SWEEP_MS);
            setP(p);
            if (p >= 1) {
                cancelFinish();
                toStatic();
            }
        });
    };

    const pAt = (clientX: number) => {
        const r = mark.current?.getBoundingClientRect();
        if (!r || r.width === 0) return 1;
        const p = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
        return p > 0.97 ? 1 : p; // snap the last few px onto the deadline
    };

    const onDown = (e: PointerEvent<HTMLDivElement>) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        const st = drag.current;
        st.id = e.pointerId;
        st.x = e.clientX;
        st.y = e.clientY;
        st.on = false;
    };

    const onMove = (e: PointerEvent<HTMLDivElement>) => {
        const st = drag.current;
        const el = root.current;
        if (e.pointerId !== st.id || !el) return;
        if (!st.on) {
            // Only a sideways drag scrubs, so a vertical swipe still scrolls
            const dx = Math.abs(e.clientX - st.x);
            const dy = Math.abs(e.clientY - st.y);
            if (dx < 6 || dx < dy) return;
            st.on = true;
            cancelFinish();
            e.currentTarget.setPointerCapture(e.pointerId);
            el.classList.remove(styles.boot);
            el.classList.add(styles.scrub);
        }
        setP(pAt(e.clientX));
    };

    const onUp = (e: PointerEvent<HTMLDivElement>) => {
        const st = drag.current;
        if (e.pointerId !== st.id) return;
        st.id = -1;
        if (st.on) {
            st.on = false;
            finish();
        } else if (e.type === "pointerup") {
            replay(); // a plain click or tap replays the boot
        }
    };

    return (
        <section
            ref={root}
            className={`${styles.hero} ${styles.boot}`}
            aria-labelledby="site-name"
        >
            <div className={styles.cover} aria-hidden="true" />

            <div className={styles.meta}>
                <Crosses />
                <VRule />
                <span className={styles.metaFig}>
                    Fig. 1<span>Boot</span>
                </span>
                <span className={styles.metaCap}>
                    Three rising edges, then the ³ lands on the deadline.
                </span>
                <div className={styles.tools}>
                    <span className={styles.hint}>
                        <svg viewBox="0 0 12 12" aria-hidden="true">
                            <path
                                d="M1 6h10M3.5 3.5 1 6l2.5 2.5M8.5 3.5 11 6 8.5 8.5"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.2"
                            />
                        </svg>
                        Drag<span className={styles.hintMore}> to scrub</span>
                    </span>
                    <button
                        type="button"
                        className={styles.replay}
                        onClick={replay}
                    >
                        <svg viewBox="0 0 12 12" aria-hidden="true">
                            <path
                                d="M2.2 4.2A4.2 4.2 0 1 1 1.8 7.4M2 1.2v3h3"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.2"
                            />
                        </svg>
                        Replay
                    </button>
                </div>
            </div>

            <div className={styles.stage}>
                <Crosses />
                <VRule />

                <div className={styles.legend} aria-hidden="true">
                    <div className={`${styles.lgRow} ${styles.lgHead}`}>
                        <span>Tick</span>
                        <span>Signal</span>
                        <span>State</span>
                    </div>
                    {LEGEND.map((r) => (
                        <div
                            key={r.k}
                            className={styles.lgRow}
                            data-k={r.k}
                            style={{ "--at": r.at } as CSSProperties}
                        >
                            <span>{r.tick}</span>
                            <span
                                className={
                                    r.k === 4 ? styles.lgThree : undefined
                                }
                            >
                                {r.signal}
                            </span>
                            <span className={styles.state}>
                                <span className={styles.lo}>{r.lo}</span>
                                <span className={styles.hi}>{r.hi}</span>
                            </span>
                        </div>
                    ))}
                    <p className={styles.lgNote}>
                        Animation clock, one tick per 120 ms. Drag the handle
                        back to rewind it; click to replay.
                    </p>
                </div>

                <div className={styles.markCol}>
                    {/* The mark and its clock are one drag target, so the
                        handle on the axis can be grabbed as well as the mark */}
                    <div
                        className={styles.scrubber}
                        onPointerDown={onDown}
                        onPointerMove={onMove}
                        onPointerUp={onUp}
                        onPointerCancel={onUp}
                    >
                        <div
                            ref={mark}
                            className={styles.mark}
                            role="img"
                            aria-label="ML³ logo"
                        >
                            {LAYERS.map((l) => (
                                <svg
                                    key={l.k}
                                    className={`${styles.layer} ${l.cls}`}
                                    data-k={l.k}
                                    viewBox={MARK_VIEWBOX}
                                    aria-hidden="true"
                                    focusable="false"
                                >
                                    <path className={l.fill} d={l.d} />
                                </svg>
                            ))}
                        </div>

                        <div className={styles.axis} aria-hidden="true">
                            <span className={styles.axisLabel}>CLK</span>
                            <svg
                                className={styles.clk}
                                viewBox="0 0 400 14"
                                preserveAspectRatio="none"
                            >
                                <path className={styles.clkPath} d={CLK} />
                            </svg>
                            <div className={styles.ticks}>
                                {["t0", "t1", "t2", "t3", "t4"].map((t, i) => (
                                    <span
                                        key={t}
                                        className={
                                            i === 4 ? styles.tickD : undefined
                                        }
                                        style={{ left: `${i * 25}%` }}
                                    >
                                        {t}
                                    </span>
                                ))}
                            </div>
                            <span className={styles.head} />
                        </div>
                    </div>
                </div>
            </div>

            <div className={styles.wordRow}>
                <Crosses />
                <h1 id="site-name" className={styles.wordmark}>
                    McMaster
                    <span className={styles.br3} /> Low
                    <span className={styles.br2} /> Latency
                    <span className={styles.br3} /> Labs
                </h1>
            </div>

            <div className={styles.thesis}>
                <Crosses />
                <VRule />
                <p className={styles.thesisLabel}>Thesis</p>
                <div className={styles.thesisBody}>
                    <h2 className={styles.thesisText}>
                        A deadline is a<span className={styles.brk} />{" "}
                        correctness condition.
                    </h2>
                    <p className={styles.thLine}>
                        We build and measure systems where a late answer is a
                        wrong answer.
                    </p>
                    <div className={styles.ctas}>
                        <ButtonLink href={href("get-involved")} primary>
                            Get involved
                        </ButtonLink>
                        <ButtonLink href={href("sponsors")}>
                            Partner with us
                        </ButtonLink>
                    </div>
                </div>
            </div>

            <div className={styles.sweep} aria-hidden="true">
                <span className={styles.sweepTag} data-k={4}>
                    Deadline
                </span>
            </div>
        </section>
    );
}
