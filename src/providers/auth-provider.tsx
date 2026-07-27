import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole =
  | "super_admin"
  | "org_admin"
  | "hr"
  | "engineering_manager"
  | "team_lead"
  | "employee"
  | "recruiter";

export type Profile = {
  id: string;
  organization_id: string | null;
  email: string;
  full_name: string | null;
  avatar: string | null;
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  roles: AppRole[];
  organizationId: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  hasRole: (r: AppRole | AppRole[]) => boolean;
  canManageWorkforce: boolean;
  isOrgAdmin: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);
  const qc = useQueryClient();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
      qc.invalidateQueries();
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setInitialized(true);
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, [qc]);

  const userId = session?.user.id ?? null;

  const profileQuery = useQuery({
    queryKey: ["auth", "profile", userId],
    enabled: !!userId,
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from("users")
        .select("id, organization_id, email, full_name, avatar")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });

  const rolesQuery = useQuery({
    queryKey: ["auth", "roles", userId],
    enabled: !!userId,
    queryFn: async (): Promise<AppRole[]> => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId!);
      if (error) throw error;
      return (data ?? []).map((r) => r.role as AppRole);
    },
  });

  const roles = rolesQuery.data ?? [];
  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    profile: profileQuery.data ?? null,
    roles,
    organizationId: profileQuery.data?.organization_id ?? null,
    // isLoading is false while a query is enabled-but-not-yet-fetching, which briefly
    // made organizationId look null and bounced signed-in users to /onboarding.
    loading:
      !initialized ||
      (!!userId &&
        (profileQuery.isPending ||
          profileQuery.isFetching ||
          rolesQuery.isPending ||
          rolesQuery.isFetching)),
    signOut: async () => {
      await qc.cancelQueries();
      qc.clear();
      await supabase.auth.signOut();
    },
    refresh: async () => {
      await qc.invalidateQueries({ queryKey: ["auth"] });
    },
    hasRole: (r) => {
      const list = Array.isArray(r) ? r : [r];
      return list.some((x) => roles.includes(x));
    },
    canManageWorkforce: roles.some((r) =>
      ["super_admin", "org_admin", "hr", "engineering_manager", "team_lead", "recruiter"].includes(r),
    ),
    isOrgAdmin: roles.some((r) => ["super_admin", "org_admin"].includes(r)),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}