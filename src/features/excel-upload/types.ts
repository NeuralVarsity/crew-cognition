export type DatasetKey =
  | "employees"
  | "departments"
  | "teams"
  | "projects"
  | "skills"
  | "attendance"
  | "leaves"
  | "payroll"
  | "performance_reviews"
  | "training_records"
  | "assets"
  | "github"
  | "jira"
  | "clickup"
  | "custom";

export type FieldType = "string" | "email" | "date" | "number" | "phone" | "boolean" | "username";

export type FieldDef = {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  unique?: boolean;
  aliases?: string[];
};

export type DatasetDef = {
  key: DatasetKey;
  label: string;
  description: string;
  /** native table target, or "staging" for generic staged records */
  target: "employees" | "departments" | "teams" | "projects" | "skills" | "staging";
  keyFields: string[];
  fields: FieldDef[];
};

export type ImportMode = "insert" | "update" | "upsert" | "skip_duplicates" | "replace" | "dry_run";

export type ImportOptions = {
  mode: ImportMode;
  dryRun: boolean;
  skipInvalidRows: boolean;
  trimWhitespace: boolean;
  batchSize: number;
};

export type ParsedSheet = {
  name: string;
  headers: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
};

export type ParsedWorkbook = {
  fileName: string;
  fileSize: number;
  fileType: string;
  sheets: ParsedSheet[];
};

export type IssueSeverity = "error" | "warning";

export type RowIssue = {
  row: number;
  column: string | null;
  type: string;
  severity: IssueSeverity;
  message: string;
};

export type ValidationResult = {
  issues: RowIssue[];
  invalidRows: Set<number>;
  warningRows: Set<number>;
  duplicateRows: Set<number>;
  errorCount: number;
  warningCount: number;
};

export type ColumnProfile = {
  header: string;
  detectedType: FieldType;
  filled: number;
  empty: number;
  sample: string;
};

export type ImportRecord = {
  id: string;
  organization_id: string;
  created_by: string | null;
  created_by_name: string | null;
  file_name: string;
  file_size: number;
  file_type: string | null;
  file_path: string | null;
  dataset: DatasetKey;
  sheet_name: string | null;
  mode: ImportMode;
  status:
    | "pending"
    | "uploading"
    | "validating"
    | "ready"
    | "importing"
    | "completed"
    | "partial"
    | "failed"
    | "cancelled"
    | "dry_run";
  total_rows: number;
  imported_rows: number;
  updated_rows: number;
  skipped_rows: number;
  failed_rows: number;
  duplicate_rows: number;
  error_count: number;
  warning_count: number;
  duration_ms: number | null;
  error_message: string | null;
  column_mapping: Record<string, string>;
  created_at: string;
  finished_at: string | null;
};

export const MAX_FILE_BYTES = 100 * 1024 * 1024;
export const ALLOWED_EXTENSIONS = ["xlsx", "xls", "csv"] as const;

const employeeFields: FieldDef[] = [
  { key: "employee_code", label: "Employee ID", type: "string", unique: true, aliases: ["emp id", "employee id", "empcode", "code", "staff id"] },
  { key: "full_name", label: "Employee Name", type: "string", required: true, aliases: ["name", "employee name", "fullname", "full name"] },
  { key: "first_name", label: "First Name", type: "string", aliases: ["firstname", "given name"] },
  { key: "last_name", label: "Last Name", type: "string", aliases: ["lastname", "surname", "family name"] },
  { key: "email", label: "Email", type: "email", required: true, unique: true, aliases: ["mail", "work email", "email address", "office email"] },
  { key: "phone", label: "Phone", type: "phone", aliases: ["mobile", "contact", "phone number", "contact number"] },
  { key: "designation", label: "Designation", type: "string", aliases: ["title", "job title", "role", "position"] },
  { key: "department", label: "Department", type: "string", aliases: ["dept", "department name", "business unit"] },
  { key: "team", label: "Team", type: "string", aliases: ["squad", "team name", "group"] },
  { key: "manager", label: "Manager", type: "string", aliases: ["reporting manager", "manager name", "manager email", "reports to"] },
  { key: "employment_type", label: "Employment Type", type: "string", aliases: ["type", "emp type", "contract type"] },
  { key: "status", label: "Status", type: "string", aliases: ["employee status", "state"] },
  { key: "joining_date", label: "Joining Date", type: "date", aliases: ["doj", "date of joining", "hire date", "start date"] },
  { key: "dob", label: "Date of Birth", type: "date", aliases: ["birth date", "date of birth", "birthday"] },
  { key: "location", label: "Location", type: "string", aliases: ["city", "work location", "office"] },
  { key: "salary", label: "Salary", type: "number", aliases: ["ctc", "annual salary", "compensation", "pay"] },
  { key: "github_username", label: "GitHub Username", type: "username", aliases: ["github", "github id", "git user"] },
  { key: "jira_user", label: "Jira User", type: "string", aliases: ["jira", "jira account", "jira id"] },
  { key: "clickup_user", label: "ClickUp User", type: "string", aliases: ["clickup", "clickup id"] },
  { key: "notes", label: "Notes", type: "string", aliases: ["remarks", "comment"] },
];

