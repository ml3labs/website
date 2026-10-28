// What the page's beacons carry, shared by the site's Tracker component and
// the Worker so the two can't drift apart

export const AREAS = ["nav", "page", "footer"] as const;
export type Area = (typeof AREAS)[number];

// One a page, as it is reached, and one a link click
export type VisitEvent =
    | { t: "page"; path: string; at: number }
    | { t: "link"; label: string; href: string; area: Area; at: number };

// How long a link's words and address may run
export const MAX_LABEL = 80;
export const MAX_HREF = 300;

// Browsers queue at most 64 KiB of beacons at a time, and 100 events at
// their longest stay under that
export const MAX_EVENTS = 100;
export const MAX_BODY = 65_536;

// A long visit keeps its first event, where it started, and the newest
export const keepEvents = <T>(list: T[]) =>
    list.length > MAX_EVENTS ? [list[0], ...list.slice(1 - MAX_EVENTS)] : list;
