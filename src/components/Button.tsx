import Link from "next/link";
import type { ReactNode } from "react";

import styles from "./Button.module.css";

// Up-right for links that leave the site, right for the rest
export function Arrow({ up = false }: { up?: boolean }) {
    return up ? (
        <svg className={styles.arrowUp} viewBox="0 0 10 10" aria-hidden="true">
            <path
                d="M1.5 8.5 8.5 1.5M3 1.5h5.5V7"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.25"
            />
        </svg>
    ) : (
        <svg className={styles.arrow} viewBox="0 0 14 10" aria-hidden="true">
            <path
                d="M0 5h12.5M8.5 1l4 4-4 4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.25"
            />
        </svg>
    );
}

type Props = {
    href: string;
    children: ReactNode;
    primary?: boolean;
    small?: boolean;
    className?: string;
    "aria-current"?: "page";
};

export function ButtonLink({
    href,
    children,
    primary = false,
    small = false,
    className,
    ...rest
}: Props) {
    // mailto: too, or next/link would try to route to it
    const external = /^(https?|mailto):/.test(href);
    const cls = [
        styles.btn,
        primary && styles.primary,
        small && styles.small,
        className,
    ]
        .filter(Boolean)
        .join(" ");
    const content = (
        <>
            {children}
            <Arrow up={external} />
        </>
    );

    return external ? (
        <a href={href} className={cls} {...rest}>
            {content}
        </a>
    ) : (
        <Link href={href} className={cls} {...rest}>
            {content}
        </Link>
    );
}
