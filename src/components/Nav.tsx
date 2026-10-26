"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";

import { ButtonLink } from "./Button";
import { Crosses, VRule } from "./Grid";
import { Mark, Name } from "./Mark";
import styles from "./Nav.module.css";
import { SECTIONS, href } from "./siteData";

export function Nav() {
    // null on the landing page, else the section's folder, e.g. "team"
    const segment = useSelectedLayoutSegment();
    const links = SECTIONS.slice(0, -1);
    const cta = SECTIONS[SECTIONS.length - 1];
    const current = (slug: string) => (segment === slug ? "page" : undefined);

    return (
        <header className={styles.header}>
            <VRule />
            <nav aria-label="Main" className={styles.navRow}>
                <Link
                    href="/"
                    className={styles.brand}
                    aria-current={segment === null ? "page" : undefined}
                >
                    <Mark className={styles.brandMark} />
                    <Name />
                </Link>
                <div className={styles.linksWrap}>
                    {/* The links get their own rule on phones only */}
                    <span className={styles.linksCrosses}>
                        <Crosses c={false} d={false} />
                    </span>
                    <ul>
                        {links.map((l) => (
                            <li key={l.slug}>
                                <Link
                                    href={href(l.slug)}
                                    className={styles.navLink}
                                    aria-current={current(l.slug)}
                                >
                                    {l.title}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
                <ButtonLink
                    href={href(cta.slug)}
                    primary
                    small
                    className={styles.navCta}
                    aria-current={current(cta.slug)}
                >
                    {cta.title}
                </ButtonLink>
            </nav>
        </header>
    );
}
