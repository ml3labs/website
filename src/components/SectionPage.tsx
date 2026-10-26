import { ButtonLink } from "./Button";
import { Crosses, VRule } from "./Grid";
import styles from "./SectionPage.module.css";
import { SECTIONS, type Section } from "./siteData";
import { TimingStrip, type Variant } from "./TimingStrip";

const two = (n: number) => String(n).padStart(2, "0");

type FrameProps = {
    number: string; // in the label column, beside the title
    title: string;
    line: string; // under the status row's headline
    variant?: Variant;
    caption?: string; // under the strip
    // The status row: its label, its headline (a link when it has an href)
    // and any links under the line
    label?: string;
    headline?: { text: string; href?: string };
    links?: readonly { label: string; href: string }[];
};

// A page with little to show yet: its number and title, a timing strip,
// and a status row. The defaults are a page with no content, which says so.
export function PageFrame({
    number,
    title,
    line,
    variant = "empty",
    caption = "No request yet, so ACK is undefined.",
    label = "Status",
    headline = { text: "Nothing here yet." },
    links = [],
}: FrameProps) {
    return (
        <>
            <section className={styles.head} aria-labelledby="page-title">
                <Crosses />
                <VRule />
                <p className={styles.label}>{number}</p>
                <h1 id="page-title" className={styles.title}>
                    {title}
                </h1>
            </section>

            <TimingStrip variant={variant} fig="Fig. 1" caption={caption} />

            <div className={styles.status}>
                <Crosses />
                <VRule />
                <p className={styles.label}>{label}</p>
                <div className={styles.body}>
                    {headline.href ? (
                        <a
                            className={`${styles.statusTitle} ${styles.headlineLink}`}
                            href={headline.href}
                        >
                            {headline.text}
                        </a>
                    ) : (
                        <p className={styles.statusTitle}>{headline.text}</p>
                    )}
                    <p className={styles.statusLine}>{line}</p>
                    {links.length > 0 && (
                        <div className={styles.actions}>
                            {links.map((l) => (
                                <ButtonLink key={l.href} href={l.href}>
                                    {l.label}
                                </ButtonLink>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

// A nav page: numbered by its place in the nav, with its title and line
// from siteData. A page with something to say passes its own status row.
export function SectionPage({
    slug,
    ...rest
}: { slug: Section["slug"] } & Omit<FrameProps, "number" | "title" | "line">) {
    const i = SECTIONS.findIndex((s) => s.slug === slug);
    const page = SECTIONS[i];
    return (
        <PageFrame
            number={`${two(i + 1)} / ${two(SECTIONS.length)}`}
            title={page.title}
            line={page.line}
            {...rest}
        />
    );
}