const genericActivityFields: FieldDef[] = [
  { key: "employee_email", label: "Employee Email", type: "email", required: true, aliases: ["email", "user email", "employee"] },
  { key: "date", label: "Date", type: "date", required: true, aliases: ["day", "work date", "log date"] },
  { key: "hours", label: "Hours", type: "number", aliases: ["duration", "time", "hours worked"] },
  { key: "status", label: "Status", type: "string", aliases: ["state"] },
  { key: "notes", label: "Notes", type: "string", aliases: ["remarks", "description", "comment"] },
];

export const DATASETS: Record<DatasetKey, DatasetDef> = {
  employees: {
    key: "employees",
    label: "Employees",
    description: "People directory records including department, team and manager.",
    target: "employees",
    keyFields: ["email", "employee_code"],
    fields: employeeFields,
  },
  departments: {
    key: "departments",
    label: "Departments",
    description: "Organizational departments with codes and budgets.",
    target: "departments",
    keyFields: ["name"],
    fields: [
      { key: "name", label: "Department Name", type: "string", required: true, unique: true, aliases: ["department", "dept", "department name"] },
      { key: "department_code", label: "Department Code", type: "string", aliases: ["code", "dept code"] },
      { key: "description", label: "Description", type: "string", aliases: ["about", "details"] },
      { key: "email", label: "Email", type: "email", aliases: ["dept email"] },
      { key: "phone", label: "Phone", type: "phone", aliases: ["contact"] },
      { key: "location", label: "Location", type: "string", aliases: ["city", "office"] },
      { key: "budget", label: "Budget", type: "number", aliases: ["annual budget", "cost"] },
      { key: "status", label: "Status", type: "string", aliases: ["state"] },
    ],
  },
  teams: {
    key: "teams",
    label: "Teams",
    description: "Teams that belong to a department.",
    target: "teams",
    keyFields: ["name"],
    fields: [
      { key: "name", label: "Team Name", type: "string", required: true, unique: true, aliases: ["team", "squad"] },
      { key: "department", label: "Department", type: "string", required: true, aliases: ["dept", "department name"] },
      { key: "description", label: "Description", type: "string", aliases: ["about"] },
    ],
  },
  projects: {
    key: "projects",
    label: "Projects",
    description: "Delivery projects with schedule and status.",
    target: "projects",
    keyFields: ["name"],
    fields: [
      { key: "name", label: "Project Name", type: "string", required: true, unique: true, aliases: ["project", "project title"] },
      { key: "description", label: "Description", type: "string", aliases: ["about", "summary"] },
      { key: "department", label: "Department", type: "string", aliases: ["dept"] },
      { key: "status", label: "Status", type: "string", aliases: ["state", "phase"] },
      { key: "start_date", label: "Start Date", type: "date", aliases: ["kickoff", "begin date"] },
      { key: "end_date", label: "End Date", type: "date", aliases: ["due date", "finish date", "deadline"] },
    ],
  },
  skills: {
    key: "skills",
    label: "Skills",
    description: "Skill taxonomy used across the workforce.",
    target: "skills",
    keyFields: ["name"],
    fields: [
      { key: "name", label: "Skill Name", type: "string", required: true, unique: true, aliases: ["skill", "technology"] },
      { key: "category", label: "Category", type: "string", aliases: ["type", "group"] },
    ],
  },
  attendance: {
    key: "attendance",
    label: "Attendance",
    description: "Daily attendance and time logs staged for analytics.",
    target: "staging",
    keyFields: ["employee_email", "date"],
    fields: [
      ...genericActivityFields,
      { key: "check_in", label: "Check In", type: "string", aliases: ["in time", "start time"] },
      { key: "check_out", label: "Check Out", type: "string", aliases: ["out time", "end time"] },
    ],
  },
  leaves: {
    key: "leaves",
    label: "Leaves",
    description: "Leave requests and balances.",
    target: "staging",
    keyFields: ["employee_email", "date"],
    fields: [
      { key: "employee_email", label: "Employee Email", type: "email", required: true, aliases: ["email", "employee"] },
      { key: "leave_type", label: "Leave Type", type: "string", aliases: ["type", "category"] },
      { key: "date", label: "Start Date", type: "date", required: true, aliases: ["from", "start date", "leave date"] },
      { key: "end_date", label: "End Date", type: "date", aliases: ["to", "till"] },
      { key: "days", label: "Days", type: "number", aliases: ["duration", "no of days"] },
      { key: "status", label: "Status", type: "string", aliases: ["approval status"] },
      { key: "notes", label: "Notes", type: "string", aliases: ["reason", "remarks"] },
    ],
  },
  payroll: {
    key: "payroll",
    label: "Payroll",
    description: "Payroll cycles, gross and net pay.",
    target: "staging",
    keyFields: ["employee_email", "date"],
    fields: [
      { key: "employee_email", label: "Employee Email", type: "email", required: true, aliases: ["email", "employee"] },
      { key: "date", label: "Pay Period", type: "date", required: true, aliases: ["month", "period", "pay date"] },
      { key: "gross", label: "Gross Pay", type: "number", aliases: ["gross salary", "gross amount"] },
      { key: "deductions", label: "Deductions", type: "number", aliases: ["tax", "deduction"] },
      { key: "net", label: "Net Pay", type: "number", aliases: ["net salary", "take home"] },
      { key: "currency", label: "Currency", type: "string", aliases: ["ccy"] },
    ],
  },
  performance_reviews: {
    key: "performance_reviews",
    label: "Performance Reviews",
    description: "Review cycles, ratings and reviewer feedback.",
    target: "staging",
    keyFields: ["employee_email", "date"],
    fields: [
      { key: "employee_email", label: "Employee Email", type: "email", required: true, aliases: ["email", "employee"] },
      { key: "date", label: "Review Date", type: "date", required: true, aliases: ["cycle", "period"] },
      { key: "reviewer", label: "Reviewer", type: "string", aliases: ["manager", "appraiser"] },
      { key: "rating", label: "Rating", type: "number", aliases: ["score", "overall rating"] },
      { key: "status", label: "Status", type: "string", aliases: ["state"] },
      { key: "notes", label: "Feedback", type: "string", aliases: ["comments", "feedback"] },
    ],
  },
  training_records: {
    key: "training_records",
    label: "Training Records",
    description: "Courses, certifications and completion status.",
    target: "staging",
    keyFields: ["employee_email", "date"],
    fields: [
      { key: "employee_email", label: "Employee Email", type: "email", required: true, aliases: ["email", "employee"] },
      { key: "course", label: "Course", type: "string", required: true, aliases: ["training", "program", "certification"] },
      { key: "date", label: "Completion Date", type: "date", required: true, aliases: ["completed on", "date"] },
      { key: "hours", label: "Hours", type: "number", aliases: ["duration"] },
      { key: "status", label: "Status", type: "string", aliases: ["state"] },
    ],
  },
  assets: {
    key: "assets",
    label: "Assets",
    description: "Hardware and software assets assigned to employees.",
    target: "staging",
    keyFields: ["asset_tag"],
    fields: [
      { key: "asset_tag", label: "Asset Tag", type: "string", required: true, unique: true, aliases: ["tag", "asset id", "serial"] },
      { key: "asset_type", label: "Asset Type", type: "string", aliases: ["type", "category"] },
      { key: "employee_email", label: "Assigned To", type: "email", aliases: ["email", "assignee", "employee"] },
      { key: "date", label: "Assigned Date", type: "date", aliases: ["issued on", "date"] },
      { key: "status", label: "Status", type: "string", aliases: ["state", "condition"] },
    ],
  },
  github: {
    key: "github",
    label: "GitHub Data",
    description: "GitHub activity exports staged alongside the live integration.",
    target: "staging",
    keyFields: ["github_username", "date"],
    fields: [
      { key: "github_username", label: "GitHub Username", type: "username", required: true, aliases: ["github", "login", "author"] },
      { key: "employee_email", label: "Employee Email", type: "email", aliases: ["email"] },
      { key: "repository", label: "Repository", type: "string", aliases: ["repo", "project"] },
      { key: "date", label: "Date", type: "date", required: true, aliases: ["committed at", "day"] },
      { key: "commits", label: "Commits", type: "number", aliases: ["commit count"] },
      { key: "pull_requests", label: "Pull Requests", type: "number", aliases: ["prs", "pr count"] },
      { key: "additions", label: "Additions", type: "number", aliases: ["lines added"] },
      { key: "deletions", label: "Deletions", type: "number", aliases: ["lines removed"] },
    ],
  },
  jira: {
    key: "jira",
    label: "Jira Data",
    description: "Jira issue exports staged alongside the live integration.",
    target: "staging",
    keyFields: ["issue_key"],
    fields: [
      { key: "issue_key", label: "Issue Key", type: "string", required: true, unique: true, aliases: ["key", "ticket", "issue"] },
      { key: "summary", label: "Summary", type: "string", aliases: ["title", "task"] },
      { key: "jira_user", label: "Jira User", type: "string", aliases: ["assignee", "jira account"] },
      { key: "employee_email", label: "Employee Email", type: "email", aliases: ["email"] },
      { key: "project", label: "Project", type: "string", aliases: ["project name"] },
      { key: "status", label: "Status", type: "string", aliases: ["state"] },
      { key: "priority", label: "Priority", type: "string", aliases: ["severity"] },
      { key: "story_points", label: "Story Points", type: "number", aliases: ["points", "sp"] },
      { key: "date", label: "Created Date", type: "date", aliases: ["created", "date"] },
    ],
  },
  clickup: {
    key: "clickup",
    label: "ClickUp Data",
    description: "ClickUp task exports staged alongside the live integration.",
    target: "staging",
    keyFields: ["task_id"],
    fields: [
      { key: "task_id", label: "Task ID", type: "string", required: true, unique: true, aliases: ["id", "task"] },
      { key: "task_name", label: "Task Name", type: "string", aliases: ["name", "title", "task"] },
      { key: "clickup_user", label: "ClickUp User", type: "string", aliases: ["assignee", "clickup"] },
      { key: "employee_email", label: "Employee Email", type: "email", aliases: ["email"] },
      { key: "list", label: "List", type: "string", aliases: ["list name", "project"] },
      { key: "status", label: "Status", type: "string", aliases: ["state"] },
      { key: "priority", label: "Priority", type: "string", aliases: ["severity"] },
      { key: "hours", label: "Time Spent (h)", type: "number", aliases: ["time", "duration"] },
      { key: "date", label: "Due Date", type: "date", aliases: ["due", "date"] },
    ],
  },
  custom: {
    key: "custom",
    label: "Custom Dataset",
    description: "Any spreadsheet — every column is staged as-is with light validation.",
    target: "staging",
    keyFields: [],
    fields: [],
  },
};

export const DATASET_LIST = Object.values(DATASETS);

export const IMPORT_MODES: { value: ImportMode; label: string; description: string }[] = [
  { value: "insert", label: "Insert only", description: "Create new records, fail on duplicates." },
  { value: "update", label: "Update existing", description: "Only update records that already exist." },
  { value: "upsert", label: "Upsert", description: "Update when found, otherwise insert." },
  { value: "skip_duplicates", label: "Skip duplicates", description: "Insert new records and silently skip existing." },
  { value: "replace", label: "Replace existing", description: "Overwrite matching records entirely." },
  { value: "dry_run", label: "Dry run", description: "Validate and simulate without writing data." },
];