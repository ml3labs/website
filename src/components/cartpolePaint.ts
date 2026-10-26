// Geometry and per-frame attributes for ControlToy's two drawings. Every
// function here is pure: React renders the first frame from them (so the
// static HTML is a correct still), and the frame loop applies later frames
// to the same nodes with setAttribute, without re-rendering.

import {
    type CartPole,
    DEG,
    MODEL,
    SCENARIO_MS,
    TRACE_LEN,
    TRACE_SAMPLE_MS,
} from "@/lib/cartpole";

const r1 = (v: number) => (Math.round(v * 10) / 10).toString();

// "+2.4°", "−0.12 m", "0.0 N"
function signed(v: number, digits: number, unit: string) {
    const a = Math.abs(v).toFixed(digits);
    if (Number(a) === 0) return `${a}${unit}`;
    return `${v < 0 ? "−" : "+"}${a}${unit}`;
}

/* ---------------------------------------------------------------- mechanism */

export type MechGeom = {
    w: number;
    h: number;
    s: number; // px per metre
    cx: number; // x = 0
    railY: number;
    pivotY: number;
    cartMidY: number;
    L: number;
    cw: number;
    ch: number;
    wr: number;
    br: number;
    trackEnd: number; // px from cx to the inner face of each end stop
    stopW: number;
    stopH: number;
    arcR: number;
    showMass: boolean;
};

const TOP = 44; // room for the legend
const BOTTOM = 40; // floor hatch and the x dimension
const SIDE = 12;

// The scale fits the track, its end stops and the pole standing up. A pole
// lying on the floor past an end stop reaches further than that, and
// fitting it too made the pole about 80px tall on a phone; instead the view
// pans to follow the bob when it would leave the drawing (panOf).
const TRACK_REACH = MODEL.trackHalf + MODEL.cartWidth / 2 + 0.03;
const TALL =
    2 * MODEL.wheelRadius +
    MODEL.cartHeight +
    MODEL.poleLength +
    MODEL.bobRadius;

export function mechGeom(w: number, h: number): MechGeom {
    const s = Math.max(
        40,
        Math.min((w - 2 * SIDE) / (2 * TRACK_REACH), (h - TOP - BOTTOM) / TALL),
    );
    // Half-pixel offsets keep 1px strokes crisp
    const railY = Math.round(h - BOTTOM) + 0.5;
    const cx = Math.round(w / 2) + 0.5;
    const wr = MODEL.wheelRadius * s;
    const ch = MODEL.cartHeight * s;
    const cw = MODEL.cartWidth * s;
    const L = MODEL.poleLength * s;
    return {
        w,
        h,
        s,
        cx,
        railY,
        pivotY: railY - 2 * wr - ch,
        cartMidY: railY - 2 * wr - ch / 2,
        L,
        cw,
        ch,
        wr,
        br: MODEL.bobRadius * s,
        trackEnd: (MODEL.trackHalf + MODEL.cartWidth / 2) * s,
        stopW: Math.max(5, 0.025 * s),
        stopH: Math.max(9, 0.06 * s),
        arcR: Math.min(0.42 * L, 46),
        showMass: cw >= 70,
    };
}

// How far to shift the whole mechanism so the bob stays SIDE px inside the
// drawing. Zero unless the pole leans out past an end stop. It follows the
// state continuously, so the view slides rather than jumps.
export function panOf(sim: CartPole, g: MechGeom): number {
    const bob = g.cx + sim.x * g.s + g.L * Math.sin(sim.th);
    const right = bob + g.br + SIDE - g.w;
    if (right > 0) return -right;
    const left = SIDE - (bob - g.br);
    return left > 0 ? left : 0;
}

// The bob's x on screen, for telling which side of the pole a tap landed
export function bobScreenX(sim: CartPole, g: MechGeom): number {
    return panOf(sim, g) + g.cx + sim.x * g.s + g.L * Math.sin(sim.th);
}

export type Label = {
    x: string;
    y: string;
    anchor: "start" | "middle" | "end";
    text: string;
};

export type MechFrame = {
    state: "live" | "fallen";
    view: string;
    cart: string;
    pole: string;
    ghost: "visible" | "hidden";
    gcart: string;
    gpole: string;
    vref: string;
    arc: string;
    th: Label;
    force: string;
    u: Label;
    xdim: string;
    x: Label;
    nudge: string;
    nudgeOpacity: string;
};

const NUDGE_SHOW_MS = 500;

