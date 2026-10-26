import type { Metadata, Viewport } from "next";

import { description, openGraph, twitter } from "./shared-metadata";

import "./globals.css";

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
};

// metadataBase turns relative metadata paths into the absolute URLs that
// link-preview crawlers need
export const metadata: Metadata = {
    metadataBase: new URL("https://ml3labs.com"),
    title: "ML³ Labs",
    description,
    alternates: { canonical: "/" },
    openGraph: { ...openGraph, url: "/", title: "ML³ Labs" },
    twitter: { ...twitter, title: "ML³ Labs" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
    return (
        <html lang="en">
            <body className="antialiased">{children}</body>
        </html>
    );
}
