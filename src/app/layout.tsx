import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Inter_Tight } from "next/font/google";

import { Footer } from "@/components/Footer";
import { Late } from "@/components/Grid";
import { Nav } from "@/components/Nav";
import { Tracker } from "@/components/Tracker";

import styles from "./layout.module.css";
import {
    SITE_NAME,
    description,
    openGraph,
    titleFor,
    twitter,
} from "./shared-metadata";

import "./globals.css";

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

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
};

// What every page shares. metadataBase turns relative metadata paths into
// the absolute URLs that link-preview crawlers need. Pages give a short
// title ("Team") and their own URL; the landing page keeps the default
// title.
export const metadata: Metadata = {
    metadataBase: new URL("https://ml3labs.com"),
    title: {
        default: SITE_NAME,
        template: titleFor("%s"),
    },
    description,
    openGraph,
    twitter,
};

// The site's chrome around every page, the 404 included: the fonts, the
// nav, the deadline down <main> and the footer
export default function RootLayout({ children }: LayoutProps<"/">) {
    return (
        <html lang="en">
            <body className="antialiased">
                <div
                    className={`${sans.variable} ${mono.variable} ${styles.root}`}
                >
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
                    <Tracker />
                </div>
            </body>
        </html>
    );
}
