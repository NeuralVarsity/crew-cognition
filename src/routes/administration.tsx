import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { PlaceholderPage } from "@/components/common/placeholder-page";

export const Route = createFileRoute("/administration")({
  head: () => ({
    meta: [
      { title: "Administration — TalentAI Enterprise" },
      { name: "description", content: "Roles, permissions, audit logs, and governance." },
      { property: "og:title", content: "Administration — TalentAI" },
      { property: "og:description", content: "Roles, permissions, and governance." },
    ],
  }),
  component: () => (
    <PlaceholderPage
      icon={ShieldCheck}
      title="Administration"
      description="Roles, permissions, audit logs, and enterprise governance controls."
      features={[
        { title: "Roles & permissions", description: "Fine-grained access control per module." },
        { title: "Audit logs", description: "Traceable activity across the workspace." },
        { title: "Compliance", description: "SSO, SCIM, and retention policies." },
      ]}
    />
  ),
});