import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/auth-provider";
import { useQuery } from "@tanstack/react-query";
import {
  DEPARTMENT_STATUSES, DEPT_COLORS, DEPT_ICONS,
  emptyDepartmentForm, type DepartmentFormValues, type DepartmentRow, type DepartmentStatus,
} from "./types";
import { generateDepartmentCode } from "./api";

const NONE = "__none__";

function toValues(r: DepartmentRow): DepartmentFormValues {
  return {
    name: r.name,
    department_code: r.department_code ?? "",
    description: r.description ?? "",
    manager_id: r.manager_id ?? "",
    location: r.location ?? "",
    email: r.email ?? "",
    phone: r.phone ?? "",
    budget: r.budget != null ? String(r.budget) : "",
    status: r.status,
    color: r.color ?? "#6366f1",
    icon: r.icon ?? "Building2",
    notes: r.notes ?? "",
  };
}

export function DepartmentFormDialog({
  open, onOpenChange, initial, existingCodes, onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: DepartmentRow | null;
  existingCodes: Set<string>;
  onSubmit: (v: DepartmentFormValues) => Promise<void>;
}) {
  const { organizationId } = useAuth();
  const [v, setV] = useState<DepartmentFormValues>(emptyDepartmentForm());
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const managers = useQuery({
    queryKey: ["dept-manager-candidates", organizationId],
    enabled: !!organizationId && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, email")
        .eq("organization_id", organizationId!)
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!open) return;
    setErr(null);
    setV(initial ? toValues(initial) : emptyDepartmentForm());
  }, [open, initial]);

  const isEdit = !!initial;
  const set = <K extends keyof DepartmentFormValues>(k: K, val: DepartmentFormValues[K]) =>
    setV((p) => ({ ...p, [k]: val }));

  const managerOptions = useMemo(() => managers.data ?? [], [managers.data]);

  const handleAutoCode = () => {
    set("department_code", generateDepartmentCode(v.name, existingCodes));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!v.name.trim()) return setErr("Department name is required");
    if (v.email && !/^\S+@\S+\.\S+$/.test(v.email)) return setErr("Invalid email");
    if (v.budget && Number.isNaN(Number(v.budget))) return setErr("Budget must be numeric");
    const code = v.department_code.trim();
    if (code) {
      const dup = existingCodes.has(code.toLowerCase()) && (!initial || initial.department_code?.toLowerCase() !== code.toLowerCase());
      if (dup) return setErr("Department code must be unique");
    }
    setSaving(true);
    try {
      await onSubmit({ ...v, department_code: code });
      onOpenChange(false);
    } catch (e2) {
      setErr((e2 as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit department" : "Add department"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update department details." : "Create a new department in your organization."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-5">
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Department name *</Label>
              <Input value={v.name} onChange={(e) => set("name", e.target.value)} required maxLength={120} />
            </div>
            <div>
              <Label>Department code</Label>
              <div className="flex gap-2">
                <Input value={v.department_code} onChange={(e) => set("department_code", e.target.value)} maxLength={40} />
                <Button type="button" variant="outline" onClick={handleAutoCode}>Auto</Button>
              </div>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={v.status} onValueChange={(x) => set("status", x as DepartmentStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DEPARTMENT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>Description</Label>
              <Textarea value={v.description} onChange={(e) => set("description", e.target.value)} rows={2} maxLength={500} />
            </div>
          </section>

          <Separator />

          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label>Manager</Label>
              <Select value={v.manager_id || NONE} onValueChange={(x) => set("manager_id", x === NONE ? "" : x)}>
                <SelectTrigger><SelectValue placeholder="Select manager" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>No manager</SelectItem>
                  {managerOptions.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.full_name || m.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Location</Label>
              <Input value={v.location} onChange={(e) => set("location", e.target.value)} maxLength={120} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={v.email} onChange={(e) => set("email", e.target.value)} maxLength={255} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={v.phone} onChange={(e) => set("phone", e.target.value)} maxLength={40} />
            </div>
            <div>
              <Label>Budget</Label>
              <Input inputMode="decimal" value={v.budget} onChange={(e) => set("budget", e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label>Icon</Label>
              <Select value={v.icon} onValueChange={(x) => set("icon", x)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DEPT_ICONS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {DEPT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => set("color", c)}
                    className={`h-7 w-7 rounded-full border-2 ${v.color === c ? "border-foreground" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                    aria-label={c}
                  />
                ))}
              </div>
            </div>
            <div className="sm:col-span-2">
              <Label>Notes</Label>
              <Textarea value={v.notes} onChange={(e) => set("notes", e.target.value)} rows={2} maxLength={1000} />
            </div>
          </section>

          {err && <p className="text-sm text-destructive">{err}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}