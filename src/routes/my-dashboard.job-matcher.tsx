import { createFileRoute } from "@tanstack/react-router";
import { JobMatcher } from "@/features/talent-matcher/components/job-matcher";

export const Route = createFileRoute("/my-dashboard/job-matcher")({
  head: () => ({
    meta: [
      { title: "Job & RFP matcher — TalentAI Enterprise" },
      { name: "description", content: "Upload a job description or RFP and instantly rank every employee by real fit." },
      { property: "og:title", content: "Job & RFP matcher — TalentAI Enterprise" },
      { property: "og:description", content: "Automatic requirement extraction and explainable employee ranking." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: JobMatcher,
});