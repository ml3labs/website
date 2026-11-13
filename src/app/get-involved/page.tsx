import { SectionPage } from "@/components/SectionPage";
import { EMAIL, INTEREST_FORM_URL } from "@/components/siteData";

import { sectionMetadata } from "../shared-metadata";

export const metadata = sectionMetadata("get-involved");

export default function GetInvolvedPage() {
    return (
        <SectionPage
            slug="get-involved"
            caption="Get involved before the December 1 club application deadline."
            label="Join ML³"
            headline={{
                text: "Fill out the interest form.",
                href: INTEREST_FORM_URL || undefined,
            }}
            links={[{ label: "Email us", href: `mailto:${EMAIL}` }]}
        />
    );
}
