import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, CheckCircle2, Copy, Database, FileWarning, UploadCloud } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ImportRecord } from "../types";

function lastDays(count: number) {
  const days: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

export function UploadDashboard({ imports, loading }: { imports: ImportRecord[]; loading: boolean }) {
  const stats = useMemo(() => {
    const successful = imports.filter((i) => i.status === "completed").length;
    const failed = imports.filter((i) => i.status === "failed" || i.status === "partial").length;
    return {
      total: imports.length,
      successful,
      failed,
      records: imports.reduce((sum, i) => sum + i.imported_rows + i.updated_rows, 0),
      duplicates: imports.reduce((sum, i) => sum + i.duplicate_rows, 0),
      errors: imports.reduce((sum, i) => sum + i.error_count, 0),
    };
  }, [imports]);

  const series = useMemo(() => {
    const days = lastDays(30);
    const map = new Map(days.map((d) => [d, { day: d.slice(5), uploads: 0, records: 0, errors: 0 }]));
    for (const imp of imports) {
      const key = imp.created_at.slice(0, 10);
      const bucket = map.get(key);
      if (!bucket) continue;
      bucket.uploads += 1;
      bucket.records += imp.imported_rows + imp.updated_rows;
      bucket.errors += imp.error_count;
    }
    return Array.from(map.values());
  }, [imports]);

  const byDataset = useMemo(() => {
    const map = new Map<string, number>();
    for (const imp of imports) map.set(imp.dataset, (map.get(imp.dataset) ?? 0) + 1);
    return Array.from(map, ([dataset, uploads]) => ({ dataset: dataset.replace(/_/g, " "), uploads })).sort(
      (a, b) => b.uploads - a.uploads,
    );
  }, [imports]);

  const cards = [
    { label: "Total uploads", value: stats.total, icon: UploadCloud },
    { label: "Successful imports", value: stats.successful, icon: CheckCircle2 },
    { label: "Failed imports", value: stats.failed, icon: AlertTriangle },
    { label: "Records imported", value: stats.records, icon: Database },
    { label: "Duplicate records", value: stats.duplicates, icon: Copy },
    { label: "Validation errors", value: stats.errors, icon: FileWarning },
  ];

  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <c.icon className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-xl font-semibold tabular-nums">{c.value.toLocaleString()}</p>
                <p className="truncate text-xs text-muted-foreground">{c.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Imports per day" description="Upload volume over the last 30 days">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={series}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} interval={4} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Area type="monotone" dataKey="uploads" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Records imported" description="Rows written per day">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} interval={4} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="records" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Validation errors" description="Errors detected per day">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={series}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} interval={4} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="errors" fill="hsl(var(--destructive))" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Upload trends by dataset" description="Which datasets are imported most">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={byDataset} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis type="category" dataKey="dataset" tick={{ fontSize: 11 }} width={110} />
              <Tooltip />
              <Bar dataKey="uploads" fill="hsl(var(--primary))" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

function ChartCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="pl-0">{children}</CardContent>
    </Card>
  );
}