import { ButtonLink } from "./Button";
import styles from "./EmptySection.module.css";
import { Crosses, VRule } from "./Grid";
import { CONTACTS, EMAIL, SECTIONS, type Section } from "./siteData";
import { TimingStrip } from "./TimingStrip";

const two = (n: number) => String(n).padStart(2, "0");

// Every nav page until it has content: its name, an undefined ACK, and a
// line on what will go there. Contact is the exception: it already has its
// content, the ways to reach the club.
export function EmptySection({ slug }: { slug: Section["slug"] }) {
    const i = SECTIONS.findIndex((s) => s.slug === slug);
    const page = SECTIONS[i];
    const contact = slug === "contact";

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

            <TimingStrip
                variant="empty"
                fig="Fig. 1"
                caption={
                    contact
                        ? "No request yet. Send one."
                        : "No request yet, so ACK is undefined."
                }
            />

            <div className={styles.status}>
                <Crosses />
                <VRule />
                <p className={styles.label}>
                    {contact ? "Reach us" : "Status"}
                </p>
                <div className={styles.body}>
                    {contact ? (
                        <a
                            className={`${styles.statusTitle} ${styles.email}`}
                            href={`mailto:${EMAIL}`}
                        >
                            {EMAIL}
                        </a>
                    ) : (
                        <p className={styles.statusTitle}>Nothing here yet.</p>
                    )}
                    <p className={styles.statusLine}>{page.line}</p>
                    {contact && (
                        <div className={styles.actions}>
                            {CONTACTS.slice(1).map((c) => (
                                <ButtonLink key={c.href} href={c.href}>
                                    {c.label}
                                </ButtonLink>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
