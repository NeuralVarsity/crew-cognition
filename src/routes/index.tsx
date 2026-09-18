import { createFileRoute } from "@tanstack/react-router";
import { ExecutiveDashboard } from "@/features/dashboard/executive-dashboard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Executive Dashboard — TalentAI Enterprise" },
      {
        name: "description",
        content:
          "Top performers, promotion candidates, burnout risks, hiring recommendations and department productivity across your workforce.",
      },
      { property: "og:title", content: "Executive Dashboard — TalentAI Enterprise" },
      { property: "og:description", content: "Workforce intelligence overview for your organization." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ExecutiveDashboard,
});
