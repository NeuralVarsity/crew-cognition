import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft, Briefcase, Building2, Calendar, ClipboardList, FolderKanban, Github, Mail,
  MapPin, Pencil, Phone, ShieldAlert, Trash2, User as UserIcon, ListChecks,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmployeeFormDialog } from "@/features/employees/employee-form";
import { EmployeeAiProfile } from "@/features/employees/employee-ai-profile";
import { useEmployee, useEmployeeMutations } from "@/features/employees/api";
import { useSignedPhoto } from "@/features/employees/hooks";
import { useAuth } from "@/providers/auth-provider";
import { supabase } from "@/integrations/supabase/client";
import { initials, formatDate } from "@/lib/format";

export const Route = createFileRoute("/employees/$id")({
  head: () => ({
    meta: [
      { title: "Employee — TalentAI Enterprise" },
      { name: "description", content: "Employee profile with personal, employment, projects and integration signals." },
      { property: "og:title", content: "Employee profile — TalentAI" },
      { property: "og:description", content: "Complete employee profile and activity." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EmployeeDetail,
});

function EmployeeDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { canManageWorkforce, isOrgAdmin } = useAuth();
  const q = useEmployee(id);
  const m = useEmployeeMutations();
  const [editOpen, setEditOpen] = useState(false);
  const emp = q.data;
  const photo = useSignedPhoto(emp?.profile_photo);

  const projects = useQuery({
    queryKey: ["employee-projects", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_projects")
        .select("id, role, allocation_percent, projects(id, name, status)")
        .eq("employee_id", id);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (q.isLoading) {
    return <div className="p-6 space-y-4"><Skeleton className="h-32 w-full" /><Skeleton className="h-64 w-full" /></div>;
  }
  if (!emp) {
    return (
      <div className="p-6">
        <PageHeader title="Employee not found" description="This employee doesn't exist or you don't have access." />
        <Button asChild variant="outline"><Link to="/employees"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Link></Button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/employees" className="inline-flex items-center hover:text-foreground">
          <ArrowLeft className="mr-1 h-4 w-4" /> Employees
        </Link>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <Avatar className="h-20 w-20">
            {photo && <AvatarImage src={photo} alt={emp.full_name} />}
            <AvatarFallback className="text-lg">{initials(emp.full_name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-xl font-semibold">{emp.full_name}</h2>
              <Badge variant={emp.status === "active" ? "default" : emp.status === "terminated" ? "destructive" : "secondary"} className="capitalize">
                {emp.status.replace("_", " ")}
              </Badge>
              <Badge variant="outline" className="capitalize">{emp.employment_type.replace("_", " ")}</Badge>
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              {emp.designation ?? "—"} · <span className="font-mono">{emp.employee_code}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {emp.departments?.name && <span className="inline-flex items-center gap-1"><Building2 className="h-3 w-3" /> {emp.departments.name}</span>}
              {emp.teams?.name && <span className="inline-flex items-center gap-1"><ListChecks className="h-3 w-3" /> {emp.teams.name}</span>}
              {emp.email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" /> {emp.email}</span>}
              {emp.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {emp.phone}</span>}
            </div>
          </div>
          {canManageWorkforce && (
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setEditOpen(true)}><Pencil className="mr-2 h-4 w-4" /> Edit</Button>
              <ConfirmDialog
                title={`Delete ${emp.full_name}?`}
                description="They will be removed from the directory."
                onConfirm={async () => { await m.remove.mutateAsync([emp.id]); toast.success("Deleted"); navigate({ to: "/employees" }); }}
                trigger={<Button variant="ghost" size="icon"><Trash2 className="h-4 w-4" /></Button>}
              />
            </div>
          )}
        </div>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="ai">AI Profile</TabsTrigger>
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="employment">Employment</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="grid gap-4 md:grid-cols-2">
          <InfoCard title="Reporting manager" icon={UserIcon}>
            {emp.manager?.full_name ?? <span className="text-muted-foreground">No manager assigned</span>}
          </InfoCard>
          <InfoCard title="Location" icon={MapPin}>
            {[emp.work_location, emp.office_location, emp.location].filter(Boolean).join(" · ") || "—"}
          </InfoCard>
          <InfoCard title="Joining date" icon={Calendar}>{formatDate(emp.joining_date)}</InfoCard>
          <InfoCard title="Notes" icon={ClipboardList}>
            <div className="whitespace-pre-wrap">{emp.notes ?? <span className="text-muted-foreground">No notes</span>}</div>
          </InfoCard>
        </TabsContent>

        <TabsContent value="personal" className="grid gap-4 md:grid-cols-2">
          <Field label="First name" value={emp.first_name} />
          <Field label="Last name" value={emp.last_name} />
          <Field label="Email" value={emp.email} />
          <Field label="Phone" value={emp.phone} />
          <Field label="Date of birth" value={formatDate(emp.dob)} />
        </TabsContent>

        <TabsContent value="employment" className="grid gap-4 md:grid-cols-2">
          <Field label="Employee ID" value={emp.employee_code} mono />
          <Field label="Designation" value={emp.designation} />
          <Field label="Department" value={emp.departments?.name ?? null} />
          <Field label="Team" value={emp.teams?.name ?? null} />
          <Field label="Manager" value={emp.manager?.full_name ?? null} />
          <Field label="Employment type" value={emp.employment_type.replace("_", " ")} />
          <Field label="Status" value={emp.status.replace("_", " ")} />
          <Field label="Joining date" value={formatDate(emp.joining_date)} />
          <Field label="Work location" value={emp.work_location} />
          <Field label="Office location" value={emp.office_location} />
          {isOrgAdmin && <Field label="Salary" value={emp.salary != null ? emp.salary.toLocaleString() : null} />}
        </TabsContent>

        <TabsContent value="projects">
          <Card className="p-4">
            {projects.isLoading ? <Skeleton className="h-16 w-full" /> :
             !projects.data?.length ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <FolderKanban className="mx-auto mb-2 h-6 w-6 opacity-50" />
                No projects assigned.
              </div>
            ) : (
              <div className="divide-y">
                {projects.data.map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-3">
                    <div>
                      <div className="font-medium">{p.projects?.name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground capitalize">{p.role ?? "member"} · {p.allocation_percent ?? 0}%</div>
                    </div>
                    <Badge variant="outline" className="capitalize">{p.projects?.status ?? "—"}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="grid gap-4 md:grid-cols-3">
          <IntegrationCard icon={Github} name="GitHub" description="Link this employee to a GitHub contributor to see commits, PRs and reviews." />
          <IntegrationCard icon={Briefcase} name="Jira" description="Link Jira profile to view issues, sprints and velocity." />
          <IntegrationCard icon={ShieldAlert} name="ClickUp" description="Link ClickUp user to sync tasks and workload." />
        </TabsContent>
      </Tabs>

      <Separator />
      <div className="text-xs text-muted-foreground">
        Created {formatDate(emp.created_at)} · Updated {formatDate(emp.updated_at)}
      </div>

      <EmployeeFormDialog open={editOpen} onOpenChange={setEditOpen} editing={emp} onSubmit={async (v) => {
        await m.update.mutateAsync({ id: emp.id, values: v });
        toast.success("Employee updated");
      }} />
    </div>
  );
}

function InfoCard({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {title}
      </div>
      <div className="text-sm">{children}</div>
    </Card>
  );
}

function Field({ label, value, mono }: { label: string; value: string | null | undefined; mono?: boolean }) {
  return (
    <Card className="p-4">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className={`mt-1 text-sm ${mono ? "font-mono" : ""}`}>{value ?? "—"}</div>
    </Card>
  );
}

function IntegrationCard({ icon: Icon, name, description }: { icon: React.ComponentType<{ className?: string }>; name: string; description: string }) {
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <div className="font-medium">{name}</div>
        <Badge variant="outline" className="ml-auto text-[10px]">Not linked</Badge>
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </Card>
  );
}