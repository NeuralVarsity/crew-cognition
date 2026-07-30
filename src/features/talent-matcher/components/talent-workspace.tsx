import { Link, useNavigate } from "@tanstack/react-router";
import { BarChart3, Brain, FileUp, Github, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThreadSidebar } from "./thread-sidebar";
import { TalentChat } from "./talent-chat";

const SECONDARY_MODULES = [
  { label: "Executive Dashboard", to: "/executive-dashboard", icon: BarChart3 },
  { label: "AI Intelligence", to: "/ai-intelligence", icon: Brain },
  { label: "GitHub", to: "/github", icon: Github },
  { label: "Employees", to: "/employees", icon: Users },
] as const;

export function TalentWorkspace({ threadId }: { threadId?: string }) {
  const navigate = useNavigate();

  return (
    <div className="flex h-[calc(100dvh-8rem)] min-h-0 overflow-hidden rounded-xl border bg-background">
      <div className="hidden lg:block">
        <ThreadSidebar
          activeThreadId={threadId}
          onNewChat={() => navigate({ to: "/" })}
          onDeleted={(id) => {
            if (id === threadId) navigate({ to: "/" });
          }}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2">
          <div className="min-w-0">
            <h1 className="text-sm font-semibold">AI Workspace</h1>
            <p className="truncate text-xs text-muted-foreground">
              Ask first — answers computed from GitHub, Jira, ClickUp, Excel and AI Intelligence
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="hidden items-center gap-1 xl:flex">
              {SECONDARY_MODULES.map((module) => (
                <Button key={module.to} asChild variant="ghost" size="sm" className="text-muted-foreground">
                  <Link to={module.to}>
                    <module.icon className="mr-1.5 size-3.5" />
                    {module.label}
                  </Link>
                </Button>
              ))}
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/workspace/job-matcher">
                <FileUp className="mr-1.5 size-4" /> Job matcher
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/workspace/compare">
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
