import { createFileRoute } from "@tanstack/react-router";
import { EmployeeCompare } from "@/features/talent-matcher/components/employee-compare";

export const Route = createFileRoute("/workspace/compare")({
  head: () => ({
    meta: [
      { title: "Compare employees — TalentAI Enterprise" },
      { name: "description", content: "Compare two or more employees side by side on skills, delivery and availability." },
      { property: "og:title", content: "Compare employees — TalentAI Enterprise" },
      { property: "og:description", content: "Side-by-side employee scorecards from synced GitHub, Jira and ClickUp data." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EmployeeCompare,
});