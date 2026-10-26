import { SectionPage } from "@/components/SectionPage";
import { EMAIL } from "@/components/siteData";

import { sectionMetadata } from "../shared-metadata";

export const metadata = sectionMetadata("get-involved");

export default function GetInvolvedPage() {
    // The landing page's calls to action lead here, so until the page has
    // content it still offers a way to reach the club
    return (
        <SectionPage
            slug="get-involved"
            links={[{ label: "Email us", href: `mailto:${EMAIL}` }]}
        />
    );
}
