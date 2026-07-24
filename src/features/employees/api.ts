import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/auth-provider";
import type { EmployeeRow, EmployeeFormValues } from "./types";

const SELECT = "id, organization_id, employee_code, full_name, first_name, last_name, email, phone, dob, designation, status, employment_type, department_id, team_id, manager_id, joining_date, work_location, office_location, location, salary, profile_photo, notes, created_at, updated_at, departments(id, name), teams(id, name), manager:employees!employees_manager_id_fkey(id, full_name)";

export function useEmployeesList() {
  const { organizationId } = useAuth();
  return useQuery({
    queryKey: ["employees-list", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select(SELECT)
        .is("deleted_at", null)
        .order("full_name");
      if (error) throw error;
      return (data ?? []) as unknown as EmployeeRow[];
    },
  });
}

export function useEmployee(id: string | undefined) {
  return useQuery({
    queryKey: ["employee", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("employees").select(SELECT).eq("id", id!).maybeSingle();
      if (error) throw error;
      return data as unknown as EmployeeRow | null;
    },
  });
}

export function formToPayload(v: EmployeeFormValues) {
  const full_name = [v.first_name, v.last_name].filter(Boolean).join(" ").trim() || v.email.split("@")[0];
  return {
    employee_code: v.employee_code.trim(),
    first_name: v.first_name.trim() || null,
    last_name: v.last_name.trim() || null,
    full_name,
    email: v.email.trim().toLowerCase(),
    phone: v.phone.trim() || null,
    dob: v.dob || null,
    joining_date: v.joining_date || null,
    designation: v.designation.trim() || null,
    department_id: v.department_id || null,
    team_id: v.team_id || null,
    manager_id: v.manager_id || null,
    employment_type: v.employment_type,
    status: v.status,
    work_location: v.work_location.trim() || null,
    office_location: v.office_location.trim() || null,
    salary: v.salary ? Number(v.salary) : null,
    notes: v.notes.trim() || null,
    profile_photo: v.profile_photo.trim() || null,
  };
}

export function useEmployeeMutations() {
  const qc = useQueryClient();
  const { organizationId } = useAuth();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["employees"] });
    qc.invalidateQueries({ queryKey: ["employees-list"] });
    qc.invalidateQueries({ queryKey: ["employees-full"] });
    qc.invalidateQueries({ queryKey: ["employee"] });
  };

  const create = useMutation({
    mutationFn: async (v: EmployeeFormValues) => {
      if (!organizationId) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("employees")
        .insert({ ...formToPayload(v), organization_id: organizationId })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: EmployeeFormValues }) => {
      const { error } = await supabase.from("employees").update(formToPayload(values)).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const archive = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("employees")
        .update({ status: "terminated" })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("employees")
        .update({ deleted_at: new Date().toISOString() })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const bulkUpdate = useMutation({
    mutationFn: async ({ ids, patch }: { ids: string[]; patch: { department_id?: string | null; team_id?: string | null } }) => {
      const { error } = await supabase.from("employees").update(patch).in("id", ids);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const bulkInsert = useMutation({
    mutationFn: async (rows: EmployeeFormValues[]) => {
      if (!organizationId) throw new Error("Not signed in");
      const payload = rows.map((r) => ({ ...formToPayload(r), organization_id: organizationId }));
      const { error } = await supabase.from("employees").insert(payload);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { create, update, archive, remove, bulkUpdate, bulkInsert };
}

export function generateEmployeeCode(): string {
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  const ts = Date.now().toString(36).slice(-4).toUpperCase();
  return `EMP-${ts}${rand}`;
}

export async function uploadEmployeePhoto(orgId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${orgId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw error;
  return path;
}

export async function signedPhotoUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const { data } = await supabase.storage.from("avatars").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}