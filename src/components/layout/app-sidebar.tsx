import { Link, useRouterState } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { navGroups, navigation } from "@/config/navigation";

export function AppSidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <div className="truncate text-sm font-semibold leading-tight">TalentAI</div>
            <div className="truncate text-[11px] text-sidebar-foreground/60">
              Workforce Intelligence
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {navGroups.map((group) => (
          <SidebarGroup key={group}>
            <SidebarGroupLabel>{group}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navigation
                  .filter((n) => n.group === group)
                  .map((item) => {
                    const active =
                      item.url === "/"
                        ? pathname === "/" || pathname.startsWith("/workspace/chat")
                        : pathname === item.url || pathname.startsWith(item.url + "/");
                    return (
                      <SidebarMenuItem key={item.url}>
                        <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                          <Link to={item.url}>
                            <item.icon />
                            <span>{item.title}</span>
                            {item.badge && (
                              <Badge
                                variant="secondary"
                                className="ml-auto h-5 px-1.5 text-[10px] group-data-[collapsible=icon]:hidden"
                              >
                                {item.badge}
                              </Badge>
                            )}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <div className="px-2 py-1.5 text-[11px] text-sidebar-foreground/50 group-data-[collapsible=icon]:hidden">
          v0.1 · Foundation
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}