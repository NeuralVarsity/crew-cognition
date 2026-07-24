import { createFileRoute } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";
import { PlaceholderPage } from "@/components/common/placeholder-page";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — TalentAI Enterprise" },
      { name: "description", content: "Cross-source analytics on workforce performance." },
      { property: "og:title", content: "Analytics — TalentAI" },
      { property: "og:description", content: "Cross-source workforce analytics." },
    ],
  }),
  component: () => (
    <PlaceholderPage
      icon={BarChart3}
      title="Analytics"
      description="Cross-source dashboards, cohorts, and trend analysis for the entire workforce."
    />
  ),
});