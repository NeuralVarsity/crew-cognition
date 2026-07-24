import { createFileRoute } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { PlaceholderPage } from "@/components/common/placeholder-page";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports — TalentAI Enterprise" },
      { name: "description", content: "Scheduled and ad-hoc reports for stakeholders." },
      { property: "og:title", content: "Reports — TalentAI" },
      { property: "og:description", content: "Scheduled reports for stakeholders." },
    ],
  }),
  component: () => (
    <PlaceholderPage
      icon={FileText}
      title="Reports"
      description="Build, schedule, and export executive-ready reports across every module."
    />
  ),
});