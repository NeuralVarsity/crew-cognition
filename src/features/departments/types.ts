export const DEPARTMENT_STATUSES = ["active", "inactive", "archived"] as const;
export type DepartmentStatus = (typeof DEPARTMENT_STATUSES)[number];

export type DepartmentRow = {
  id: string;
  organization_id: string;
  department_code: string | null;
  name: string;
  description: string | null;
  manager_id: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  budget: number | null;
  color: string | null;
  icon: string | null;
  status: DepartmentStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  manager?: { id: string; full_name: string | null; email: string } | null;
};

export type DepartmentFormValues = {
  name: string;
  department_code: string;
  description: string;
  manager_id: string;
  location: string;
  email: string;
  phone: string;
  budget: string;
  status: DepartmentStatus;
  color: string;
  icon: string;
  notes: string;
};

export const emptyDepartmentForm = (): DepartmentFormValues => ({
  name: "",
  department_code: "",
  description: "",
  manager_id: "",
  location: "",
  email: "",
  phone: "",
  budget: "",
  status: "active",
  color: "#6366f1",
  icon: "Building2",
  notes: "",
});

export const DEPT_ICONS = [
  "Building2", "Briefcase", "Users", "Cpu", "Rocket", "Wrench",
  "PieChart", "Palette", "Megaphone", "ShieldCheck", "Beaker", "Headphones",
] as const;

export const DEPT_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444", "#f59e0b",
  "#10b981", "#14b8a6", "#0ea5e9", "#3b82f6", "#64748b",
] as const;