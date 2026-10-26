import { findDeadline, linearDelayMargin } from "@/lib/cartpole";

import styles from "./ControlSection.module.css";
import { ControlToy } from "./ControlToy";
import { Crosses, VRule } from "./Grid";

export function ControlSection() {
    // Bisection over the same simulation the toy runs (about 10 ms of
    // work). This is a server component, so it runs once at build time and
    // the number is in the static HTML.
    const deadline = findDeadline();
    const margin = linearDelayMargin();
    if (!Number.isFinite(deadline) || !Number.isFinite(margin)) {
        throw new Error(
            "cart-pole: no stable/unstable bracket for the deadline",
        );
    }

    return (
        <section aria-labelledby="try-it">
            <div className={styles.head}>
                <Crosses />
                <VRule />
                <p className={styles.label}>Try it</p>
                <div className={styles.body}>
                    <h2 id="try-it" className={styles.title}>
                        Make the controller late.
                    </h2>
                    <p className={styles.line}>
                        It sees the pole <i>d</i> ms late. Push <i>d</i> past{" "}
                        {deadline} ms and it falls.
                    </p>
                </div>
            </div>
            <ControlToy deadlineMs={deadline} marginMs={margin} />
        </section>
    );
}
