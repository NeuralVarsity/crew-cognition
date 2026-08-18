/**
 * Role profiles: map a free-text role ask ("best AI Engineer", "application developer")
 * to the technical skill set it implies and to the designations that should rank first.
 * Everything here is deterministic — no model calls.
 */
export type RoleFamily = "engineering" | "data-ai" | "quality" | "product" | "design" | "devops";

export type RoleProfile = {
  key: string;
  label: string;
  family: RoleFamily;
  /** Phrases in the query that select this profile. */
  aliases: string[];
  primarySkills: string[];
  secondarySkills: string[];
  /** Designation keyword tiers — tier 0 is the ideal title, later tiers are acceptable. */
  titleTiers: string[][];
};

export const ROLE_PROFILES: RoleProfile[] = [
  {
    key: "ai-engineer",
    label: "AI Engineer",
    family: "data-ai",
    aliases: ["ai engineer", "genai engineer", "generative ai engineer", "llm engineer", "agentic ai engineer", "ai developer"],
    primarySkills: ["python", "llm", "langchain", "rag", "machine learning"],
    secondarySkills: ["pytorch", "tensorflow", "vector database", "openai", "prompt engineering", "fastapi", "mlops"],
    titleTiers: [
      ["ai engineer", "genai", "llm engineer", "generative ai"],
      ["ml engineer", "machine learning engineer"],
      ["data scientist", "research scientist"],
      ["python developer", "backend developer", "software engineer", "full stack developer"],
    ],
  },
  {
    key: "ml-engineer",
    label: "ML Engineer",
    family: "data-ai",
    aliases: ["ml engineer", "machine learning engineer", "mlops engineer", "deep learning engineer"],
    primarySkills: ["python", "machine learning", "pytorch", "tensorflow", "mlops"],
    secondarySkills: ["data science", "computer vision", "nlp", "aws", "docker"],
    titleTiers: [
      ["ml engineer", "machine learning engineer"],
      ["ai engineer", "genai", "generative ai"],
      ["data scientist"],
      ["python developer", "backend developer", "software engineer"],
    ],
  },
  {
    key: "data-scientist",
    label: "Data Scientist",
    family: "data-ai",
    aliases: ["data scientist", "data science", "ml scientist", "analytics scientist"],
    primarySkills: ["python", "data science", "machine learning", "sql"],
    secondarySkills: ["statistics", "pytorch", "tensorflow", "power bi", "nlp"],
    titleTiers: [
      ["data scientist"],
      ["ml engineer", "machine learning engineer", "ai engineer"],
      ["data analyst", "data engineer"],
      ["python developer", "software engineer"],
    ],
  },
  {
    key: "application-developer",
    label: "Application Developer",
    family: "engineering",
    aliases: [
      "application developer",
      "app developer",
      "application engineer",
      "software developer",
      "software engineer",
      "product engineer",
    ],
    primarySkills: ["javascript", "typescript", "react", "node.js", "rest api"],
    secondarySkills: ["python", "postgresql", "next.js", "docker", "aws", "microservices"],
    titleTiers: [
      ["full stack developer", "fullstack", "application developer", "software engineer"],
      ["backend developer", "backend engineer", "python developer", "node developer", "java developer"],
      ["frontend developer", "front end developer", "react developer", "ui engineer"],
      ["mobile developer", "android developer", "ios developer", "data engineer"],
    ],
  },
  {
    key: "full-stack",
    label: "Full Stack Developer",
    family: "engineering",
    aliases: ["full stack", "fullstack", "full-stack developer", "mern", "mean stack"],
    primarySkills: ["react", "typescript", "node.js", "postgresql", "rest api"],
    secondarySkills: ["next.js", "python", "docker", "aws", "graphql"],
    titleTiers: [
      ["full stack developer", "fullstack"],
      ["backend developer", "python developer", "node developer", "software engineer"],
      ["frontend developer", "react developer"],
      ["application developer", "data engineer"],
    ],
  },
  {
    key: "backend",
    label: "Backend Developer",
    family: "engineering",
    aliases: ["backend developer", "back end developer", "backend engineer", "api developer", "server side developer"],
    primarySkills: ["python", "node.js", "rest api", "postgresql"],
    secondarySkills: ["fastapi", "django", "microservices", "docker", "redis", "aws"],
    titleTiers: [
      ["backend developer", "backend engineer", "python developer", "node developer", "java developer"],
      ["full stack developer", "fullstack", "software engineer"],
      ["data engineer", "devops engineer"],
      ["frontend developer", "react developer"],
    ],
  },
  {
    key: "frontend",
    label: "Frontend Developer",
    family: "engineering",
    aliases: ["frontend developer", "front end developer", "front-end", "ui developer", "react developer"],
    primarySkills: ["react", "typescript", "javascript", "css"],
    secondarySkills: ["next.js", "tailwind", "graphql", "testing", "figma"],
    titleTiers: [
      ["frontend developer", "front end developer", "react developer", "ui engineer"],
      ["full stack developer", "fullstack"],
      ["software engineer", "application developer"],
      ["mobile developer"],
    ],
  },
  {
    key: "devops",
    label: "DevOps Engineer",
    family: "devops",
    aliases: ["devops", "sre", "site reliability", "platform engineer", "infrastructure engineer", "cloud engineer"],
    primarySkills: ["docker", "kubernetes", "ci/cd", "aws", "terraform"],
    secondarySkills: ["linux", "monitoring", "github actions", "nginx", "security"],
    titleTiers: [
      ["devops engineer", "sre", "platform engineer", "cloud engineer"],
      ["backend developer", "software engineer"],
      ["data engineer"],
      ["qa engineer"],
    ],
  },
  {
    key: "qa",
    label: "QA Engineer",
    family: "quality",
    aliases: ["qa engineer", "quality assurance", "test engineer", "sdet", "automation tester"],
    primarySkills: ["testing", "test automation", "selenium", "cypress"],
    secondarySkills: ["api testing", "jest", "performance testing", "ci/cd"],
    titleTiers: [
      ["qa engineer", "quality", "test engineer", "sdet"],
      ["automation engineer"],
      ["software engineer", "backend developer", "frontend developer"],
      ["product manager"],
    ],
  },
  {
    key: "product-manager",
    label: "Product Manager",
    family: "product",
    aliases: ["product manager", "product owner", "program manager", "project manager", "delivery manager"],
    primarySkills: ["project management", "agile", "stakeholder management"],
    secondarySkills: ["jira", "communication", "power bi", "leadership"],
    titleTiers: [
      ["product manager", "product owner", "program manager", "project manager"],
      ["engineering manager", "team lead", "delivery"],
      ["business analyst"],
      ["software engineer"],
    ],
  },
  {
    key: "designer",
    label: "Product Designer",
    family: "design",
    aliases: ["ui/ux", "ux designer", "ui designer", "product designer", "interaction designer"],
    primarySkills: ["figma", "ui design", "design systems"],
    secondarySkills: ["user research", "html", "css", "collaboration"],
    titleTiers: [
      ["designer", "ui/ux", "ux", "ui "],
      ["frontend developer", "react developer"],
      ["product manager"],
      ["software engineer"],
    ],
  },
];

