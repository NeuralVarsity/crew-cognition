import { createFileRoute } from "@tanstack/react-router";
import { UsersRound } from "lucide-react";
import { PlaceholderPage } from "@/components/common/placeholder-page";

export const Route = createFileRoute("/teams")({
  head: () => ({
    meta: [
      { title: "Teams — TalentAI Enterprise" },
      { name: "description", content: "Team composition, ownership, and health metrics." },
      { property: "og:title", content: "Teams — TalentAI" },
      { property: "og:description", content: "Team composition and health." },
    ],
  }),
  component: () => (
    <PlaceholderPage
      icon={UsersRound}
      title="Teams"
      description="Organize people into teams and track composition, ownership, and health."
    />
  ),
});