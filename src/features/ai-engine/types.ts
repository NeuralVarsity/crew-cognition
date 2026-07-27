export const SUB_SCORE_KEYS = [
  "github",
  "jira",
  "clickup",
  "attendance",
  "project",
  "collaboration",
  "leadership",
  "learning",
  "consistency",
  "innovation",
  "communication",
  "quality",
  "delivery",
] as const;

export type SubScoreKey = (typeof SUB_SCORE_KEYS)[number];

export const SUB_SCORE_LABELS: Record<SubScoreKey, string> = {
  github: "GitHub",
  jira: "Jira",
  clickup: "ClickUp",
  attendance: "Attendance",
  project: "Project",
  collaboration: "Collaboration",
  leadership: "Leadership",
  learning: "Learning",
  consistency: "Consistency",
  innovation: "Innovation",
  communication: "Communication",
  quality: "Quality",
  delivery: "Delivery",
};

export type ScoreWeights = Record<SubScoreKey, number>;

/** Percentage weights. Must be editable from Admin Settings. */
export const DEFAULT_WEIGHTS: ScoreWeights = {
  github: 30,
  jira: 25,
  clickup: 20,
  attendance: 10,
  leadership: 5,
  communication: 5,
  learning: 5,
  project: 0,
  collaboration: 0,
  consistency: 0,
  innovation: 0,
  quality: 0,
  delivery: 0,
};

export type ScoreThresholds = {
  highPerformer: number;
  needsSupport: number;
  promotionReady: number;
  burnoutHours: number;
  inactiveDays: number;
  overdueRisk: number;
};

export const DEFAULT_THRESHOLDS: ScoreThresholds = {
  highPerformer: 75,
  needsSupport: 40,
  promotionReady: 80,
  burnoutHours: 45,
  inactiveDays: 10,
  overdueRisk: 3,
};

export type ScoreRules = {
  lookbackDays: number;
  minActivityForRanking: number;
  includeInactiveEmployees: boolean;
};

export const DEFAULT_RULES: ScoreRules = {
  lookbackDays: 90,
  minActivityForRanking: 1,
  includeInactiveEmployees: false,
};

export type AiSettings = {
  weights: ScoreWeights;
  thresholds: ScoreThresholds;
  rules: ScoreRules;
};

export const DEFAULT_AI_SETTINGS: AiSettings = {
  weights: DEFAULT_WEIGHTS,
  thresholds: DEFAULT_THRESHOLDS,
  rules: DEFAULT_RULES,
};

export type Productivity = {
  taskCompletionRate: number;
  commitFrequency: number;
  pullRequests: number;
  issueResolution: number;
  storyPoints: number;
  sprintContribution: number;
  trackedHours: number;
  avgCompletionHours: number;
  reviewActivity: number;
  repositoryContributions: number;
};

export type Consistency = {
  activeDays: number;
  dailyAverage: number;
  weeklyAverage: number;
  monthlyAverage: number;
  trend: number;
  weekly: { week: string; events: number }[];
};

export type Workload = {
  assigned: number;
  completed: number;
  overdue: number;
  capacity: number;
  burnoutRisk: RiskLevel;
  idleRisk: RiskLevel;
};

export type RiskLevel = "low" | "medium" | "high";

export type Prediction = {
  futureProductivity: number;
  promotionReadiness: number;
  attritionRisk: number;
  projectSuccess: number;
};

export type EmployeeScore = {
  id: string;
  name: string;
  email: string;
  designation: string | null;
  photo: string | null;
  departmentId: string | null;
  departmentName: string | null;
  teamId: string | null;
  teamName: string | null;
  managerId: string | null;
  managerName: string | null;
  status: string;
  overall: number;
  subScores: Record<SubScoreKey, number>;
  productivity: Productivity;
  consistency: Consistency;
  workload: Workload;
  prediction: Prediction;
  risks: { key: string; label: string; level: RiskLevel; detail: string }[];
  achievements: string[];
  growthAreas: string[];
  insights: string[];
  recommendations: string[];
  lastActiveAt: string | null;
  dataCoverage: { github: boolean; jira: boolean; clickup: boolean };
  orgRank: number;
  departmentRank: number;
  teamRank: number;
  history: { period: string; score: number }[];
};

export type GroupScore = {
  id: string;
  name: string;
  headcount: number;
  average: number;
  top: number;
  bottom: number;
  completionRate: number;
  rank: number;
};

export type LeaderboardEntry = {
  employeeId: string;
  name: string;
  photo: string | null;
  value: number;
  unit: string;
};

export type Leaderboard = {
  key: string;
  title: string;
  description: string;
  entries: LeaderboardEntry[];
};

export type AiIntelligence = {
  generatedAt: string;
  settings: AiSettings;
  canManage: boolean;
  selfEmployeeId: string | null;
  totals: {
    employees: number;
    scored: number;
    averageScore: number;
    overallProductivity: number;
    highPerformers: number;
    needsSupport: number;
    burnoutAlerts: number;
    inactive: number;
    promotionCandidates: number;
  };
  employees: EmployeeScore[];
  departments: GroupScore[];
  teams: GroupScore[];
  projects: GroupScore[];
  leaderboards: Leaderboard[];
  distribution: { bucket: string; count: number }[];
  trend: { week: string; events: number; activeEmployees: number }[];
  insights: { id: string; kind: "positive" | "neutral" | "warning"; text: string }[];
  recommendations: {
    promotion: LeaderboardEntry[];
    highPerformers: LeaderboardEntry[];
    needSupport: LeaderboardEntry[];
    training: { employeeId: string; name: string; detail: string }[];
    skillGaps: { employeeId: string; name: string; detail: string }[];
    projectAssignments: { employeeId: string; name: string; detail: string }[];
    potentialLeads: LeaderboardEntry[];
  };
  risks: { employeeId: string; name: string; key: string; label: string; level: RiskLevel; detail: string }[];
};