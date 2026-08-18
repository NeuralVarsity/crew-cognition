/** Canonical technology / skill dictionary used for deterministic extraction and matching. */
export type SkillDef = { canonical: string; category: SkillCategoryKey; aliases: string[] };

export type SkillCategoryKey =
  | "language"
  | "framework"
  | "database"
  | "cloud"
  | "devops"
  | "ai"
  | "testing"
  | "mobile"
  | "tooling"
  | "soft";

const def = (canonical: string, category: SkillCategoryKey, ...aliases: string[]): SkillDef => ({
  canonical,
  category,
  aliases,
});

export const SKILL_DICTIONARY: SkillDef[] = [
  def("python", "language", "py", "python3"),
  def("javascript", "language", "js", "es6", "ecmascript"),
  def("typescript", "language", "ts"),
  def("java", "language"),
  def("c#", "language", "csharp", ".net", "dotnet"),
  def("c++", "language", "cpp"),
  def("go", "language", "golang"),
  def("rust", "language"),
  def("php", "language"),
  def("ruby", "language"),
  def("kotlin", "language"),
  def("swift", "language"),
  def("scala", "language"),
  def("r", "language"),
  def("sql", "language", "sql analytics", "t-sql", "plsql"),
  def("html", "language", "html5"),
  def("css", "language", "css3", "scss", "sass"),
  def("shell", "language", "bash", "powershell"),

  def("react", "framework", "react.js", "reactjs"),
  def("next.js", "framework", "nextjs", "next js"),
  def("angular", "framework", "angularjs"),
  def("vue", "framework", "vue.js", "vuejs", "nuxt"),
  def("svelte", "framework", "sveltekit"),
  def("node.js", "framework", "nodejs", "node"),
  def("express", "framework", "express.js"),
  def("nestjs", "framework", "nest.js"),
  def("django", "framework"),
  def("flask", "framework"),
  def("fastapi", "framework", "fast api"),
  def("spring boot", "framework", "spring"),
  def("laravel", "framework"),
  def("rails", "framework", "ruby on rails"),
  def("graphql", "framework", "apollo"),
  def("rest api", "framework", "restful", "rest apis", "api development"),
  def("grpc", "framework"),
  def("tailwind", "framework", "tailwindcss"),
  def("microservices", "framework", "micro services"),

  def("postgresql", "database", "postgres", "psql"),
  def("mysql", "database", "mariadb"),
  def("mongodb", "database", "mongo"),
  def("redis", "database"),
  def("elasticsearch", "database", "opensearch"),
  def("sqlite", "database"),
  def("dynamodb", "database"),
  def("snowflake", "database"),
  def("bigquery", "database"),
  def("supabase", "database"),
  def("firebase", "database", "firestore"),
  def("vector database", "database", "pgvector", "pinecone", "weaviate", "chroma", "qdrant"),

  def("aws", "cloud", "amazon web services", "ec2", "s3", "lambda"),
  def("azure", "cloud", "microsoft azure"),
  def("gcp", "cloud", "google cloud", "google cloud platform"),
  def("cloudflare", "cloud", "workers"),
  def("vercel", "cloud"),

  def("docker", "devops", "containerization"),
  def("kubernetes", "devops", "k8s", "eks", "aks"),
  def("ci/cd", "devops", "cicd", "continuous integration", "continuous delivery"),
  def("terraform", "devops", "infrastructure as code", "iac"),
  def("ansible", "devops"),
  def("jenkins", "devops"),
  def("github actions", "devops", "gh actions"),
  def("linux", "devops", "unix"),
  def("monitoring", "devops", "prometheus", "grafana", "observability", "datadog"),
  def("nginx", "devops"),
  def("kafka", "devops", "rabbitmq", "message queue", "event streaming"),

  def("machine learning", "ai", "ml", "deep learning"),
  def("llm", "ai", "large language model", "gpt", "generative ai", "genai", "llm fine-tuning", "fine-tuning", "agentic ai", "ai agents"),
  def("nlp", "ai", "natural language processing"),
  def("computer vision", "ai", "opencv", "cv"),
  def("pytorch", "ai", "torch"),
  def("tensorflow", "ai", "keras"),
  def("langchain", "ai", "lang chain"),
  def("llamaindex", "ai", "llama index"),
  def("openai", "ai", "open ai", "chatgpt api"),
  def("anthropic", "ai", "claude"),
  def("prompt engineering", "ai", "prompting"),
  def("model deployment", "ai", "model serving", "inference"),
  def("statistics", "ai", "statistical modelling", "statistical modeling"),
  def("rag", "ai", "retrieval augmented generation"),
  def("data science", "ai", "pandas", "numpy", "scikit-learn", "sklearn"),
  def("mlops", "ai"),
  def("chatbot", "ai", "conversational ai", "virtual assistant"),

  def("testing", "testing", "qa", "quality assurance", "unit testing"),
  def("test automation", "testing", "automation testing", "automated testing"),
  def("selenium", "testing"),
  def("cypress", "testing", "playwright"),
  def("jest", "testing", "vitest", "pytest", "junit"),
  def("api testing", "testing", "postman"),
  def("performance testing", "testing", "load testing", "jmeter"),

  def("react native", "mobile", "expo"),
  def("flutter", "mobile", "dart"),
  def("android", "mobile"),
  def("ios", "mobile"),

  def("git", "tooling", "github", "version control"),
  def("jira", "tooling", "atlassian"),
  def("clickup", "tooling"),
  def("agile", "tooling", "scrum", "kanban", "sprint planning", "agile delivery"),
  def("project management", "tooling", "delivery management", "program management"),
  def("figma", "tooling"),
  def("ui design", "tooling", "ux", "ui/ux", "user interface design"),
  def("design systems", "tooling", "design system"),
  def("user research", "tooling", "usability research"),
  def("product analytics", "tooling", "product metrics"),
  def("excel", "tooling", "spreadsheets"),
  def("power bi", "tooling", "tableau", "looker", "data visualization"),
  def("security", "tooling", "cybersecurity", "owasp", "penetration testing"),

  def("communication", "soft", "written communication", "presentation"),
  def("leadership", "soft", "team lead", "tech lead", "mentoring", "people management", "team leadership"),
  def("collaboration", "soft", "teamwork", "cross-functional"),
  def("problem solving", "soft", "analytical", "critical thinking"),
  def("ownership", "soft", "self-driven", "proactive"),
  def("stakeholder management", "soft", "client communication", "customer facing"),
];

