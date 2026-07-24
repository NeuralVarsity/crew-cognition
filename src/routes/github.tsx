import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { GithubModule } from "@/features/github/components/GithubModule";

export const Route = createFileRoute("/github")({
  validateSearch: z.object({
    connected: z.string().optional(),
    error: z.string().optional(),
  }),
  head: () => ({
    meta: [
      { title: "GitHub — TalentAI Enterprise" },
      { name: "description", content: "Connect GitHub to analyze engineering performance." },
      { property: "og:title", content: "GitHub Integration — TalentAI" },
      { property: "og:description", content: "Analyze engineering performance from GitHub." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GithubModule,
});