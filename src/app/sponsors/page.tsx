import { SectionPage } from "@/components/SectionPage";
import { EMAIL } from "@/components/siteData";

import { sectionMetadata } from "../shared-metadata";

export const metadata = sectionMetadata("sponsors");

export default function SponsorsPage() {
    // The landing page's calls to action lead here, so until the page has
    // content it still offers a way to reach the club
    return (
        <SectionPage
            slug="sponsors"
            links={[{ label: "Email us", href: `mailto:${EMAIL}` }]}
        />
    );
}