export function mechFrame(sim: CartPole, g: MechGeom): MechFrame {
    const X = g.cx + sim.x * g.s;
    const thDeg = sim.th / DEG;
    const GX = g.cx + sim.seenX * g.s;

    // Angle from the vertical through the pivot to the rod
    let arc = "";
    if (Math.abs(thDeg) >= 0.25) {
        const r = g.arcR;
        const ex = X + r * Math.sin(sim.th);
        const ey = g.pivotY - r * Math.cos(sim.th);
        arc = `M${r1(X)} ${r1(g.pivotY - r)}A${r1(r)} ${r1(r)} 0 0 ${
            sim.th > 0 ? 1 : 0
        } ${r1(ex)} ${r1(ey)}`;
    }
    const lean = sim.th >= 0 ? 1 : -1;
    const th: Label = {
        x: r1(X - lean * 6),
        y: r1(g.pivotY - g.arcR * 0.72),
        anchor: lean > 0 ? "end" : "start",
        text: `θ ${signed(thDeg, 1, "°")}`,
    };

    // Control force, drawn from the cart's side in its direction
    let force = "";
    const u: Label = {
        x: r1(X),
        y: r1(g.cartMidY - 8),
        anchor: "middle",
        text: "",
    };
    if (!sim.fallen && Math.abs(sim.u) >= 0.2) {
        const dir = sim.u > 0 ? 1 : -1;
        const x0 = X + dir * (g.cw / 2 + 3);
        const len =
            8 + Math.min(Math.abs(sim.u) / MODEL.forceLimit, 1) * 0.26 * g.s;
        const x1 = x0 + dir * len;
        const y = r1(g.cartMidY);
        force = `M${r1(x0)} ${y}H${r1(x1)}M${r1(x1)} ${y}l${-dir * 6} -3.5M${r1(
            x1,
        )} ${y}l${-dir * 6} 3.5`;
        u.x = r1((x0 + x1) / 2);
        const sat = Math.abs(sim.u) >= MODEL.forceLimit - 0.05;
        u.text = sat
            ? `u ${dir > 0 ? "+" : "−"}${MODEL.forceLimit} N max`
            : `u ${signed(sim.u, 1, " N")}`;
    } else if (sim.fallen) {
        u.text = "motor off";
        u.y = r1(g.pivotY - 8);
    }

    // Cart position: a dimension under the floor from x = 0 to the cart,
    // its value centred above the line as on a drawing. Centred, it stays
    // inside the drawing even with the cart against an end stop.
    const dy = g.railY + 26;
    const xdim =
        `M${r1(X)} ${r1(g.railY + 11)}V${r1(dy + 5)}` +
        `M${r1(g.cx)} ${r1(dy)}H${r1(X)}` +
        `M${r1(g.cx - 3)} ${r1(dy + 3)}l6 -6M${r1(X - 3)} ${r1(dy + 3)}l6 -6`;
    const x: Label = {
        x: r1((g.cx + X) / 2),
        y: r1(dy - 5),
        anchor: "middle",
        text: `x ${signed(sim.x, 2, " m")}`,
    };

    // A short arrow at the bob for each nudge
    const last = sim.lastNudge();
    const age = sim.t - last.at;
    const op = age >= 0 && age < NUDGE_SHOW_MS ? 1 - age / NUDGE_SHOW_MS : 0;
    const tipX = X + g.L * Math.sin(sim.th);
    const tipY = g.pivotY - g.L * Math.cos(sim.th);

    return {
        state: sim.fallen ? "fallen" : "live",
        view: `translate(${r1(panOf(sim, g))} 0)`,
        cart: `translate(${r1(X - g.cx)} 0)`,
        pole: `translate(${r1(X)} ${r1(g.pivotY)}) rotate(${(
            Math.round(thDeg * 100) / 100
        ).toString()})`,
        ghost: sim.delay > 0 && !sim.fallen ? "visible" : "hidden",
        gcart: `translate(${r1(GX - g.cx)} 0)`,
        gpole: `translate(${r1(GX)} ${r1(g.pivotY)}) rotate(${(
            Math.round((sim.seenTh / DEG) * 100) / 100
        ).toString()})`,
        vref: `M${r1(X)} ${r1(g.pivotY)}V${r1(g.pivotY - g.L - 16)}`,
        arc,
        th,
        force,
        u,
        xdim,
        x,
        nudge: `translate(${r1(tipX)} ${r1(tipY)}) scale(${last.dir || 1} 1)`,
        nudgeOpacity: op.toFixed(2),
    };
}

const MECH_KEYS = [
    "view",
    "cart",
    "pole",
    "ghost",
    "gcart",
    "gpole",
    "vref",
    "arc",
    "th",
    "force",
    "u",
    "xdim",
    "x",
    "nudge",
] as const;

export type MechNodes = { root: SVGSVGElement } & Record<
    (typeof MECH_KEYS)[number],
    Element
>;

function pick(root: Element, k: string): Element {
    const el = root.querySelector(`[data-k="${k}"]`);
    if (!el) throw new Error(`missing node ${k}`);
    return el;
}

