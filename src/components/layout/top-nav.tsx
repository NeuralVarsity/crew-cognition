import { Bell, ChevronDown, LogOut, User, Building } from "lucide-react";
import { useRouterState } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "./theme-toggle";
import { navigation } from "@/config/navigation";
import { GlobalSearch } from "./global-search";
import { useAuth } from "@/providers/auth-provider";
import { initials } from "@/lib/format";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

function useCrumbs() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  if (pathname === "/") return [{ title: "AI Workspace", url: "/" }];
  if (pathname.startsWith("/workspace/chat"))
    return [
      { title: "AI Workspace", url: "/" },
      { title: "Conversation", url: pathname },
    ];
  const match = navigation.find(
    (n) => n.url !== "/" && (pathname === n.url || pathname.startsWith(n.url + "/")),
  );
  return [
    { title: "AI Workspace", url: "/" },
    { title: match?.title ?? "Page", url: match?.url ?? pathname },
  ];
}

export function TopNav() {
  const crumbs = useCrumbs();
  const { profile, organizationId, signOut, roles } = useAuth();
  const orgQuery = useQuery({
    queryKey: ["current-org", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data } = await supabase
        .from("organizations")
        .select("id, name")
        .eq("id", organizationId!)
        .maybeSingle();
      return data;
    },
  });
  const primaryRole = roles[0]?.replace(/_/g, " ") ?? "member";

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border/60 bg-background/80 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mx-1 h-5" />

      <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1.5 text-sm md:flex">
        {crumbs.map((c, i) => (
          <span key={c.url} className="flex min-w-0 items-center gap-1.5">
            {i > 0 && <span className="text-muted-foreground/50">/</span>}
            <span
              className={
                i === crumbs.length - 1
                  ? "truncate font-medium text-foreground"
                  : "truncate text-muted-foreground"
              }
            >
              {c.title}
            </span>
          </span>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <GlobalSearch />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="hidden gap-2 sm:inline-flex">
              <Building className="h-4 w-4" />
              <span className="max-w-[110px] truncate">{orgQuery.data?.name ?? "Workspace"}</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Organizations</DropdownMenuLabel>
            <DropdownMenuItem disabled>{orgQuery.data?.name ?? "No workspace"}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary" />
        </Button>

        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition hover:bg-accent">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                  {initials(profile?.full_name ?? profile?.email)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden text-left lg:block">
                <div className="text-xs font-medium leading-tight">
                  {profile?.full_name ?? profile?.email ?? "User"}
                </div>
                <Badge variant="secondary" className="mt-0.5 h-4 px-1 text-[10px] capitalize">
                  {primaryRole}
                </Badge>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void signOut()}>
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}