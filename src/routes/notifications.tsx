import { createFileRoute } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { PlaceholderPage } from "@/components/common/placeholder-page";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — TalentAI Enterprise" },
      { name: "description", content: "Alerts, digests, and system notifications." },
      { property: "og:title", content: "Notifications — TalentAI" },
      { property: "og:description", content: "Alerts and digests." },
    ],
  }),
  component: () => (
    <PlaceholderPage
      icon={Bell}
      title="Notifications"
      description="Configurable alerts, digests, and audit notifications for your organization."
    />
  ),
});