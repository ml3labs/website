"use client";

import type { CSSProperties, KeyboardEvent } from "react";

import { Crosses, VRule } from "./Grid";
import styles from "./LatencyKnob.module.css";

type Props = {
    id: string;
    value: number;
    max: number;
    deadline: number;
    onChange: (v: number) => void;
};

// A native range input (keyboard, touch and screen readers for free) laid
// over a drawn scale: ticks every 10 ms, the deadline in maroon and the
// unstable side hatched like the page's late column.
export function LatencyKnob({ id, value, max, deadline, onChange }: Props) {
    const pct = (v: number) => `${(v / max) * 100}%`;
    const late = value > deadline;
    const ticks: number[] = [];
    for (let v = 0; v <= max; v += 10) ticks.push(v);
    const labels: number[] = [];
    for (let v = 0; v <= max; v += 50) labels.push(v);

    const verdict =
        value > deadline
            ? `Past the deadline by ${value - deadline} ms. Small tilts grow.`
            : value === deadline
              ? "On the deadline. Small tilts still die out, slowly."
              : `Inside the deadline by ${deadline - value} ms. Small tilts die out.`;

    // Shift or Page keys move 10 ms at a time
    function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
        let delta = 0;
        if (e.key === "PageUp") delta = 10;
        else if (e.key === "PageDown") delta = -10;
        else if (e.shiftKey && (e.key === "ArrowRight" || e.key === "ArrowUp"))
            delta = 10;
        else if (e.shiftKey && (e.key === "ArrowLeft" || e.key === "ArrowDown"))
            delta = -10;
        if (!delta) return;
        e.preventDefault();
        onChange(Math.max(0, Math.min(max, value + delta)));
    }

    const vars = {
        "--val": pct(value),
        "--dl": pct(deadline),
    } as CSSProperties;

    return (
        <div className={styles.knob} style={vars}>
            <Crosses />
            <VRule />
            <div className={styles.head}>
                <label htmlFor={id} className={styles.label}>
                    Loop latency <i>d</i>
                </label>
                <output
                    htmlFor={id}
                    className={styles.value}
                    data-late={late}
                    aria-hidden="true"
                >
                    {value}
                    <small>ms</small>
                </output>
            </div>
            <div className={styles.body}>
                <div className={styles.scale}>
                    <div className={styles.scaleInner} aria-hidden="true">
                        <span className={styles.unstable} />
                        <span className={styles.unstableLabel}>Unstable</span>
                        <span className={styles.rail} />
                        <span className={styles.fill} data-late={late} />
                        {ticks.map((v) => (
                            <span
                                key={v}
                                className={
                                    v % 50 === 0
                                        ? styles.tickMajor
                                        : styles.tick
                                }
                                style={{ left: pct(v) }}
                            />
                        ))}
                        <span className={styles.deadline}>
                            <span>Deadline {deadline} ms</span>
                        </span>
                    </div>
                    <input
                        id={id}
                        className={styles.range}
                        type="range"
                        min={0}
                        max={max}
                        step={1}
                        value={value}
                        data-late={late}
                        aria-valuetext={`${value} milliseconds, ${
                            late ? "past" : "within"
                        } the ${deadline} millisecond deadline`}
                        onChange={(e) =>
                            onChange(Number(e.currentTarget.value))
                        }
                        onKeyDown={onKeyDown}
                    />
                </div>
                <div className={styles.scaleLabels} aria-hidden="true">
                    {labels.map((v) => (
                        <span key={v} style={{ left: pct(v) }}>
                            {v}
                        </span>
                    ))}
                </div>
                <p className={styles.verdict} data-late={late}>
                    {verdict}
                </p>
            </div>
        </div>
    );
}
