import { createFileRoute } from "@tanstack/react-router";
import { AiIntelligenceModule } from "@/features/ai-engine/components/AiIntelligenceModule";

export const Route = createFileRoute("/ai-intelligence")({
  head: () => ({
    meta: [
      { title: "AI Intelligence — TalentAI Enterprise" },
      { name: "description", content: "Explainable AI workforce scores, insights, risks and predictions." },
      { property: "og:title", content: "AI Workforce Intelligence — TalentAI" },
      { property: "og:description", content: "AI scoring across GitHub, Jira, ClickUp and imported data." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AiIntelligenceModule,
});