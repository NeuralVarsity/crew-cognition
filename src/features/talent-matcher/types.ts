export const MATCH_DIMENSIONS = [
  "skills",
  "github",
  "jira",
  "clickup",
  "experience",
  "projectRelevance",
  "collaboration",
  "learning",
  "communication",
  "leadership",
] as const;

export type MatchDimension = (typeof MATCH_DIMENSIONS)[number];

export const DIMENSION_LABELS: Record<MatchDimension, string> = {
  skills: "Skills",
  github: "GitHub",
  jira: "Jira",
  clickup: "ClickUp",
  experience: "Experience",
  projectRelevance: "Project relevance",
  collaboration: "Collaboration",
  learning: "Learning",
  communication: "Communication",
  leadership: "Leadership",
};

export type MatchWeights = Record<MatchDimension, number>;

export const DEFAULT_MATCH_WEIGHTS: MatchWeights = {
  skills: 30,
  github: 15,
  jira: 10,
  clickup: 10,
  experience: 10,
  projectRelevance: 10,
  collaboration: 5,
  learning: 3,
  communication: 3,
  leadership: 4,
};

export type MatchRules = {
  /** Candidates below this 0–10 score are excluded from recommendations. */
  minScore: number;
  /** How many ranked candidates to return. */
  topN: number;
  /** average = weighted mean, strict = weighted mean penalised by missing primary skills. */
  formula: "weighted_average" | "skill_first" | "balanced";
  includeInactive: boolean;
  lookbackDays: number;
};

export const DEFAULT_MATCH_RULES: MatchRules = {
  minScore: 0,
  topN: 10,
  formula: "weighted_average",
  includeInactive: false,
  lookbackDays: 90,
};

export type RoleTemplate = {
  id: string;
  name: string;
  primarySkills: string[];
  secondarySkills: string[];
  minYears: number;
};

export const DEFAULT_ROLE_TEMPLATES: RoleTemplate[] = [
  {
    id: "backend",
    name: "Backend Engineer",
    primarySkills: ["python", "fastapi", "django", "postgresql", "rest api"],
    secondarySkills: ["docker", "redis", "aws"],
    minYears: 3,
  },
  {
    id: "frontend",
    name: "Frontend Engineer",
    primarySkills: ["react", "typescript", "javascript", "css"],
    secondarySkills: ["next.js", "tailwind", "testing"],
    minYears: 2,
  },
  {
    id: "ai",
    name: "AI Engineer",
    primarySkills: ["python", "machine learning", "llm", "pytorch"],
    secondarySkills: ["langchain", "vector database", "nlp"],
    minYears: 3,
  },
  {
    id: "qa",
    name: "QA Engineer",
    primarySkills: ["testing", "automation", "selenium"],
    secondarySkills: ["cypress", "jest", "api testing"],
    minYears: 2,
  },
  {
    id: "devops",
    name: "DevOps Engineer",
    primarySkills: ["docker", "kubernetes", "ci/cd", "aws"],
    secondarySkills: ["terraform", "linux", "monitoring"],
    minYears: 3,
  },
  {
    id: "pm",
    name: "Project Manager",
    primarySkills: ["project management", "jira", "agile"],
    secondarySkills: ["scrum", "stakeholder management", "reporting"],
    minYears: 4,
  },
];

export type TalentSettings = {
  weights: MatchWeights;
  rules: MatchRules;
  roleTemplates: RoleTemplate[];
  skillCategories: Record<string, string[]>;
};

export const DEFAULT_TALENT_SETTINGS: TalentSettings = {
  weights: DEFAULT_MATCH_WEIGHTS,
  rules: DEFAULT_MATCH_RULES,
  roleTemplates: DEFAULT_ROLE_TEMPLATES,
  skillCategories: {},
};

