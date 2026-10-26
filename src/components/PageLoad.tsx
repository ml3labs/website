"use client";

import { type CSSProperties, useEffect, useState } from "react";

import styles from "./PageLoad.module.css";

type Timing = { ttfb: number; dom: number; load: number };

const ROWS = [
    { key: "ttfb", label: "First byte" },
    { key: "dom", label: "DOM ready" },
    { key: "load", label: "Loaded" },
] as const;

// This visit's first page load, from the browser's Navigation Timing entry:
// one sample, measured where the page was viewed. Dashes until the load
// event has finished, or for good if the browser keeps no entry.
export function PageLoad() {
    const [t, setT] = useState<Timing | null>(null);

    useEffect(() => {
        let timer = 0;
        function read() {
            const [nav] = performance.getEntriesByType(
                "navigation",
            ) as PerformanceNavigationTiming[];
            if (!nav?.loadEventEnd) return;
            setT({
                ttfb: nav.responseStart,
                dom: nav.domContentLoadedEventEnd,
                load: nav.loadEventEnd,
            });
        }
        // loadEventEnd is only set once every load handler has returned
        const later = () => {
            timer = window.setTimeout(read, 0);
        };
        if (document.readyState === "complete") later();
        else window.addEventListener("load", later, { once: true });
        return () => {
            window.removeEventListener("load", later);
            window.clearTimeout(timer);
        };
    }, []);

    return (
        <div className={styles.load}>
            <dl className={styles.rows}>
                {ROWS.map(({ key, label }) => (
                    <div key={key} className={styles.row}>
                        <dt>{label}</dt>
                        <dd className={styles.value}>
                            <span
                                className={styles.track}
                                aria-hidden="true"
                                style={
                                    {
                                        "--w": t ? t[key] / t.load : 0,
                                    } as CSSProperties
                                }
                            />
                            {t ? `${Math.round(t[key])} ms` : "–"}
                        </dd>
                    </div>
                ))}
            </dl>
            <p className={styles.note}>Measured in your browser.</p>
        </div>
    );
}
