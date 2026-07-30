import { createFileRoute } from "@tanstack/react-router";
import { TalentWorkspace } from "@/features/talent-matcher/components/talent-workspace";

export const Route = createFileRoute("/workspace/chat/$threadId")({
  head: () => ({
    meta: [
      { title: "AI Workspace conversation — TalentAI Enterprise" },
      {
        name: "description",
        content: "Saved AI Workspace conversation with ranked employees, leaderboards and evidence-backed analysis.",
      },
      { property: "og:title", content: "AI Workspace conversation — TalentAI Enterprise" },
      {
        property: "og:description",
        content: "Answers explained from GitHub, Jira, ClickUp and HR evidence.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ChatThreadPage,
});

function ChatThreadPage() {
  const { threadId } = Route.useParams();
  return <TalentWorkspace threadId={threadId} />;
}
