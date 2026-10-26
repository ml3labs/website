// Cart-pole on a finite track, balanced by state feedback that reads the
// state through a delay line. No DOM: the landing page runs it live, the
// server runs it at build time to find the deadline, and cartpole.test.ts
// checks it numerically.
//
// Model: point-mass pole on a massless rod, frictionless pivot, no cart
// friction while the motor runs. Equations from the Lagrangian:
//   x'' = (u + m sinθ (l θ'^2 - g cosθ)) / (M + m sin^2 θ)
//   θ'' = (g sinθ - cosθ x'') / l
// θ is measured from upright, positive when the pole leans toward +x.

export const MODEL = {
    cartMass: 1.0, // kg
    poleMass: 0.2, // kg, at the tip
    poleLength: 0.6, // m, pivot to tip
    g: 9.81, // m/s^2
    forceLimit: 20, // N, actuator saturation
    stepMs: 1, // fixed physics step; the controller also runs every step
    trackHalf: 0.6, // m, travel of the cart centre either side of x = 0
    // Drawing only (they do not enter the dynamics)
    cartWidth: 0.32,
    cartHeight: 0.12,
    wheelRadius: 0.035,
    bobRadius: 0.028,
} as const;

// u = Kx·x + Kv·v + Kθ·θ + Kω·ω, from discrete LQR on the linearised plant
// (Q = diag(10, 1, 100, 1), R = 1), rounded. A PD loop on the pole angle
// plus a PD loop on the cart position.
export const GAINS = { x: 3.1, v: 4.6, th: 42.8, om: 9.8 } as const;

export const NUDGE = 0.5; // rad/s added to the pole's angular rate
export const AUTO_NUDGE_MS = 4000; // test nudge period, alternating sides
export const MAX_DELAY_MS = 250;
export const TRACE_SAMPLE_MS = 20;
export const TRACE_LEN = 400; // 8 s of θ at 50 Hz
export const DEG = Math.PI / 180;

// Past 60° the run counts as fallen: the motor cuts out and a brake stops
// the cart. The pole then drops until its bob touches the floor.
const FALL_ANGLE = 60 * DEG;
const BRAKE = 8; // N per m/s, after a fall
const BUMPER_RESTITUTION = 0.2;
const PIVOT_HEIGHT = 2 * MODEL.wheelRadius + MODEL.cartHeight;
export const REST_ANGLE = Math.acos(
    (MODEL.bobRadius - PIVOT_HEIGHT) / MODEL.poleLength,
);

const CAP = 512; // ring size, power of two, > MAX_DELAY_MS
const MASK = CAP - 1;
const NUDGE_MARKS = 12;

const M = MODEL.cartMass;
const m = MODEL.poleMass;
const l = MODEL.poleLength;
const g = MODEL.g;
const h = MODEL.stepMs / 1000;

// Scratch output of accel(), so the step allocates nothing
const acc = new Float64Array(2);
function accel(th: number, om: number, u: number) {
    const s = Math.sin(th);
    const c = Math.cos(th);
    const xdd = (u + m * s * (l * om * om - g * c)) / (M + m * s * s);
    acc[0] = xdd;
    acc[1] = (g * s - c * xdd) / l;
}

export type CartPoleOptions = {
    autoNudge?: boolean;
    firstNudgeMs?: number;
};

export class CartPole {
    // State
    x = 0;
    v = 0;
    th = 0;
    om = 0;
    // Last control force, N, and the delayed state it was computed from
    u = 0;
    seenX = 0;
    seenTh = 0;
    // Delay, in whole physics steps (ms)
    delay = 0;
    // Clock in ms. It keeps running across resets so traces stay continuous.
    t = 0;
    fallen = false;
    fellAt = -1;
    fellWithDelay = 0;
    resting = false; // pole lying on the floor
    settled = false; // and the cart has stopped: nothing left to simulate

    autoNudge: boolean;
    private nextNudge: number;
    private nudgeSign = 1;
    nudgeMarks = new Float64Array(NUDGE_MARKS).fill(-1e9);
    nudgeDirs = new Int8Array(NUDGE_MARKS);
    private nudgeHead = 0;

    // History of past states for the delay line
    private hist = new Float64Array(CAP * 4);
    private head = 0;

    // θ in degrees every TRACE_SAMPLE_MS, oldest overwritten first
    trace = new Float32Array(TRACE_LEN);
    traceHead = 0; // next write index
    traceCount = 0;

