/** Client-safe types for analytical (non-ranking) AI Workspace answers. */

export type InsightKind =
  | "leaderboard"
  | "burnout"
  | "attrition"
  | "promotion"
  | "availability"
  | "skill"
  | "compare";

export type InsightTone = "default" | "success" | "warning" | "danger" | "muted";

export type InsightBadge = { label: string; tone: InsightTone };

export type InsightPerson = {
  employeeId: string;
  name: string;
  designation: string | null;
  department: string | null;
  team: string | null;
  photo: string | null;
  rank: number;
  value: number;
  valueLabel: string;
  headline: string;
  badges: InsightBadge[];
  metrics: { label: string; value: string }[];
  evidence: string[];
};

export type InsightComparison = {
  names: string[];
  rows: { label: string; values: number[]; max: number; unit?: string }[];
};

export type InsightResult = {
  kind: InsightKind;
  generatedAt: string;
  query: string;
  title: string;
  subtitle: string;
  metricLabel: string;
  metricUnit: string;
  poolSize: number;
  people: InsightPerson[];
  chart: { label: string; value: number }[];
  comparison: InsightComparison | null;
  notes: string[];
};
