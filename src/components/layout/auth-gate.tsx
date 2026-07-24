import { useEffect, type ReactNode } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { AppShell } from "@/components/layout/app-shell";

const PUBLIC_PATHS = new Set(["/auth"]);

export function AuthGate({ children }: { children: ReactNode }) {
  const { session, loading, organizationId } = useAuth();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const isPublic = PUBLIC_PATHS.has(pathname);
  const isOnboarding = pathname === "/onboarding";

  useEffect(() => {
    if (loading) return;
    if (!session && !isPublic) {
      navigate({ to: "/auth" });
    } else if (session && !organizationId && !isOnboarding && !isPublic) {
      navigate({ to: "/onboarding" });
    } else if (session && organizationId && (isPublic || isOnboarding)) {
      navigate({ to: "/" });
    }
  }, [loading, session, organizationId, isPublic, isOnboarding, pathname, navigate]);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isPublic || isOnboarding) {
    return <>{children}</>;
  }

  if (!session || !organizationId) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}