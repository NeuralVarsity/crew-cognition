import type { LucideIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function IntelligencePlaceholder({ icon: Icon, title, description, actionLabel="Open AI Workspace", actionTo="/ai-workspace" }: { icon:LucideIcon; title:string; description:string; actionLabel?:string; actionTo?:"/ai-workspace"|"/workforce-intelligence"|"/ai-workspace/job-matcher"|"/administration" }) {
  return <div className="intelligence-panel grid min-h-[65dvh] place-items-center rounded-lg p-8"><div className="max-w-lg text-center"><div className="mx-auto grid size-12 place-items-center rounded-lg border border-primary/30 bg-primary/10"><Icon className="size-5 text-primary"/></div><p className="mt-6 text-xs font-semibold uppercase text-primary">TalentAI intelligence</p><h1 className="mt-2 text-3xl font-semibold">{title}</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p><Button asChild className="mt-6"><Link to={actionTo}>{actionLabel}<ArrowRight className="size-4"/></Link></Button></div></div>;
}