import type { LucideIcon } from "lucide-react";
import { Construction } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "./page-header";

export type PlaceholderFeature = { title: string; description: string };

export function PlaceholderPage({
  icon: Icon,
  title,
  description,
  status = "Coming soon",
  features = [],
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  status?: string;
  features?: PlaceholderFeature[];
}) {
  return (
    <div>
      <PageHeader
        title={title}
        description={description}
        actions={
          <Badge variant="secondary" className="gap-1.5">
            <Construction className="h-3 w-3" />
            {status}
          </Badge>
        }
      />

      <Card className="mb-6 overflow-hidden border-0 bg-gradient-to-br from-accent/60 via-background to-background">
        <CardContent className="flex items-center gap-4 p-6">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Icon className="h-7 w-7" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold">{title} module</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              This surface is scaffolded and ready to connect. Data, integrations,
              and workflows land in upcoming releases.
            </p>
          </div>
        </CardContent>
      </Card>

      {features.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card key={f.title}>
              <CardHeader>
                <CardTitle className="text-base">{f.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{f.description}</CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}