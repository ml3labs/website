import type { Metadata } from "next";

import { PageFrame } from "@/components/SectionPage";
import { href } from "@/components/siteData";

export const metadata: Metadata = {
    title: "Page not found",
};

// Any URL with no page. The export writes it to 404.html, which GitHub
// Pages serves for every path it has no file for.
export default function NotFound() {
    return (
        <PageFrame
            number="404"
            title="Not found"
            variant="lost"
            caption="REQ goes up and stays up. No ACK ever comes."
            headline={{ text: "Nothing answers at this address." }}
            line="The link may be mistyped or out of date."
            links={[
                { label: "Home", href: "/" },
                { label: "Contact", href: href("contact") },
            ]}
        />
    );
}
