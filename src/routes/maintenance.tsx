import { createFileRoute } from "@tanstack/react-router";
import { Wrench } from "lucide-react";

export const Route = createFileRoute("/maintenance")({
  head: () => ({
    meta: [
      { title: "Under maintenance — TalentAI Enterprise" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Maintenance,
});

function Maintenance() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-24 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-accent text-accent-foreground">
        <Wrench className="h-6 w-6" />
      </div>
      <h1 className="mt-4 text-2xl font-semibold">We'll be right back</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        TalentAI is undergoing scheduled maintenance. Please check back in a few minutes.
      </p>
    </div>
  );
}