import { SectionPage } from "@/components/SectionPage";
import { CONTACTS, EMAIL } from "@/components/siteData";

import { sectionMetadata } from "../shared-metadata";

export const metadata = sectionMetadata("contact");

// The one nav page with content already: the email, then the other ways to
// reach the club
export default function ContactPage() {
    return (
        <SectionPage
            slug="contact"
            caption="No request yet. Send one."
            label="Reach us"
            headline={{ text: EMAIL, href: `mailto:${EMAIL}` }}
            links={CONTACTS.slice(1)}
        />
    );
}
