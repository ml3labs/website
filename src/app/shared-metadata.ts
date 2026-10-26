import type { Metadata } from "next";

import { href, section, type Section } from "@/components/siteData";

export const SITE_NAME = "ML³ Labs";

export const description =
    "McMaster Low Latency Labs. A deadline is a correctness condition.";

// "Team · ML³ Labs", or the site name alone
export const titleFor = (title?: string) =>
    title ? `${title} · ${SITE_NAME}` : SITE_NAME;

// The preview card, built by og.png/route.tsx
export const OG_IMAGE = {
    url: "/og.png",
    width: 1200,
    height: 630,
    alt: `${SITE_NAME}: ${description}`,
} as const;

export const twitter = {
    card: "summary_large_image",
    description,
    images: OG_IMAGE,
} as const;

// A page that sets openGraph replaces the root's object rather than merging
// into it, so every page spreads these in
export const openGraph = {
    type: "website",
    siteName: SITE_NAME,
    description,
    images: OG_IMAGE,
    locale: "en_US",
} as const;

// A page's canonical URL and link-preview titles. Without its own
// canonical and og:url, a page would inherit the root's "/" and tell
// crawlers it is a copy of the landing page. The og and twitter titles
// are not templated like the tab title, so they carry the site name.
export function pageMetadata(url: string, title?: string): Metadata {
    const full = titleFor(title);
    return {
        alternates: { canonical: url },
        openGraph: { ...openGraph, url, title: full },
        twitter: { ...twitter, title: full },
    };
}

// The tab title gets the site name from the root layout's template
export function sectionMetadata(slug: Section["slug"]): Metadata {
    const { title } = section(slug);
    return { title, ...pageMetadata(href(slug), title) };
}
