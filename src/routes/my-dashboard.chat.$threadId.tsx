import { createFileRoute } from "@tanstack/react-router";
import { TalentWorkspace } from "@/features/talent-matcher/components/talent-workspace";

export const Route = createFileRoute("/my-dashboard/chat/$threadId")({
  head: () => ({
    meta: [
      { title: "My Dashboard conversation — TalentAI Enterprise" },
      { name: "description", content: "Saved AI talent-matching conversation with ranked employee recommendations." },
      { property: "og:title", content: "My Dashboard conversation — TalentAI Enterprise" },
      { property: "og:description", content: "Ranked candidates explained from GitHub, Jira and ClickUp evidence." },
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