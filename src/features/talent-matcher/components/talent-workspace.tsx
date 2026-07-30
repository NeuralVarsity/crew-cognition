import { useNavigate } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { FileUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThreadSidebar } from "./thread-sidebar";
import { TalentChat } from "./talent-chat";

export function TalentWorkspace({ threadId }: { threadId?: string }) {
  const navigate = useNavigate();

  return (
    <div className="flex h-[calc(100dvh-8rem)] min-h-0 overflow-hidden rounded-xl border bg-background">
      <div className="hidden lg:block">
        <ThreadSidebar
          activeThreadId={threadId}
          onNewChat={() => navigate({ to: "/my-dashboard" })}
          onDeleted={(id) => {
            if (id === threadId) navigate({ to: "/my-dashboard" });
          }}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-2 border-b px-4 py-2">
          <div>
            <h1 className="text-sm font-semibold">My Dashboard</h1>
            <p className="text-xs text-muted-foreground">Explainable rankings from synced delivery data</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/my-dashboard/job-matcher">
                <FileUp className="mr-1.5 size-4" /> Job matcher
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/my-dashboard/compare">
                <Users className="mr-1.5 size-4" /> Compare
              </Link>
            </Button>
          </div>
        </div>
        <TalentChat threadId={threadId} />
      </div>
    </div>
  );
}