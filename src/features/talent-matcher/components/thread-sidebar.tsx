import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { MessageSquare, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useThreadMutations, useTalentThreads } from "../hooks";
import type { TalentThread } from "../types";

export function ThreadSidebar({
  activeThreadId,
  onNewChat,
  onDeleted,
}: {
  activeThreadId?: string;
  onNewChat: () => void;
  onDeleted: (id: string) => void;
}) {
  const { data: threads = [], isPending } = useTalentThreads();
  const { rename, remove } = useThreadMutations();
  const [search, setSearch] = useState("");
  const [renaming, setRenaming] = useState<TalentThread | null>(null);
  const [title, setTitle] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? threads.filter((t) => t.title.toLowerCase().includes(q)) : threads;
  }, [threads, search]);

  return (
    <aside className="flex h-full w-full flex-col gap-3 border-r bg-card/40 p-3 lg:w-72">
      <Button onClick={onNewChat} className="w-full justify-start gap-2">
        <Plus className="size-4" /> New chat
      </Button>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search conversations"
          className="pl-8"
        />
      </div>

      <ScrollArea className="-mx-1 flex-1 px-1">
        <div className="space-y-1">
          {isPending ? <p className="px-2 py-4 text-xs text-muted-foreground">Loading…</p> : null}
          {!isPending && !filtered.length ? (
            <p className="px-2 py-4 text-xs text-muted-foreground">No conversations yet.</p>
          ) : null}
          {filtered.map((thread) => (
            <div
              key={thread.id}
              className={cn(
                "group flex items-center gap-1 rounded-md px-1 transition-colors hover:bg-accent",
                thread.id === activeThreadId && "bg-accent",
              )}
            >
              <Link
                to="/ai-workspace/chat/$threadId"
                params={{ threadId: thread.id }}
                className="flex min-w-0 flex-1 items-center gap-2 py-2 text-sm"
              >
                <MessageSquare className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{thread.title}</span>
              </Link>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Rename conversation"
                className="opacity-0 transition-opacity group-hover:opacity-100"
                onClick={() => {
                  setRenaming(thread);
                  setTitle(thread.title);
                }}
              >
                <Pencil className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Delete conversation"
                className="opacity-0 transition-opacity group-hover:opacity-100"
                onClick={() => remove.mutate(thread.id, { onSuccess: () => onDeleted(thread.id) })}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>

      <Dialog open={!!renaming} onOpenChange={(open) => !open && setRenaming(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename conversation</DialogTitle>
          </DialogHeader>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenaming(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (renaming && title.trim()) {
                  rename.mutate({ id: renaming.id, title: title.trim() });
                }
                setRenaming(null);
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}