import { useMemo, useState } from "react";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/common/page-header";
import { useRunMatch, useTalentContext } from "../hooks";
import { MATCH_DIMENSIONS, DIMENSION_LABELS } from "../types";

export function EmployeeCompare() {
  const { data: context } = useTalentContext();
  const match = useRunMatch();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("Senior full-stack engineer with React, TypeScript and Python");

  const employees = context?.employees ?? [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? employees.filter((e) => `${e.name} ${e.designation ?? ""} ${e.department ?? ""}`.toLowerCase().includes(q))
      : employees;
    return list.slice(0, 200);
  }, [employees, search]);

  const result = match.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employee comparison"
        description="Score two or more employees side by side against the same requirement using synced delivery data."
      />

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Select employees</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employees" />
            <ScrollArea className="h-72 rounded-md border">
              <div className="space-y-1 p-2">
                {filtered.map((employee) => (
                  <label key={employee.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent">
                    <Checkbox
                      checked={selected.includes(employee.id)}
                      onCheckedChange={(checked) =>
                        setSelected((prev) =>
                          checked === true ? [...prev, employee.id] : prev.filter((id) => id !== employee.id),
                        )
                      }
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {employee.name}
                      <span className="block truncate text-xs text-muted-foreground">
                        {[employee.designation, employee.department].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                  </label>
                ))}
                {!filtered.length ? <p className="p-2 text-xs text-muted-foreground">No employees found.</p> : null}
              </div>
            </ScrollArea>
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Requirement to compare against" />
            <Button
              className="w-full"
              disabled={selected.length < 2 || match.isPending}
              onClick={() =>
                match.mutate({
                  query,
                  kind: "comparison",
                  employeeIds: selected,
                  topN: Math.max(selected.length, 2),
                })
              }
            >
              <Users className="mr-2 size-4" />
              {match.isPending ? "Comparing…" : `Compare ${selected.length || ""}`}
            </Button>
            {selected.length < 2 ? (
              <p className="text-xs text-muted-foreground">Select at least two employees.</p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Side-by-side scorecard</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {!result ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Pick employees and a requirement to build the comparison.
              </p>
            ) : (
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 pr-4 font-medium text-muted-foreground">Dimension</th>
                    {result.candidates.map((c) => (
                      <th key={c.employeeId} className="py-2 pr-4 font-medium">
                        {c.name}
                        <span className="block text-xs font-normal text-muted-foreground">
                          {c.designation ?? "—"}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b bg-muted/40">
                    <td className="py-2 pr-4 font-medium">Overall</td>
                    {result.candidates.map((c) => (
                      <td key={c.employeeId} className="py-2 pr-4 font-semibold">
                        {c.overall.toFixed(1)}/10 <Badge variant="outline">{c.fit}</Badge>
                      </td>
                    ))}
                  </tr>
                  {MATCH_DIMENSIONS.map((key) => (
                    <tr key={key} className="border-b">
                      <td className="py-2 pr-4 text-muted-foreground">{DIMENSION_LABELS[key]}</td>
                      {result.candidates.map((c) => {
                        const d = c.dimensions.find((dim) => dim.key === key);
                        return (
                          <td key={c.employeeId} className="py-2 pr-4">
                            {d ? `${d.score.toFixed(1)}${d.available ? "" : " (no data)"}` : "—"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  <tr className="border-b">
                    <td className="py-2 pr-4 text-muted-foreground">Availability</td>
                    {result.candidates.map((c) => (
                      <td key={c.employeeId} className="py-2 pr-4">
                        {c.availability.label} · {c.availability.allocation}%
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4 text-muted-foreground">Matched skills</td>
                    {result.candidates.map((c) => (
                      <td key={c.employeeId} className="py-2 pr-4 text-xs">
                        {c.matchedSkills.join(", ") || "—"}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4 text-muted-foreground">Missing skills</td>
                    {result.candidates.map((c) => (
                      <td key={c.employeeId} className="py-2 pr-4 text-xs">
                        {c.missingSkills.join(", ") || "—"}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 text-muted-foreground">Recommendation</td>
                    {result.candidates.map((c) => (
                      <td key={c.employeeId} className="py-2 pr-4 text-xs">
                        {c.recommendation} — {c.reasons[0] ?? ""}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}