import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/server-error")({
  head: () => ({
    meta: [
      { title: "Server error — TalentAI Enterprise" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ServerError,
});

function ServerError() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-24 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h1 className="mt-4 text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        We hit an unexpected error. Our team has been notified — please try again shortly.
      </p>
      <Button asChild className="mt-6">
        <Link to="/">Back to dashboard</Link>
      </Button>
    </div>
  );
}