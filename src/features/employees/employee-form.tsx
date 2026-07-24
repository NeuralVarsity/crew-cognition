import { useEffect, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/providers/auth-provider";
import { useDepartments, useTeams, useEmployees } from "@/features/shared/hooks";
import { initials } from "@/lib/format";
import { generateEmployeeCode, uploadEmployeePhoto } from "./api";
import { useSignedPhoto } from "./hooks";
import {
  EMPLOYEE_STATUSES, EMPLOYMENT_TYPES,
  emptyEmployeeForm,
  type EmployeeFormValues, type EmployeeRow, type EmployeeStatus, type EmploymentType,
} from "./types";

const NONE = "__none__";

function toFormValues(r: EmployeeRow): EmployeeFormValues {
  return {
    employee_code: r.employee_code,
    first_name: r.first_name ?? r.full_name.split(" ")[0] ?? "",
    last_name: r.last_name ?? r.full_name.split(" ").slice(1).join(" ") ?? "",
    email: r.email,
    phone: r.phone ?? "",
    dob: r.dob ?? "",
    joining_date: r.joining_date ?? "",
    designation: r.designation ?? "",
    department_id: r.department_id ?? "",
    team_id: r.team_id ?? "",
    manager_id: r.manager_id ?? "",
    employment_type: r.employment_type,
    status: r.status,
    work_location: r.work_location ?? "",
    office_location: r.office_location ?? "",
    salary: r.salary != null ? String(r.salary) : "",
    notes: r.notes ?? "",
    profile_photo: r.profile_photo ?? "",
  };
}

export function EmployeeFormDialog({
  open, onOpenChange, editing, onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: EmployeeRow | null;
  onSubmit: (v: EmployeeFormValues) => Promise<void>;
}) {
  const { organizationId, isOrgAdmin } = useAuth();
  const depts = useDepartments();
  const emps = useEmployees();
  const [form, setForm] = useState<EmployeeFormValues>(emptyEmployeeForm);
  const teams = useTeams(form.department_id || null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const photoUrl = useSignedPhoto(form.profile_photo);

  useEffect(() => {
    if (!open) return;
    if (editing) setForm(toFormValues(editing));
    else setForm({ ...emptyEmployeeForm, employee_code: generateEmployeeCode() });
  }, [open, editing]);

  const set = <K extends keyof EmployeeFormValues>(k: K, v: EmployeeFormValues[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const validate = (): string | null => {
    if (!form.first_name.trim()) return "First name is required";
    if (!form.last_name.trim()) return "Last name is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return "Valid email is required";
    if (!form.employee_code.trim()) return "Employee ID is required";
    if (form.phone && !/^[+\-()0-9\s]{6,20}$/.test(form.phone)) return "Invalid phone number";
    if (form.salary && Number.isNaN(Number(form.salary))) return "Salary must be a number";
    return null;
  };

  const handleFile = async (file: File | null) => {
    if (!file || !organizationId) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Photo must be under 5MB"); return; }
    setUploading(true);
    try {
      const path = await uploadEmployeePhoto(organizationId, file);
      set("profile_photo", path);
      toast.success("Photo uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally { setUploading(false); }
  };

  const managerOptions = (emps.data ?? []).filter((e) => e.id !== editing?.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const err = validate();
            if (err) { toast.error(err); return; }
            setLoading(true);
            try { await onSubmit(form); onOpenChange(false); }
            catch (ex) { toast.error(ex instanceof Error ? ex.message : "Save failed"); }
            finally { setLoading(false); }
          }}
          className="space-y-5"
        >
          <DialogHeader>
            <DialogTitle>{editing ? "Edit employee" : "Add employee"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update employee details." : "Create a new employee profile."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              {photoUrl && <AvatarImage src={photoUrl} alt={form.first_name} />}
              <AvatarFallback>{initials(`${form.first_name} ${form.last_name}`)}</AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-2">
              <label className="cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
                <span className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-accent">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Upload photo
                </span>
              </label>
              {form.profile_photo && (
                <Button type="button" variant="ghost" size="sm" onClick={() => set("profile_photo", "")}>
                  <X className="mr-1 h-3 w-3" /> Remove
                </Button>
              )}
            </div>
          </div>

          <Separator />
          <div className="text-xs font-medium uppercase text-muted-foreground">Personal</div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Employee ID *"><Input value={form.employee_code} onChange={(e) => set("employee_code", e.target.value)} /></Field>
            <Field label="Date of Birth"><Input type="date" value={form.dob} onChange={(e) => set("dob", e.target.value)} /></Field>
            <Field label="First name *"><Input value={form.first_name} onChange={(e) => set("first_name", e.target.value)} /></Field>
            <Field label="Last name *"><Input value={form.last_name} onChange={(e) => set("last_name", e.target.value)} /></Field>
            <Field label="Email *"><Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></Field>
            <Field label="Phone"><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+1 555 000 0000" /></Field>
          </div>

          <Separator />
          <div className="text-xs font-medium uppercase text-muted-foreground">Employment</div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Designation"><Input value={form.designation} onChange={(e) => set("designation", e.target.value)} /></Field>
            <Field label="Joining date"><Input type="date" value={form.joining_date} onChange={(e) => set("joining_date", e.target.value)} /></Field>
            <Field label="Department">
              <Select value={form.department_id || NONE} onValueChange={(v) => setForm((f) => ({ ...f, department_id: v === NONE ? "" : v, team_id: "" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {depts.data?.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Team">
              <Select value={form.team_id || NONE} onValueChange={(v) => set("team_id", v === NONE ? "" : v)} disabled={!form.department_id}>
                <SelectTrigger><SelectValue placeholder={form.department_id ? "None" : "Select department first"} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {teams.data?.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Manager">
              <Select value={form.manager_id || NONE} onValueChange={(v) => set("manager_id", v === NONE ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {managerOptions.map((e) => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Employment type">
              <Select value={form.employment_type} onValueChange={(v) => set("employment_type", v as EmploymentType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EMPLOYMENT_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t.replace("_", " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={form.status} onValueChange={(v) => set("status", v as EmployeeStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EMPLOYEE_STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Work location"><Input value={form.work_location} onChange={(e) => set("work_location", e.target.value)} placeholder="Remote, Hybrid, On-site" /></Field>
            <Field label="Office location"><Input value={form.office_location} onChange={(e) => set("office_location", e.target.value)} placeholder="City / Office" /></Field>
            {isOrgAdmin && (
              <Field label="Salary (admin only)"><Input type="number" step="0.01" value={form.salary} onChange={(e) => set("salary", e.target.value)} /></Field>
            )}
          </div>

          <Separator />
          <Field label="Notes">
            <Textarea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Save changes" : "Create employee"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}