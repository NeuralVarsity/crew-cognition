import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <Card className="flex flex-col items-center justify-center gap-3 border-dashed p-10 text-center">
      {Icon && (
        <div className="grid h-12 w-12 place-items-center rounded-full bg-accent text-accent-foreground">
          <Icon className="h-5 w-5" />
        </div>
      )}
      <div>
        <h3 className="text-base font-medium">{title}</h3>
        {description && (
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </Card>
  );
}