import { createFileRoute } from "@tanstack/react-router";
import { ExcelUploadModule } from "@/features/excel-upload/components/ExcelUploadModule";

export const Route = createFileRoute("/excel-upload")({
  head: () => ({
    meta: [
      { title: "Excel & CSV Data Import — TalentAI Enterprise" },
      {
        name: "description",
        content:
          "Upload Excel or CSV files, auto-map columns, validate records and import workforce data with a full audit trail.",
      },
      { property: "og:title", content: "Excel & CSV Data Import — TalentAI" },
      {
        property: "og:description",
        content: "Validate, map and import workforce data from Excel or CSV at enterprise scale.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ExcelUploadModule,
});