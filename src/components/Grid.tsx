// The structure every row shares. No state, so server and client
// components can both use them.

import styles from "./Grid.module.css";

// + marks where this row's top rule meets the frame edges, the column rule
// (c) and the deadline (d)
export function Crosses({ c = true, d = true }: { c?: boolean; d?: boolean }) {
    return (
        <>
            <i aria-hidden="true" className={`${styles.x} ${styles.xL}`} />
            {c && (
                <i aria-hidden="true" className={`${styles.x} ${styles.xC}`} />
            )}
            {d && (
                <i aria-hidden="true" className={`${styles.x} ${styles.xD}`} />
            )}
            <i aria-hidden="true" className={`${styles.x} ${styles.xR}`} />
        </>
    );
}

export function VRule() {
    return <div aria-hidden="true" className={styles.vr} />;
}

// Drawn once by the site layout, down the whole of <main>
export function Late() {
    return <div aria-hidden="true" className={styles.late} />;
}
