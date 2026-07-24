import { createFileRoute } from "@tanstack/react-router";
import { Github } from "lucide-react";
import { PlaceholderPage } from "@/components/common/placeholder-page";

export const Route = createFileRoute("/github")({
  head: () => ({
    meta: [
      { title: "GitHub — TalentAI Enterprise" },
      { name: "description", content: "Connect GitHub to analyze engineering performance." },
      { property: "og:title", content: "GitHub Integration — TalentAI" },
      { property: "og:description", content: "Analyze engineering performance from GitHub." },
    ],
  }),
  component: () => (
    <PlaceholderPage
      icon={Github}
      title="GitHub"
      description="Connect repositories to analyze commits, pull requests, reviews, and velocity."
      status="Integration pending"
    />
  ),
});