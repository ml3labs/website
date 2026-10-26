import type { Metadata, Viewport } from "next";

import "./globals.css";

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
};

export const metadata: Metadata = {
    title: "ML³ Labs",
    description: "McMaster Low Latency Labs",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
    return (
        <html lang="en">
            <body className="antialiased">{children}</body>
        </html>
    );
}
