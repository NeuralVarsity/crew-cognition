// Role & permission guard scaffolding. Wire to real auth in a later prompt.
export type Role = "owner" | "admin" | "manager" | "member" | "viewer";
export type Permission = string;

export function usePermission() {
  const role: Role = "admin";
  const permissions: Permission[] = ["*"];
  return {
    role,
    hasRole: (r: Role | Role[]) => (Array.isArray(r) ? r.includes(role) : role === r),
    hasPermission: (p: Permission) => permissions.includes("*") || permissions.includes(p),
  };
}