import { ButtonLink } from "./Button";
import { Crosses, VRule } from "./Grid";
import styles from "./SectionPage.module.css";
import { SECTIONS, type Section } from "./siteData";
import { TimingStrip } from "./TimingStrip";

const two = (n: number) => String(n).padStart(2, "0");

type Props = {
    slug: Section["slug"];
    // Under the strip
    caption?: string;
    // The status row: its label, its headline (a link when it has an href)
    // and any links under the page's line
    label?: string;
    headline?: { text: string; href?: string };
    links?: readonly { label: string; href: string }[];
};

// A nav page: its name, an undefined ACK, and a status row. The defaults
// are a page with no content yet, which says so and gives a line on what
// will go there; a page with something to say passes its own.
export function SectionPage({
    slug,
    caption = "No request yet, so ACK is undefined.",
    label = "Status",
    headline = { text: "Nothing here yet." },
    links = [],
}: Props) {
    const i = SECTIONS.findIndex((s) => s.slug === slug);
    const page = SECTIONS[i];

    return (
        <>
            <section className={styles.head} aria-labelledby="page-title">
                <Crosses />
                <VRule />
                <p className={styles.label}>
                    {two(i + 1)} / {two(SECTIONS.length)}
                </p>
                <h1 id="page-title" className={styles.title}>
                    {page.title}
                </h1>
            </section>

            <TimingStrip variant="empty" fig="Fig. 1" caption={caption} />

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
                    <p className={styles.statusLine}>{page.line}</p>
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
