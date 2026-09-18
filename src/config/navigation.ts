import {
  Bot, BriefcaseBusiness, Building2, ChartNoAxesCombined, CircleGauge, ClipboardList,
  CreditCard, FileSearch, FileSpreadsheet, Flame, FolderKanban, Github, GraduationCap,
  KeyRound, LayoutDashboard, ListChecks, MessageSquare, Network, Radar, Search, Settings,
  UserCog, Users, UsersRound, type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  group: "Workforce" | "Hiring" | "Analytics" | "Integrations" | "Settings";
  badge?: string;
};

export const navigation: NavItem[] = [
  { title: "Executive Dashboard", url: "/", icon: LayoutDashboard, group: "Workforce" },
  { title: "Talent Intelligence", url: "/talent-intelligence", icon: Radar, group: "Workforce" },
  { title: "AI Workspace", url: "/ai-workspace", icon: Bot, group: "Workforce" },
  { title: "Employees", url: "/employees", icon: Users, group: "Workforce" },
  { title: "Teams", url: "/teams", icon: UsersRound, group: "Workforce" },
  { title: "Departments", url: "/departments", icon: Building2, group: "Workforce" },
  { title: "Projects", url: "/projects", icon: FolderKanban, group: "Workforce" },
  { title: "Job Matcher", url: "/ai-workspace/job-matcher", icon: BriefcaseBusiness, group: "Hiring" },
  { title: "People Compare", url: "/ai-workspace/compare", icon: UsersRound, group: "Hiring" },
  { title: "Candidate Search", url: "/candidate-search", icon: Search, group: "Hiring" },
  { title: "Hiring Pipeline", url: "/hiring-pipeline", icon: CircleGauge, group: "Hiring" },
  { title: "RFP Matcher", url: "/rfp-matcher", icon: FileSearch, group: "Hiring" },
  { title: "Workforce Analytics", url: "/workforce-intelligence", icon: ChartNoAxesCombined, group: "Analytics" },
  { title: "Burnout Risk", url: "/burnout-risk", icon: Flame, group: "Analytics" },
  { title: "Promotion Readiness", url: "/promotion-readiness", icon: GraduationCap, group: "Analytics" },
  { title: "Skills Intelligence", url: "/skills-intelligence", icon: Network, group: "Analytics" },
  { title: "GitHub", url: "/github", icon: Github, group: "Integrations" },
  { title: "Jira", url: "/jira", icon: ClipboardList, group: "Integrations" },
  { title: "ClickUp", url: "/clickup", icon: ListChecks, group: "Integrations" },
  { title: "Excel", url: "/excel-upload", icon: FileSpreadsheet, group: "Integrations" },
  { title: "Slack", url: "/slack", icon: MessageSquare, group: "Integrations", badge: "Soon" },
  { title: "Organization", url: "/settings", icon: Settings, group: "Settings" },
  { title: "Users", url: "/administration", icon: UserCog, group: "Settings" },
  { title: "Permissions", url: "/permissions", icon: KeyRound, group: "Settings" },
  { title: "Billing", url: "/billing", icon: CreditCard, group: "Settings" },
];

export const navGroups: NavItem["group"][] = ["Workforce", "Hiring", "Analytics", "Integrations", "Settings"];