import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList } from "lucide-react";
import { PlaceholderPage } from "@/components/common/placeholder-page";

export const Route = createFileRoute("/jira")({
  head: () => ({
    meta: [
      { title: "Jira — TalentAI Enterprise" },
      { name: "description", content: "Connect Jira to analyze delivery and workflow metrics." },
      { property: "og:title", content: "Jira Integration — TalentAI" },
      { property: "og:description", content: "Delivery and workflow metrics from Jira." },
    ],
  }),
  component: () => (
    <PlaceholderPage
      icon={ClipboardList}
      title="Jira"
      description="Connect Jira projects for issue flow, cycle time, and sprint execution insights."
      status="Integration pending"
    />
  ),
});