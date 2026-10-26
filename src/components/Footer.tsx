import { Arrow } from "./Button";
import styles from "./Footer.module.css";
import { Crosses, VRule } from "./Grid";
import { Mark, Name } from "./Mark";
import { CONTACTS } from "./siteData";

// Outside the diagram: the deadline stops at the footer's rule, on a
// maroon + mark
export function Footer() {
    return (
        <footer className={styles.footer}>
            <Crosses />
            <VRule />
            <div className={styles.brand}>
                <Mark className={styles.mark} />
                <Name />
            </div>
            <p className={styles.note}>
                Student-run. Not an official McMaster University entity.
            </p>
            <ul className={styles.links} aria-label="Contact">
                {CONTACTS.map((c) => (
                    <li key={c.href}>
                        <a className={styles.link} href={c.href}>
                            {c.label}
                            <Arrow up />
                        </a>
                    </li>
                ))}
            </ul>
        </footer>
    );
}
