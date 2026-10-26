import { describe, expect, test } from "vitest";

import {
    CartPole,
    DEG,
    findDeadline,
    isStableAt,
    linearDelayMargin,
} from "./cartpole";

// Run the live toy's loop (test nudges every 4 s) for a while and keep the
// worst excursions while the pole was still up
function runLive(delayMs: number, seconds: number) {
    const sim = new CartPole();
    sim.delay = delayMs;
    let maxTh = 0;
    let maxX = 0;

    for (let k = 0; k < seconds * 1000; k++) {
        sim.step();
        if (!sim.fallen) {
            maxTh = Math.max(maxTh, Math.abs(sim.th));
            maxX = Math.max(maxX, Math.abs(sim.x));
        }
    }

    return { sim, maxThDeg: maxTh / DEG, maxX };
}

describe("cart-pole under delayed state feedback", () => {
    test("balances at 0 ms through a minute of nudges", () => {
        const { sim, maxThDeg, maxX } = runLive(0, 60);

        expect(sim.fallen).toBe(false);
        expect(maxThDeg).toBeLessThan(5);
        expect(maxX).toBeLessThan(0.4);
    });

    test("falls within a few seconds at 200 ms", () => {
        const { sim } = runLive(200, 20);

        expect(sim.fallen).toBe(true);
        expect(sim.fellAt).toBeLessThan(8000);
    });

    test("a reset after a fall holds again at a safe delay", () => {
        const { sim } = runLive(250, 10);

        sim.delay = 30;
        sim.reset(0.5 * DEG);
        for (let k = 0; k < 20000; k++) sim.step();

        expect(sim.fallen).toBe(false);
    });
});

describe("the deadline", () => {
    const deadline = findDeadline();

    test("bisection brackets it: stable on it, unstable one ms past", () => {
        expect(Number.isFinite(deadline)).toBe(true);
        expect(isStableAt(deadline)).toBe(true);
        expect(isStableAt(deadline + 1)).toBe(false);
    });

    // Two independent routes to the same number: brute simulation of the
    // nonlinear sampled loop, and the phase margin of the linearised one
    test("agrees with the linear delay margin to within 2 ms", () => {
        expect(Math.abs(linearDelayMargin() - deadline)).toBeLessThanOrEqual(2);
    });
});
