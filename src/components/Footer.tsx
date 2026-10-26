import Link from "next/link";

import { Arrow } from "./Button";
import styles from "./Footer.module.css";
import { Crosses, VRule } from "./Grid";
import { Mark } from "./Mark";
import { PageLoad } from "./PageLoad";
import { CONTACTS, SECTIONS, href } from "./siteData";

// The build's year. The site is rebuilt on every deploy.
const YEAR = new Date().getFullYear();

// Outside the diagram: the deadline stops at the footer's rule, on a
// maroon + mark. Below it the mark, large, this page's load time, a
// column of pages and a column of ways to reach the club. Then the fine
// print.
export function Footer() {
    return (
        <footer className={styles.footer}>
            <div className={styles.top}>
                <Crosses />
                <VRule />
                <nav aria-labelledby="footer-pages" className={styles.pages}>
                    <p id="footer-pages" className={styles.colLabel}>
                        Pages
                    </p>
                    <ul className={styles.list}>
                        {SECTIONS.map((s) => (
                            <li key={s.slug}>
                                <Link
                                    href={href(s.slug)}
                                    className={styles.link}
                                >
                                    {s.title}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>
                <div className={styles.contact}>
                    <p id="footer-contact" className={styles.colLabel}>
                        Reach us
                    </p>
                    <ul
                        className={styles.list}
                        aria-labelledby="footer-contact"
                    >
                        {CONTACTS.map((c) => (
                            <li key={c.href}>
                                <a href={c.href} className={styles.link}>
                                    {c.label}
                                    <Arrow up />
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className={styles.timing}>
                    <p className={styles.colLabel}>Load time</p>
                    <PageLoad />
                </div>
                <Mark className={styles.mark} />
            </div>
            <div className={styles.base}>
                <Crosses c={false} d={false} />
                <p>© {YEAR} McMaster Low Latency Labs</p>
                <p>Student-run. Not an official McMaster University entity.</p>
            </div>
        </footer>
    );
}
