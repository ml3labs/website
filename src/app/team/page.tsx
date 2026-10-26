import { SectionPage } from "@/components/SectionPage";

import { sectionMetadata } from "../shared-metadata";

export const metadata = sectionMetadata("team");

export default function TeamPage() {
    return <SectionPage slug="team" />;
}
