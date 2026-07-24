import { createFileRoute } from "@tanstack/react-router";
import { FolderKanban } from "lucide-react";
import { PlaceholderPage } from "@/components/common/placeholder-page";

export const Route = createFileRoute("/projects")({
  head: () => ({
    meta: [
      { title: "Projects — TalentAI Enterprise" },
      { name: "description", content: "Project portfolio, execution metrics, and delivery risk." },
      { property: "og:title", content: "Projects — TalentAI" },
      { property: "og:description", content: "Project portfolio and delivery risk." },
    ],
  }),
  component: () => (
    <PlaceholderPage
      icon={FolderKanban}
      title="Projects"
      description="Portfolio of active projects with execution metrics and delivery risk."
    />
  ),
});