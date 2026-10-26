import type { Metadata } from "next";

import { href, section, type Section } from "@/components/siteData";

export const description =
    "McMaster Low Latency Labs. A deadline is a correctness condition.";

// The preview card, built by og.png/route.tsx
export const OG_IMAGE = {
    url: "/og.png",
    width: 1200,
    height: 630,
    alt: "ML³ Labs: McMaster Low Latency Labs. A deadline is a correctness condition.",
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
    siteName: "ML³ Labs",
    description,
    images: OG_IMAGE,
    locale: "en_US",
} as const;

// Without its own canonical and og:url, a section page would inherit the
// root's "/" and tell crawlers it is a copy of the landing page
export function sectionMetadata(slug: Section["slug"]): Metadata {
    const { title } = section(slug);
    const url = href(slug);
    // The tab title gets " · ML³ Labs" from the (site) layout's template;
    // og and twitter titles are not templated, so they carry it themselves
    const full = `${title} · ML³ Labs`;
    return {
        title,
        alternates: { canonical: url },
        openGraph: { ...openGraph, url, title: full },
        twitter: { ...twitter, title: full },
    };
}
