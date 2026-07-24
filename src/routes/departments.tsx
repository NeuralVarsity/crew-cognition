import { createFileRoute } from "@tanstack/react-router";
import { Building2 } from "lucide-react";
import { PlaceholderPage } from "@/components/common/placeholder-page";

export const Route = createFileRoute("/departments")({
  head: () => ({
    meta: [
      { title: "Departments — TalentAI Enterprise" },
      { name: "description", content: "Departmental structure and aggregated metrics." },
      { property: "og:title", content: "Departments — TalentAI" },
      { property: "og:description", content: "Departmental structure and metrics." },
    ],
  }),
  component: () => (
    <PlaceholderPage
      icon={Building2}
      title="Departments"
      description="Departmental structure with aggregated metrics and org-wide rollups."
    />
  ),
});