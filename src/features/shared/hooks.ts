import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/auth-provider";

export function useDepartments() {
  const { organizationId } = useAuth();
  return useQuery({
    queryKey: ["departments", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("id, name")
        .is("deleted_at", null)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useTeams(departmentId?: string | null) {
  const { organizationId } = useAuth();
  return useQuery({
    queryKey: ["teams", organizationId, departmentId ?? "all"],
    enabled: !!organizationId,
    queryFn: async () => {
      let q = supabase.from("teams").select("id, name, department_id").is("deleted_at", null).order("name");
      if (departmentId) q = q.eq("department_id", departmentId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useEmployees() {
  const { organizationId } = useAuth();
  return useQuery({
    queryKey: ["employees", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, full_name, email, designation, department_id, team_id")
        .is("deleted_at", null)
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });
}