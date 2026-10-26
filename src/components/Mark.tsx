// The logo, inlined so it takes the page's tokens rather than the PNG's
// baked-in colors. The hero animates its own copy, layer by layer.

import styles from "./Mark.module.css";
import {
    MARK_BAR_1,
    MARK_BAR_2,
    MARK_BAR_3,
    MARK_THREE,
    MARK_VIEWBOX,
} from "./markData";

export function Mark({ className }: { className: string }) {
    return (
        <svg
            className={className}
            viewBox={MARK_VIEWBOX}
            aria-hidden="true"
            focusable="false"
        >
            <path className={styles.ink} d={MARK_BAR_1} />
            <path className={styles.ink} d={MARK_BAR_2} />
            <path className={styles.ink} d={MARK_BAR_3} />
            <path className={styles.accent} d={MARK_THREE} />
        </svg>
    );
}

// "ML³" in text, with the ³ in the mark's maroon
export function Name() {
    return (
        <span>
            ML<span className={styles.three}>³</span>
        </span>
    );
}
