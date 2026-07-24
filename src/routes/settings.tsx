import { createFileRoute } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import { PlaceholderPage } from "@/components/common/placeholder-page";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — TalentAI Enterprise" },
      { name: "description", content: "Workspace, profile, and preferences." },
      { property: "og:title", content: "Settings — TalentAI" },
      { property: "og:description", content: "Workspace and profile settings." },
    ],
  }),
  component: () => (
    <PlaceholderPage
      icon={Settings}
      title="Settings"
      description="Workspace configuration, profile, appearance, and integrations."
      features={[
        { title: "Profile", description: "Your account, avatar, and preferences." },
        { title: "Workspace", description: "Organization defaults and branding." },
        { title: "Integrations", description: "Manage connected data sources." },
      ]}
    />
  ),
});