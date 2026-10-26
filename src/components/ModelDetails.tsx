import { AUTO_NUDGE_MS, GAINS, MODEL, NUDGE } from "@/lib/cartpole";

import styles from "./ModelDetails.module.css";
import { Tex } from "./Tex";

const LAW = `u = ${GAINS.th}\\theta + ${GAINS.om}\\omega + ${GAINS.x}x + ${GAINS.v}v`;

type Props = {
    deadlineMs: number; // from findDeadline(), run at build time
    marginMs: number; // from linearDelayMargin()
};

// The model's parameters, collapsed under the cart-pole figure
export function ModelDetails({ deadlineMs, marginMs }: Props) {
    return (
        <details className={styles.more}>
            <summary>Model details</summary>
            <dl className={styles.model}>
                <div>
                    <dt>Plant</dt>
                    <dd>
                        Cart {MODEL.cartMass.toFixed(1)} kg on a ±
                        {MODEL.trackHalf} m track. Pole: {MODEL.poleMass} kg
                        point mass on a {MODEL.poleLength} m massless rod.
                    </dd>
                </div>
                <div>
                    <dt>Controller</dt>
                    <dd>
                        <Tex>{LAW}</Tex>, clipped to ±{MODEL.forceLimit} N. LQR
                        gains, rounded. It reads the state from a ring buffer,{" "}
                        <Tex>d</Tex> steps back.
                    </dd>
                </div>
                <div>
                    <dt>Physics</dt>
                    <dd>
                        RK4, fixed {MODEL.stepMs} ms step. The controller runs
                        every step (1 kHz). Test nudge: {NUDGE} rad/s every{" "}
                        {AUTO_NUDGE_MS / 1000} s, alternating sides.
                    </dd>
                </div>
                <div>
                    <dt>Deadline</dt>
                    <dd>
                        <b>{deadlineMs} ms</b>: the largest <Tex>d</Tex> at
                        which a 1 µrad tilt still dies out, found by bisection
                        on this simulation at build time. The linearised
                        loop&apos;s delay margin, {marginMs.toFixed(1)} ms,
                        agrees to about a step. Just past the deadline, the ±
                        {MODEL.forceLimit} N limit can hold the pole in a steady
                        wobble instead of letting it fall.
                    </dd>
                </div>
            </dl>
        </details>
    );
}
