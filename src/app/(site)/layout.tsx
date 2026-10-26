import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter_Tight } from "next/font/google";
import type { ReactNode } from "react";

import { Footer } from "@/components/Footer";
import { Late } from "@/components/Grid";
import { Nav } from "@/components/Nav";

import styles from "./layout.module.css";

// Inter Tight for the wordmark and text: a neo-grotesk with tight default
// spacing that holds up at 100px+. IBM Plex Mono for labels, figure
// captions and buttons, like a datasheet. Math is typeset by KaTeX (Tex).
const sans = Inter_Tight({
    subsets: ["latin"],
    variable: "--font-inter-tight",
    display: "swap",
});

const mono = IBM_Plex_Mono({
    subsets: ["latin"],
    weight: ["400", "500"],
    variable: "--font-plex-mono",
    display: "swap",
});

// Pages give a short title ("Team"); the landing page keeps the default
export const metadata: Metadata = {
    title: {
        default: "ML³ Labs",
        template: "%s · ML³ Labs",
    },
};

// The site's chrome: fonts, nav, the deadline line and the footer. The
// root layout stays bare, so a page outside this route group can bring its
// own.
export default function SiteLayout({ children }: { children: ReactNode }) {
    return (
        <div className={`${sans.variable} ${mono.variable} ${styles.root}`}>
            <a href="#main" className={styles.skip}>
                Skip to content
            </a>
            <div className={styles.frame}>
                <Nav />
                <main id="main" className={styles.main}>
                    <Late />
                    {children}
                </main>
                <Footer />
            </div>
        </div>
    );
}
