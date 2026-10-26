// The page's one requestAnimationFrame loop. The cart-pole, the timing
// strips clocking in and the hero's scrub run-out subscribe while they need
// frames, so at most one loop ever runs; when nobody needs one, it stops.
// The browser already pauses it in hidden tabs.

type FrameCallback = (now: number) => void;

const callbacks = new Set<FrameCallback>();
let handle = 0;

function run(now: number) {
    handle = 0;
    for (const cb of Array.from(callbacks)) cb(now);
    if (callbacks.size > 0 && handle === 0) {
        handle = requestAnimationFrame(run);
    }
}

// Returns the unsubscribe; calling it more than once is harmless
export function onFrame(cb: FrameCallback): () => void {
    callbacks.add(cb);
    if (handle === 0) handle = requestAnimationFrame(run);
    return () => {
        callbacks.delete(cb);
        if (callbacks.size === 0 && handle !== 0) {
            cancelAnimationFrame(handle);
            handle = 0;
        }
    };
}
