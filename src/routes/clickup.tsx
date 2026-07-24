import { createFileRoute } from "@tanstack/react-router";
import { ListChecks } from "lucide-react";
import { PlaceholderPage } from "@/components/common/placeholder-page";

export const Route = createFileRoute("/clickup")({
  head: () => ({
    meta: [
      { title: "ClickUp — TalentAI Enterprise" },
      { name: "description", content: "Connect ClickUp to analyze task execution." },
      { property: "og:title", content: "ClickUp Integration — TalentAI" },
      { property: "og:description", content: "Task execution insights from ClickUp." },
    ],
  }),
  component: () => (
    <PlaceholderPage
      icon={ListChecks}
      title="ClickUp"
      description="Connect ClickUp spaces to track task execution, sprints, and workload."
      status="Integration pending"
    />
  ),
});