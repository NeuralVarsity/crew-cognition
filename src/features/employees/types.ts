import type { Database } from "@/integrations/supabase/types";

export type EmployeeStatus = Database["public"]["Enums"]["employee_status"];
export type EmploymentType = Database["public"]["Enums"]["employment_type"];

export const EMPLOYEE_STATUSES: EmployeeStatus[] = ["active", "on_leave", "probation", "terminated"];
export const EMPLOYMENT_TYPES: EmploymentType[] = ["full_time", "part_time", "contract", "intern", "consultant"];

export type EmployeeRow = {
  id: string;
  organization_id: string;
  employee_code: string;
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  dob: string | null;
  designation: string | null;
  status: EmployeeStatus;
  employment_type: EmploymentType;
  department_id: string | null;
  team_id: string | null;
  manager_id: string | null;
  joining_date: string | null;
  work_location: string | null;
  office_location: string | null;
  location: string | null;
  salary: number | null;
  profile_photo: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  departments: { id: string; name: string } | null;
  teams: { id: string; name: string } | null;
  manager: { id: string; full_name: string } | null;
};

export type EmployeeFormValues = {
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  dob: string;
  joining_date: string;
  designation: string;
  department_id: string;
  team_id: string;
  manager_id: string;
  employment_type: EmploymentType;
  status: EmployeeStatus;
  work_location: string;
  office_location: string;
  salary: string;
  notes: string;
  profile_photo: string;
};

export const emptyEmployeeForm: EmployeeFormValues = {
  employee_code: "",
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  dob: "",
  joining_date: "",
  designation: "",
  department_id: "",
  team_id: "",
  manager_id: "",
  employment_type: "full_time",
  status: "active",
  work_location: "",
  office_location: "",
  salary: "",
  notes: "",
  profile_photo: "",
};