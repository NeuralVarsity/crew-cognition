import { Bell, Search, ChevronDown, LogOut, User, Building } from "lucide-react";
import { useRouterState } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

function useCrumbs() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  if (pathname === "/") return [{ title: "Dashboard", url: "/" }];
  const match = navigation.find(
    (n) => n.url !== "/" && (pathname === n.url || pathname.startsWith(n.url + "/")),
  );
  return [
    { title: "Home", url: "/" },
    { title: match?.title ?? "Page", url: match?.url ?? pathname },
  ];
}

export function TopNav() {
  const crumbs = useCrumbs();

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
        <div className="relative hidden md:block">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search employees, projects…"
            className="h-9 w-64 pl-8 lg:w-80"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="hidden gap-2 sm:inline-flex">
              <Building className="h-4 w-4" />
              <span className="max-w-[110px] truncate">Acme Corp</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Organizations</DropdownMenuLabel>
            <DropdownMenuItem>Acme Corp</DropdownMenuItem>
            <DropdownMenuItem disabled>Add organization…</DropdownMenuItem>
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
                  AD
                </AvatarFallback>
              </Avatar>
              <div className="hidden text-left lg:block">
                <div className="text-xs font-medium leading-tight">Admin User</div>
                <Badge variant="secondary" className="mt-0.5 h-4 px-1 text-[10px]">
                  Admin
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
            <DropdownMenuItem>
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}