    constructor(opts: CartPoleOptions = {}) {
        this.autoNudge = opts.autoNudge ?? true;
        this.nextNudge = opts.firstNudgeMs ?? 1000;
        this.reset(0);
    }

    // Upright at the centre with a small tilt, as if it had been held there
    // still, so the delay line is full of that state.
    reset(th0 = 0) {
        this.x = 0;
        this.v = 0;
        this.th = th0;
        this.om = 0;
        this.u = 0;
        this.seenX = 0;
        this.seenTh = th0;
        this.fallen = false;
        this.fellAt = -1;
        this.resting = false;
        this.settled = false;
        for (let i = 0; i < CAP; i++) {
            const o = i * 4;
            this.hist[o] = 0;
            this.hist[o + 1] = 0;
            this.hist[o + 2] = th0;
            this.hist[o + 3] = 0;
        }
        if (this.t > 0) this.nextNudge = this.t + 1500;
    }

    nudge(dir: 1 | -1) {
        if (this.fallen) return;
        this.om += dir * NUDGE;
        this.nudgeMarks[this.nudgeHead] = this.t;
        this.nudgeDirs[this.nudgeHead] = dir;
        this.nudgeHead = (this.nudgeHead + 1) % NUDGE_MARKS;
    }

    // Time and direction of the most recent nudge
    lastNudge(): { at: number; dir: number } {
        const i = (this.nudgeHead + NUDGE_MARKS - 1) % NUDGE_MARKS;
        return { at: this.nudgeMarks[i], dir: this.nudgeDirs[i] };
    }

    step() {
        if (this.settled) {
            this.t += MODEL.stepMs;
            this.sample();
            return;
        }
        if (this.autoNudge && !this.fallen && this.t >= this.nextNudge) {
            this.nudge(this.nudgeSign as 1 | -1);
            this.nudgeSign = -this.nudgeSign;
            this.nextNudge += AUTO_NUDGE_MS;
        }

        // Record the present, then read the state from `delay` steps ago
        const hist = this.hist;
        this.head = (this.head + 1) & MASK;
        let o = this.head * 4;
        hist[o] = this.x;
        hist[o + 1] = this.v;
        hist[o + 2] = this.th;
        hist[o + 3] = this.om;
        o = ((this.head - this.delay) & MASK) * 4;
        const sx = hist[o];
        const sv = hist[o + 1];
        const sth = hist[o + 2];
        const som = hist[o + 3];
        this.seenX = sx;
        this.seenTh = sth;

        let u: number;
        if (!this.fallen) {
            u = GAINS.x * sx + GAINS.v * sv + GAINS.th * sth + GAINS.om * som;
            const lim = MODEL.forceLimit;
            u = u > lim ? lim : u < -lim ? -lim : u;
        } else {
            u = -BRAKE * this.v;
        }
        this.u = u;

        if (this.resting) {
            // Pole on the floor: only the braked cart moves
            this.v += h * (u / (M + m));
            this.x += h * this.v;
        } else {
            this.rk4(u);
        }

        // End stops. The rod can only push along itself, so the bob keeps
        // its velocity across the rod and the pole picks up the difference.
        const lim = MODEL.trackHalf;
        if (this.x > lim || this.x < -lim) {
            this.x = this.x > 0 ? lim : -lim;
            if (this.x * this.v > 0) {
                const v0 = this.v;
                this.v = -BUMPER_RESTITUTION * v0;
                if (!this.resting)
                    this.om += ((v0 - this.v) * Math.cos(this.th)) / l;
            }
        }

        if (!this.fallen && Math.abs(this.th) > FALL_ANGLE) {
            this.fallen = true;
            this.fellAt = this.t;
            this.fellWithDelay = this.delay;
        }
        if (!this.resting && Math.abs(this.th) >= REST_ANGLE) {
            this.th = this.th > 0 ? REST_ANGLE : -REST_ANGLE;
            this.om = 0;
            this.resting = true;
        }
        if (this.resting && Math.abs(this.v) < 0.002) {
            this.v = 0;
            this.settled = true;
        }

        this.t += MODEL.stepMs;
        this.sample();
    }

    private sample() {
        if (this.t % TRACE_SAMPLE_MS !== 0) return;
        this.trace[this.traceHead] = this.th / DEG;
        this.traceHead = (this.traceHead + 1) % TRACE_LEN;
        if (this.traceCount < TRACE_LEN) this.traceCount++;
    }