export function mechNodes(root: SVGSVGElement): MechNodes {
    const out = { root } as MechNodes;
    for (const k of MECH_KEYS) out[k] = pick(root, k);
    return out;
}

function set(el: Element, name: string, value: string) {
    if (el.getAttribute(name) !== value) el.setAttribute(name, value);
}

// Change the existing text node, so React's own node stays in place
function setText(el: Element, text: string) {
    const t = el.firstChild;
    if (t && t.nodeType === 3) {
        if (t.nodeValue !== text) t.nodeValue = text;
    } else if (el.textContent !== text) {
        el.textContent = text;
    }
}

function applyLabel(el: Element, l: Label, withText: boolean) {
    set(el, "x", l.x);
    set(el, "y", l.y);
    set(el, "text-anchor", l.anchor);
    if (withText) setText(el, l.text);
}

export function applyMech(n: MechNodes, f: MechFrame, withText: boolean) {
    set(n.root, "data-state", f.state);
    set(n.view, "transform", f.view);
    set(n.cart, "transform", f.cart);
    set(n.pole, "transform", f.pole);
    set(n.ghost, "visibility", f.ghost);
    set(n.gcart, "transform", f.gcart);
    set(n.gpole, "transform", f.gpole);
    set(n.vref, "d", f.vref);
    set(n.arc, "d", f.arc);
    set(n.force, "d", f.force);
    set(n.xdim, "d", f.xdim);
    set(n.nudge, "transform", f.nudge);
    set(n.nudge, "opacity", f.nudgeOpacity);
    applyLabel(n.th, f.th, withText);
    applyLabel(n.u, f.u, withText);
    applyLabel(n.x, f.x, withText);
}

/* -------------------------------------------------------------------- scope */

export const SCOPE_H = 112;
export const SCOPE_RANGE_DEG = 25;

export type ScopeGeom = {
    w: number;
    h: number;
    left: number;
    right: number;
    top: number;
    bottom: number;
    mid: number;
    degPx: number;
    msPx: number;
};

export function scopeGeom(w: number, h = SCOPE_H): ScopeGeom {
    const left = 40.5;
    const right = Math.round(w - 4) + 0.5;
    const top = 12.5;
    const bottom = Math.round(h - 20) + 0.5;
    return {
        w,
        h,
        left,
        right,
        top,
        bottom,
        mid: (top + bottom) / 2,
        degPx: (bottom - top) / 2 / SCOPE_RANGE_DEG,
        msPx: (right - left) / SCENARIO_MS,
    };
}

export type ScopeFrame = {
    points: string;
    ghost: string;
    marks: string;
    fall: string;
};

export function scopeFrame(sim: CartPole, g: ScopeGeom): ScopeFrame {
    const n = sim.traceCount;
    const newest = sim.t - (sim.t % TRACE_SAMPLE_MS);
    let points = "";
    for (let i = 0; i < n; i++) {
        const idx = (sim.traceHead - n + i + TRACE_LEN) % TRACE_LEN;
        const ts = newest - (n - 1 - i) * TRACE_SAMPLE_MS;
        const x = g.right - (sim.t - ts) * g.msPx;
        let v = sim.trace[idx];
        v = v > 40 ? 40 : v < -40 ? -40 : v;
        points += `${x.toFixed(1)},${(g.mid - v * g.degPx).toFixed(1)} `;
    }
    let marks = "";
    for (let i = 0; i < sim.nudgeMarks.length; i++) {
        const age = sim.t - sim.nudgeMarks[i];
        if (age < 0 || age > SCENARIO_MS) continue;
        const x = g.right - age * g.msPx;
        marks += `M${x.toFixed(1)} ${g.top - 2}l-3.5 -6h7z`;
    }
    let fall = "";
    if (sim.fellAt >= 0) {
        const age = sim.t - sim.fellAt;
        if (age <= SCENARIO_MS) {
            const x = (g.right - age * g.msPx).toFixed(1);
            fall = `M${x} ${g.top}V${g.bottom}`;
        }
    }
    return {
        points,
        // The controller's view is the same curve, d later
        ghost: `translate(${(sim.delay * g.msPx).toFixed(2)} 0)`,
        marks,
        fall,
    };
}

export type ScopeNodes = {
    trace: Element;
    ghost: Element;
    marks: Element;
    fall: Element;
};

export function scopeNodes(root: SVGSVGElement): ScopeNodes {
    return {
        trace: pick(root, "trace"),
        ghost: pick(root, "ghostTrace"),
        marks: pick(root, "marks"),
        fall: pick(root, "fall"),
    };
}

export function applyScope(n: ScopeNodes, f: ScopeFrame) {
    set(n.trace, "points", f.points);
    set(n.ghost, "transform", f.ghost);
    set(n.marks, "d", f.marks);
    set(n.fall, "d", f.fall);
}
