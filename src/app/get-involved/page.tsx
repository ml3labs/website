import { SectionPage } from "@/components/SectionPage";
import { EMAIL } from "@/components/siteData";

import { sectionMetadata } from "../shared-metadata";

export const metadata = sectionMetadata("get-involved");

export default function GetInvolvedPage() {
    return (
        <SectionPage
            slug="get-involved"
            caption="Interest form coming soon. Questions? Email us."
            label="Join ML³"
            headline={{ text: "Interest form coming soon." }}
            links={[{ label: "Email us", href: `mailto:${EMAIL}` }]}
        />
    );
}
