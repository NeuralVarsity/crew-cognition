import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/auth-provider";
import type { DepartmentFormValues, DepartmentRow } from "./types";

const SELECT =
  "id, organization_id, department_code, name, description, manager_id, email, phone, location, budget, color, icon, status, notes, created_by, created_at, updated_at, manager:users!departments_manager_id_fkey(id, full_name, email)";

export function useDepartmentsList() {
  const { organizationId } = useAuth();
  return useQuery({
    queryKey: ["departments-full", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select(SELECT)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as DepartmentRow[];
    },
  });
}

export function useDepartment(id: string | undefined) {
  return useQuery({
    queryKey: ["department", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select(SELECT)
        .eq("id", id!)
        .is("deleted_at", null)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as DepartmentRow | null;
    },
  });
}

export function useDepartmentEmployees(departmentId: string | undefined) {
  const { organizationId } = useAuth();
  return useQuery({
    queryKey: ["department-employees", departmentId, organizationId],
    enabled: !!departmentId && !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, full_name, email, designation, employee_code, status, team_id, teams(id,name)")
        .eq("department_id", departmentId!)
        .is("deleted_at", null)
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useDepartmentTeams(departmentId: string | undefined) {
  return useQuery({
    queryKey: ["department-teams", departmentId],
    enabled: !!departmentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("id, name, description, department_id")
        .eq("department_id", departmentId!)
        .is("deleted_at", null)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function generateDepartmentCode(name: string, existing: Set<string>) {
  const base = (name || "DEP")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 4) || "DEP";
  for (let i = 0; i < 50; i++) {
    const n = String(Math.floor(100 + Math.random() * 900));
    const code = `${base}-${n}`;
    if (!existing.has(code.toLowerCase())) return code;
  }
  return `${base}-${Date.now().toString().slice(-4)}`;
}

export function formToPayload(v: DepartmentFormValues) {
  return {
    name: v.name.trim(),
    department_code: v.department_code.trim() || null,
    description: v.description.trim() || null,
    manager_id: v.manager_id || null,
    location: v.location.trim() || null,
    email: v.email.trim().toLowerCase() || null,
    phone: v.phone.trim() || null,
    budget: v.budget ? Number(v.budget) : null,
    status: v.status,
    color: v.color || null,
    icon: v.icon || null,
    notes: v.notes.trim() || null,
  };
}

export function useDepartmentMutations() {
  const qc = useQueryClient();
  const { organizationId, user } = useAuth();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["departments"] });
    qc.invalidateQueries({ queryKey: ["departments-full"] });
    qc.invalidateQueries({ queryKey: ["department"] });
    qc.invalidateQueries({ queryKey: ["department-employees"] });
    qc.invalidateQueries({ queryKey: ["department-teams"] });
  };

  const create = useMutation({
    mutationFn: async (v: DepartmentFormValues) => {
      if (!organizationId) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("departments")
        .insert({ ...formToPayload(v), organization_id: organizationId, created_by: user?.id ?? null })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: DepartmentFormValues }) => {
      const { error } = await supabase.from("departments").update(formToPayload(values)).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const archive = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("departments").update({ status: "archived" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("departments")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const bulkImport = useMutation({
    mutationFn: async (rows: DepartmentFormValues[]) => {
      if (!organizationId) throw new Error("Not signed in");
      const payload = rows.map((v) => ({
        ...formToPayload(v),
        organization_id: organizationId,
        created_by: user?.id ?? null,
      }));
      const { error } = await supabase.from("departments").insert(payload);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { create, update, archive, remove, bulkImport };
}

export async function transferEmployees(ids: string[], toDepartmentId: string | null) {
  const { error } = await supabase
    .from("employees")
    .update({ department_id: toDepartmentId, team_id: null })
    .in("id", ids);
  if (error) throw error;
}