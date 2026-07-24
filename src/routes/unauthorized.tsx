import { createFileRoute, Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/unauthorized")({
  head: () => ({
    meta: [
      { title: "Unauthorized — TalentAI Enterprise" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Unauthorized,
});

function Unauthorized() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-24 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
        <Lock className="h-6 w-6" />
      </div>
      <h1 className="mt-4 text-2xl font-semibold">Access denied</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        You don't have permission to view this page. Contact your administrator if you
        believe this is a mistake.
      </p>
      <Button asChild className="mt-6">
        <Link to="/">Back to dashboard</Link>
      </Button>
    </div>
  );
}