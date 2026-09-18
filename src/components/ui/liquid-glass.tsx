import type { HTMLAttributes, ReactNode } from "react";
import {
  Bot,
  Folder,
  Gamepad2,
  Globe,
  Map,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type LiquidGlassProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function LiquidGlass({ children, className, ...props }: LiquidGlassProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border border-foreground/15 bg-background/45 shadow-lg backdrop-blur-2xl",
        "before:pointer-events-none before:absolute before:inset-0 before:bg-linear-to-br before:from-foreground/12 before:via-transparent before:to-background/10",
        "after:pointer-events-none after:absolute after:inset-px after:rounded-[calc(var(--radius-lg)-1px)] after:ring-1 after:ring-inset after:ring-foreground/8",
        className,
      )}
      {...props}
    >
      <div className="relative z-10">{children}</div>
    </div>
  );
}

type DockItem = {
  label: string;
  icon: LucideIcon;
  onSelect?: () => void;
};

const defaultItems: DockItem[] = [
  { label: "AI Workspace", icon: Bot },
  { label: "Files", icon: Folder },
  { label: "Messages", icon: MessageSquare },
  { label: "Workforce map", icon: Map },
  { label: "Integrations", icon: Globe },
  { label: "Scenarios", icon: Gamepad2 },
];

export function LiquidGlassDock({
  items = defaultItems,
  className,
}: {
  items?: DockItem[];
  className?: string;
}) {
  return (
    <LiquidGlass className={cn("max-w-full p-1.5 sm:p-2", className)}>
      <nav aria-label="Workspace dock" className="max-w-full overflow-x-auto overscroll-x-contain">
        <div className="flex w-max min-w-full items-end justify-start gap-1 sm:justify-center sm:gap-1.5">
          {items.map(({ label, icon: Icon, onSelect }) => (
            <Tooltip key={label}>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={label}
                  onClick={onSelect}
                  className="size-10 shrink-0 touch-manipulation rounded-md transition-transform duration-200 active:scale-95 sm:size-11 md:size-12 md:hover:-translate-y-1 md:hover:scale-110"
                >
                  <Icon className="size-5 sm:size-5.5 md:size-6" aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{label}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      </nav>
    </LiquidGlass>
  );
}