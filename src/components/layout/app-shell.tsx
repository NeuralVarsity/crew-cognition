import type { ReactNode } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { MeshDriftBackground } from "@/components/ui/mesh-drift-background";
import { AppSidebar } from "./app-sidebar";
import { TopNav } from "./top-nav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate min-h-svh overflow-hidden">
      <MeshDriftBackground />
      <div className="relative z-10 min-h-svh">
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset className="bg-background/78 backdrop-blur-sm">
            <TopNav />
            <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
          </SidebarInset>
        </SidebarProvider>
      </div>
    </div>
  );
}