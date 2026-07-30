import { createFileRoute } from "@tanstack/react-router";
import { TalentWorkspace } from "@/features/talent-matcher/components/talent-workspace";

export const Route = createFileRoute("/talent/")({
  head: () => ({
    meta: [
      { title: "AI Talent Matcher — TalentAI Enterprise" },
      {
        name: "description",
        content: "Chat with your workforce data to find the best-matching employee for any role, project or RFP.",
      },
      { property: "og:title", content: "AI Talent Matcher — TalentAI Enterprise" },
      {
        property: "og:description",
        content: "Explainable candidate ranking from synced GitHub, Jira, ClickUp and HR data.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <TalentWorkspace />,
});