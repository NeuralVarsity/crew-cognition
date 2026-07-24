import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { PlaceholderPage } from "@/components/common/placeholder-page";

export const Route = createFileRoute("/employees")({
  head: () => ({
    meta: [
      { title: "Employees — TalentAI Enterprise" },
      {
        name: "description",
        content: "Directory of employees, roles, and performance signals.",
      },
      { property: "og:title", content: "Employees — TalentAI" },
      { property: "og:description", content: "Employee directory and performance signals." },
    ],
  }),
  component: () => (
    <PlaceholderPage
      icon={Users}
      title="Employees"
      description="Central directory of people, roles, skills, and performance signals."
      features={[
        { title: "Directory", description: "Searchable list of every employee across departments." },
        { title: "Profiles", description: "Detailed profiles with role history and skills." },
        { title: "Performance", description: "AI-scored performance and productivity trends." },
      ]}
    />
  ),
});