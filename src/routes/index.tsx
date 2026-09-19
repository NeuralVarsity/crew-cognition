import { createFileRoute } from "@tanstack/react-router";
import { ExecutiveDashboard } from "@/features/dashboard/executive-dashboard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI Workforce Command Center — TalentAI Enterprise" },
      {
        name: "description",
        content:
          "Real-time AI workforce intelligence for talent, delivery, organizational risk, skills, hiring and capacity decisions.",
      },
      { property: "og:title", content: "AI Workforce Command Center — TalentAI Enterprise" },
      { property: "og:description", content: "An AI operating system for workforce intelligence and executive decisions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ExecutiveDashboard,
});
