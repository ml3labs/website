import { SectionPage } from "@/components/SectionPage";

import { sectionMetadata } from "../shared-metadata";

export const metadata = sectionMetadata("projects");

export default function ProjectsPage() {
    return <SectionPage slug="projects" />;
}
