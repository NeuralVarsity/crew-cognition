import { createFileRoute } from "@tanstack/react-router";
import { FileSpreadsheet } from "lucide-react";
import { PlaceholderPage } from "@/components/common/placeholder-page";

export const Route = createFileRoute("/excel-upload")({
  head: () => ({
    meta: [
      { title: "Excel Upload — TalentAI Enterprise" },
      {
        name: "description",
        content: "Import employee, project, and performance data via Excel snapshots.",
      },
      { property: "og:title", content: "Excel Upload — TalentAI" },
      { property: "og:description", content: "Import data via Excel snapshots." },
    ],
  }),
  component: () => (
    <PlaceholderPage
      icon={FileSpreadsheet}
      title="Excel Upload"
      description="Bulk-import employees, teams, projects, and performance snapshots from Excel files."
      status="Uploader pending"
    />
  ),
});