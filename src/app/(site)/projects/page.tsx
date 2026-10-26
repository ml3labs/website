import { EmptySection } from "@/components/EmptySection";

import { sectionMetadata } from "../../shared-metadata";

export const metadata = sectionMetadata("projects");

export default function ProjectsPage() {
    return <EmptySection slug="projects" />;
}