    // Classic RK4 with the force held for the whole step (zero-order hold)
    private rk4(u: number) {
        const { x, v, th, om } = this;
        accel(th, om, u);
        const k1x = v;
        const k1v = acc[0];
        const k1t = om;
        const k1o = acc[1];
        accel(th + 0.5 * h * k1t, om + 0.5 * h * k1o, u);
        const k2x = v + 0.5 * h * k1v;
        const k2v = acc[0];
        const k2t = om + 0.5 * h * k1o;
        const k2o = acc[1];
        accel(th + 0.5 * h * k2t, om + 0.5 * h * k2o, u);
        const k3x = v + 0.5 * h * k2v;
        const k3v = acc[0];
        const k3t = om + 0.5 * h * k2o;
        const k3o = acc[1];
        accel(th + h * k3t, om + h * k3o, u);
        const k4x = v + h * k3v;
        const k4v = acc[0];
        const k4t = om + h * k3o;
        const k4o = acc[1];
        this.x = x + (h / 6) * (k1x + 2 * k2x + 2 * k3x + k4x);
        this.v = v + (h / 6) * (k1v + 2 * k2v + 2 * k3v + k4v);
        this.th = th + (h / 6) * (k1t + 2 * k2t + 2 * k3t + k4t);
        this.om = om + (h / 6) * (k1o + 2 * k2o + 2 * k3o + k4o);
    }
}

// Small-signal test: tilt 1 µrad and let go, with no nudges. Stable when
// the tilt dies out: the largest |θ| over 20–30 s is below that over
// 10–20 s, and |θ| never grew past ten times the starting tilt. The second
// condition matters just past the deadline, where a growing tilt saturates
// the actuator and settles into a steady wobble (a limit cycle) whose
// window peaks would otherwise look level.
export const TEST_TILT = 1e-6; // rad
export function isStableAt(delayMs: number): boolean {
    const sim = new CartPole({ autoNudge: false });
    sim.delay = delayMs;
    sim.reset(TEST_TILT);
    let early = 0;
    let late = 0;
    for (let k = 0; k < 30000; k++) {
        sim.step();
        const a = Math.abs(sim.th);
        if (sim.fallen || a > 10 * TEST_TILT) return false;
        if (k >= 20000) late = a > late ? a : late;
        else if (k >= 10000) early = a > early ? a : early;
    }
    return late < early;
}

// The deadline: the largest whole-ms delay that still passes isStableAt,
// found by bisection. Stability is monotone in delay for this design (a
// sweep of every ms agrees), so bisection is enough.
export function findDeadline(): number {
    let lo = 0;
    let hi = MAX_DELAY_MS;
    if (!isStableAt(lo) || isStableAt(hi)) return NaN;
    while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (isStableAt(mid)) lo = mid;
        else hi = mid;
    }
    return lo;
}

// What the still diagram shows: start at rest, nudge at 0.5 s and 4.5 s,
// run 8 s. Also the starting point of the live toy, so the server-rendered
// frame and the first live frame match.
export const SCENARIO_MS = TRACE_LEN * TRACE_SAMPLE_MS;
export function runScenario(delayMs: number): CartPole {
    const sim = new CartPole({ firstNudgeMs: 500 });
    sim.delay = delayMs;
    for (let k = 0; k < SCENARIO_MS; k++) sim.step();
    return sim;
}

// Analytic cross-check: the delay margin of the linearised continuous loop,
// from its frequency response L(jω) = −K (jωI − A)^−1 B. At each gain
// crossover, delay margin = phase margin / ω; the smallest one counts. The
// sampled loop (1 ms, zero-order hold) loses about half a step on top.
export function linearDelayMargin(): number {
    let best = Infinity;
    let prev = NaN;
    for (let w = 0.01; w < 300; w *= 1.0002) {
        const s2 = -w * w;
        const th = -1 / (M * l * s2 - (M + m) * g);
        const x = (1 - m * g * th) / (M * s2);
        const re = -(GAINS.x * x + GAINS.th * th);
        const im = -w * (GAINS.v * x + GAINS.om * th);
        const mag = Math.hypot(re, im);
        if (!Number.isNaN(prev) && (prev - 1) * (mag - 1) < 0) {
            let pm = Math.PI + Math.atan2(im, re);
            pm = ((pm % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
            if (pm > Math.PI) pm -= 2 * Math.PI;
            if (pm > 0) best = Math.min(best, (1000 * pm) / w);
        }
        prev = mag;
    }
    return best;
}
