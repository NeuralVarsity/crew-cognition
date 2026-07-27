import { createFileRoute } from "@tanstack/react-router";
import { ClickUpModule } from "@/features/clickup/components/ClickUpModule";

export const Route = createFileRoute("/clickup")({
  validateSearch: (search: Record<string, unknown>) => ({
    connected: typeof search.connected === "string" ? search.connected : undefined,
    error: typeof search.error === "string" ? search.error : undefined,
  }),
  head: () => ({
    meta: [
      { title: "ClickUp — TalentAI Enterprise" },
      { name: "description", content: "Connect ClickUp to analyze task execution." },
      { property: "og:title", content: "ClickUp Integration — TalentAI" },
      { property: "og:description", content: "Task execution insights from ClickUp." },
    ],
  }),
  component: ClickUpModule,
});