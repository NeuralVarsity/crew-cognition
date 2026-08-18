import {
  LayoutDashboard,
  MessagesSquare,
  Users,
  UsersRound,
  Building2,
  FolderKanban,
  Github,
  ClipboardList,
  ListChecks,
  FileSpreadsheet,
  BarChart3,
  Brain,
  Radar,
  Sparkles,
  FileText,
  Bell,
  Settings,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  group: "AI" | "Workspace" | "Integrations" | "Insights" | "System";
  badge?: string;
};

export const navigation: NavItem[] = [
  { title: "AI Workspace", url: "/", icon: MessagesSquare, group: "AI" },
  { title: "Job & RFP Matcher", url: "/workspace/job-matcher", icon: Sparkles, group: "AI" },
  { title: "Compare People", url: "/workspace/compare", icon: UsersRound, group: "AI" },

  { title: "Executive Dashboard", url: "/executive-dashboard", icon: LayoutDashboard, group: "Workspace" },
  { title: "Employees", url: "/employees", icon: Users, group: "Workspace" },
  { title: "Teams", url: "/teams", icon: UsersRound, group: "Workspace" },
  { title: "Departments", url: "/departments", icon: Building2, group: "Workspace" },
  { title: "Projects", url: "/projects", icon: FolderKanban, group: "Workspace" },

  { title: "GitHub", url: "/github", icon: Github, group: "Integrations" },
  { title: "Jira", url: "/jira", icon: ClipboardList, group: "Integrations" },
  { title: "ClickUp", url: "/clickup", icon: ListChecks, group: "Integrations" },
  { title: "Excel Upload", url: "/excel-upload", icon: FileSpreadsheet, group: "Integrations" },

  { title: "AI Intelligence", url: "/ai-intelligence", icon: Brain, group: "Insights" },
  { title: "Workforce Intelligence", url: "/workforce-intelligence", icon: Radar, group: "Insights" },
  { title: "Analytics", url: "/analytics", icon: BarChart3, group: "Insights", badge: "Soon" },
  { title: "Reports", url: "/reports", icon: FileText, group: "Insights", badge: "Soon" },
  { title: "Notifications", url: "/notifications", icon: Bell, group: "Insights" },

  { title: "Settings", url: "/settings", icon: Settings, group: "System" },
  { title: "Administration", url: "/administration", icon: ShieldCheck, group: "System" },
];

export const navGroups: NavItem["group"][] = [
  "AI",
  "Workspace",
  "Integrations",
  "Insights",
  "System",
];