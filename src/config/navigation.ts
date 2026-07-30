import {
  LayoutDashboard,
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
  group: "Workspace" | "Integrations" | "Insights" | "System";
  badge?: string;
};

export const navigation: NavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, group: "Workspace" },
  { title: "Employees", url: "/employees", icon: Users, group: "Workspace" },
  { title: "Teams", url: "/teams", icon: UsersRound, group: "Workspace" },
  { title: "Departments", url: "/departments", icon: Building2, group: "Workspace" },
  { title: "Projects", url: "/projects", icon: FolderKanban, group: "Workspace" },

  { title: "GitHub", url: "/github", icon: Github, group: "Integrations" },
  { title: "Jira", url: "/jira", icon: ClipboardList, group: "Integrations" },
  { title: "ClickUp", url: "/clickup", icon: ListChecks, group: "Integrations" },
  { title: "Excel Upload", url: "/excel-upload", icon: FileSpreadsheet, group: "Integrations" },

  { title: "AI Intelligence", url: "/ai-intelligence", icon: Brain, group: "Insights" },
  { title: "My Dashboard", url: "/my-dashboard", icon: Sparkles, group: "Insights" },
  { title: "Analytics", url: "/analytics", icon: BarChart3, group: "Insights", badge: "Soon" },
  { title: "Reports", url: "/reports", icon: FileText, group: "Insights", badge: "Soon" },
  { title: "Notifications", url: "/notifications", icon: Bell, group: "Insights" },

  { title: "Settings", url: "/settings", icon: Settings, group: "System" },
  { title: "Administration", url: "/administration", icon: ShieldCheck, group: "System" },
];

export const navGroups: NavItem["group"][] = [
  "Workspace",
  "Integrations",
  "Insights",
  "System",
];