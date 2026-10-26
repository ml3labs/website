// The reduced-motion preference: read where an animation starts, or
// subscribed to by components that re-render when it changes.
const REDUCED = "(prefers-reduced-motion: reduce)";

export const prefersReducedMotion = () => window.matchMedia(REDUCED).matches;

export function subscribeReducedMotion(cb: () => void) {
    const mq = window.matchMedia(REDUCED);
    mq.addEventListener("change", cb);
    return () => mq.removeEventListener("change", cb);
}

// The hero's boot clock: the first tick 300 ms after load, then one every
// 120 ms. The sweep takes four ticks and ends the boot. Hero.tsx hands these
// to its CSS as --t0 and --tick ("Boot sequence" in Hero.module.css).
export const BOOT_T0_MS = 300;
export const BOOT_TICK_MS = 120;
export const BOOT_SWEEP_MS = 4 * BOOT_TICK_MS;
export const BOOT_END_MS = BOOT_T0_MS + BOOT_SWEEP_MS;
