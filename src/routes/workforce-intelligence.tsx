import { createFileRoute } from "@tanstack/react-router";
import { WorkforceIntelligenceModule } from "@/features/workforce-intelligence/components/WorkforceIntelligenceModule";

export const Route = createFileRoute("/workforce-intelligence")({
  head: () => ({
    meta: [
      { title: "Workforce Intelligence — TalentAI Enterprise" },
      {
        name: "description",
        content:
          "Workforce heatmap, capacity planning, skills coverage and gap analysis, bench strength, promotion readiness and workforce risk alerts.",
      },
      { property: "og:title", content: "Workforce Intelligence — TalentAI Enterprise" },
      {
        property: "og:description",
        content: "Capacity planning, skills coverage and workforce risk intelligence for enterprise teams.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WorkforceIntelligenceModule,
});
