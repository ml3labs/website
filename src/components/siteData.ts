export const EMAIL = "contact@ml3labs.com";
export const LINKEDIN = "https://www.linkedin.com/company/ml3labs/";
export const GITHUB = "https://github.com/ml3labs";

// Every way to reach the club, in the order the footer and Contact list them
export const CONTACTS = [
    { label: EMAIL, href: `mailto:${EMAIL}` },
    { label: "LinkedIn", href: LINKEDIN },
    { label: "GitHub", href: GITHUB },
] as const;

export type Section = {
    slug: "projects" | "team" | "sponsors" | "contact" | "get-involved";
    title: string;
    // One line on what will go on the page once it has content
    line: string;
};

// Nav order. The last one is the nav's call to action.
export const SECTIONS: readonly Section[] = [
    {
        slug: "projects",
        title: "Projects",
        line: "Write-ups of what the club builds and measures will go here.",
    },
    {
        slug: "team",
        title: "Team",
        line: "The people who run the club will be listed here.",
    },
    {
        slug: "sponsors",
        title: "Sponsors",
        line: "Firms that support the club will be listed here.",
    },
    {
        slug: "contact",
        title: "Contact",
        line: "Email is the fastest way to reach us.",
    },
    {
        slug: "get-involved",
        title: "Get involved",
        line: "How to join, and what members work on, will go here.",
    },
];

// With a trailing slash, as next.config's trailingSlash exports them
export const href = (slug: Section["slug"]) => `/${slug}/`;

export function section(slug: Section["slug"]): Section {
    const found = SECTIONS.find((s) => s.slug === slug);
    if (!found) throw new Error(`No section ${slug}`);
    return found;
}