/** Structured requirement extracted from a natural-language query or a document. */
export type RoleRequirement = {
  title: string;
  summary: string;
  seniority: string | null;
  minYears: number | null;
  primarySkills: string[];
  secondarySkills: string[];
  languages: string[];
  frameworks: string[];
  databases: string[];
  cloud: string[];
  devops: string[];
  aiSkills: string[];
  softSkills: string[];
  certifications: string[];
  domain: string | null;
  duration: string | null;
  employmentType: string | null;
  availability: string | null;
  leadershipRequired: boolean;
  department: string | null;
  team: string | null;
  teamRoles: string[];
  intent: "rank" | "compare" | "team" | "explain";
  extractedFrom: "query" | "document";
};

export type SkillEvidence = {
  skill: string;
  matched: boolean;
  weight: "primary" | "secondary";
  sources: string[];
  strength: number;
};

export type DimensionScore = {
  key: MatchDimension;
  label: string;
  score: number;
  weight: number;
  available: boolean;
  reasons: string[];
};

export type FitLabel = "Excellent Match" | "Strong Match" | "Good Match" | "Average Match" | "Weak Match";

export type CandidateMatch = {
  employeeId: string;
  name: string;
  email: string;
  photo: string | null;
  designation: string | null;
  department: string | null;
  team: string | null;
  manager: string | null;
  status: string;
  availability: { label: string; allocation: number; activeProjects: number };
  currentProjects: string[];
  yearsExperience: number;
  rank: number;
  overall: number;
  fit: FitLabel;
  recommendation: string;
  dimensions: DimensionScore[];
  skillEvidence: SkillEvidence[];
  matchedSkills: string[];
  missingSkills: string[];
  strengths: string[];
  weaknesses: string[];
  reasons: string[];
  dataCoverage: { github: boolean; jira: boolean; clickup: boolean; profile: boolean };
  metrics: {
    commits: number;
    mergedPrs: number;
    reviews: number;
    repositories: number;
    jiraResolved: number;
    storyPoints: number;
    sprints: number;
    clickupDone: number;
    clickupCompletionRate: number;
    trackedHours: number;
  };
};

export type SkillGap = {
  skill: string;
  coverage: number;
  bestCandidate: string | null;
  recommendation: string;
};

export type TeamSlot = {
  role: string;
  employeeId: string | null;
  name: string | null;
  score: number;
  reason: string;
};

export type ProjectPrediction = {
  successProbability: number;
  riskPercent: number;
  deliveryConfidence: number;
  resourceGap: number;
  skillGapPercent: number;
  budgetRisk: "low" | "medium" | "high";
  timelineRisk: "low" | "medium" | "high";
  notes: string[];
};

export type MatchResult = {
  generatedAt: string;
  query: string;
  sourceName: string | null;
  requirement: RoleRequirement;
  settings: TalentSettings;
  poolSize: number;
  candidates: CandidateMatch[];
  skillGaps: SkillGap[];
  team: TeamSlot[];
  prediction: ProjectPrediction;
  executiveSummary: string[];
};

export type RecommendationRecord = {
  id: string;
  kind: string;
  query: string;
  sourceName: string | null;
  requirements: RoleRequirement;
  results: CandidateMatch[];
  summary: {
    executiveSummary?: string[];
    skillGaps?: SkillGap[];
    prediction?: ProjectPrediction | null;
    team?: TeamSlot[];
  };
  candidateCount: number;
  topScore: number | null;
  userName: string | null;
  createdAt: string;
};

export type TalentThread = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export function fitLabel(score: number): FitLabel {
  if (score >= 9) return "Excellent Match";
  if (score >= 8) return "Strong Match";
  if (score >= 6.5) return "Good Match";
  if (score >= 5) return "Average Match";
  return "Weak Match";
}

export function recommendationLabel(rank: number, score: number): string {
  if (score < 5) return "Needs Training";
  if (rank === 1) return "Best Fit";
  if (rank === 2) return "Runner Up";
  if (rank <= 5) return "Strong Candidate";
  return "Consider";
}