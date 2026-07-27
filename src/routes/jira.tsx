import { createFileRoute } from "@tanstack/react-router";
import { JiraModule } from "@/features/jira";

export const Route = createFileRoute("/jira")({
  validateSearch: (search: Record<string, unknown>) => ({
    connected: typeof search.connected === "string" ? search.connected : undefined,
    error: typeof search.error === "string" ? search.error : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Jira — TalentAI Enterprise" },
      { name: "description", content: "Connect Jira to analyze delivery and workflow metrics." },
      { property: "og:title", content: "Jira Integration — TalentAI" },
      { property: "og:description", content: "Delivery and workflow metrics from Jira." },
    ],
  }),
  component: JiraModule,
});