const LOOKUP = new Map<string, SkillDef>();
for (const entry of SKILL_DICTIONARY) {
  LOOKUP.set(entry.canonical, entry);
  for (const alias of entry.aliases) LOOKUP.set(alias, entry);
}

export function canonicalSkill(raw: string): { canonical: string; category: SkillCategoryKey } | null {
  const key = raw.trim().toLowerCase();
  if (!key) return null;
  const hit = LOOKUP.get(key);
  if (hit) return { canonical: hit.canonical, category: hit.category };
  return null;
}

export function normalizeSkill(raw: string): string {
  return canonicalSkill(raw)?.canonical ?? raw.trim().toLowerCase();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Deterministic keyword extraction — never invents skills that are not present in the text. */
export function extractSkills(text: string): { canonical: string; category: SkillCategoryKey }[] {
  const haystack = ` ${text.toLowerCase().replace(/[\n\r\t]/g, " ")} `;
  const found = new Map<string, SkillCategoryKey>();
  for (const entry of SKILL_DICTIONARY) {
    const terms = [entry.canonical, ...entry.aliases];
    for (const term of terms) {
      const pattern = new RegExp(`(^|[^a-z0-9+#.])${escapeRegExp(term)}([^a-z0-9+#.]|$)`, "i");
      if (pattern.test(haystack)) {
        found.set(entry.canonical, entry.category);
        break;
      }
    }
  }
  return [...found.entries()].map(([canonical, category]) => ({ canonical, category }));
}

/** Does an evidence string demonstrate the given skill? */
export function evidenceMatchesSkill(skill: string, evidence: string): boolean {
  const target = canonicalSkill(skill);
  const terms = target
    ? [target.canonical, ...(SKILL_DICTIONARY.find((s) => s.canonical === target.canonical)?.aliases ?? [])]
    : [skill.trim().toLowerCase()];
  const haystack = ` ${evidence.toLowerCase()} `;
  return terms.some((term) => {
    if (term.length < 2) return false;
    const pattern = new RegExp(`(^|[^a-z0-9+#.])${escapeRegExp(term)}([^a-z0-9+#.]|$)`, "i");
    return pattern.test(haystack);
  });
}

export const EXPERIENCE_REGEX = /(\d+)\s*(?:\+|plus)?\s*(?:-|to|–)?\s*(\d+)?\s*(?:\+)?\s*(?:years?|yrs?)/i;

export function extractMinYears(text: string): number | null {
  const match = text.match(EXPERIENCE_REGEX);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}