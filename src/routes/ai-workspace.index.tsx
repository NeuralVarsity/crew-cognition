import { createFileRoute } from "@tanstack/react-router";
import { TalentWorkspace } from "@/features/talent-matcher/components/talent-workspace";

export const Route = createFileRoute("/ai-workspace/")({
  head: () => ({
    meta: [
      { title: "AI Workspace — TalentAI Enterprise" },
      {
        name: "description",
        content:
          "Ask your workforce anything. The enterprise AI copilot answers from synchronized GitHub, Jira, ClickUp, Excel and AI Intelligence data.",
      },
      { property: "og:title", content: "AI Workspace — TalentAI Enterprise" },
      {
        property: "og:description",
        content: "Explainable talent recommendations, leaderboards and risk analysis from real delivery data.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <TalentWorkspace />,
});