const FAMILY_AFFINITY: Record<RoleFamily, RoleFamily[]> = {
  engineering: ["engineering", "data-ai", "devops"],
  "data-ai": ["data-ai", "engineering"],
  devops: ["devops", "engineering"],
  quality: ["quality", "engineering"],
  product: ["product"],
  design: ["design"],
};

/** Which profiles does this free-text ask refer to? Ordered by specificity. */
export function detectRoleProfiles(text: string): RoleProfile[] {
  const haystack = ` ${text.toLowerCase().replace(/[^a-z0-9+#./ -]/g, " ").replace(/\s+/g, " ")} `;
  const hits: { profile: RoleProfile; weight: number }[] = [];
  for (const profile of ROLE_PROFILES) {
    let best = 0;
    for (const alias of profile.aliases) {
      if (haystack.includes(` ${alias} `) || haystack.includes(` ${alias}s `) || haystack.includes(`${alias}`)) {
        best = Math.max(best, alias.split(" ").length);
      }
    }
    if (best > 0) hits.push({ profile, weight: best });
  }
  return hits.sort((a, b) => b.weight - a.weight).map((h) => h.profile);
}

export type RoleFitResult = {
  score: number; // 0–10
  tier: number | null;
  label: string;
  reason: string;
};

const TIER_SCORE = [10, 8.5, 6.5, 4.5];

/** How well does a designation fit the requested role? Used as a ranking gate. */
export function roleFit(designation: string | null, profiles: RoleProfile[], departmentName?: string | null): RoleFitResult {
  if (!profiles.length) {
    return { score: 7, tier: null, label: "No specific role requested", reason: "Ranking on skills and delivery evidence only." };
  }
  const title = ` ${(designation ?? "").toLowerCase()} `;
  let best: { score: number; tier: number; profile: RoleProfile } | null = null;

  for (const profile of profiles) {
    profile.titleTiers.forEach((tier, index) => {
      if (tier.some((keyword) => title.includes(keyword))) {
        const score = TIER_SCORE[index] ?? 4;
        if (!best || score > best.score) best = { score, tier: index, profile };
      }
    });
  }

  if (best) {
    const hit = best as { score: number; tier: number; profile: RoleProfile };
    const wording = ["exact role match", "adjacent engineering role", "related role", "transferable role"][hit.tier] ?? "related role";
    return {
      score: hit.score,
      tier: hit.tier,
      label: wording,
      reason: `${designation} is a ${wording} for ${hit.profile.label}.`,
    };
  }

  // No title overlap — fall back to department/family affinity so we never hard-zero a real engineer.
  const target = profiles[0];
  const dept = (departmentName ?? "").toLowerCase();
  const deptFamily: RoleFamily | null = /data|ai|ml/.test(dept)
    ? "data-ai"
    : /engineering|development|software|platform/.test(dept)
      ? "engineering"
      : /devops|infrastructure|cloud/.test(dept)
        ? "devops"
        : /quality|qa|test/.test(dept)
          ? "quality"
          : /product/.test(dept)
            ? "product"
            : /design/.test(dept)
              ? "design"
              : null;

  if (deptFamily && FAMILY_AFFINITY[target.family].includes(deptFamily)) {
    return {
      score: 3.5,
      tier: null,
      label: "different role, related department",
      reason: `${designation ?? "This employee"} sits in a related department but does not hold a ${target.label} title.`,
    };
  }

  return {
    score: 1,
    tier: null,
    label: "role mismatch",
    reason: `${designation ?? "This employee"} is outside the ${target.label} discipline.`,
  };
}

export function roleSkillSets(profiles: RoleProfile[]) {
  const primary = [...new Set(profiles.flatMap((p) => p.primarySkills))];
  const secondary = [...new Set(profiles.flatMap((p) => p.secondarySkills))].filter((s) => !primary.includes(s));
  return { primary, secondary };
}
