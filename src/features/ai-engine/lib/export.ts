import type { AiIntelligence, EmployeeScore } from "../types";
import { SUB_SCORE_KEYS, SUB_SCORE_LABELS } from "../types";

function download(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function rowsFor(employees: EmployeeScore[]) {
  return employees.map((e) => ({
    Name: e.name,
    Email: e.email,
    Department: e.departmentName ?? "—",
    Team: e.teamName ?? "—",
    "Overall Score": e.overall,
    "Org Rank": e.orgRank,
    ...Object.fromEntries(SUB_SCORE_KEYS.map((k) => [SUB_SCORE_LABELS[k], e.subScores[k]])),
    Assigned: e.workload.assigned,
    Completed: e.workload.completed,
    Overdue: e.workload.overdue,
    "Completion %": e.productivity.taskCompletionRate,
    "Tracked Hours": e.productivity.trackedHours,
    "Burnout Risk": e.workload.burnoutRisk,
  }));
}

export function exportScoresCsv(employees: EmployeeScore[], name = "ai-scorecards") {
  const rows = rowsFor(employees);
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => `"${String((r as never)[h] ?? "")}"`).join(",")),
  ].join("\n");
  download(`${name}.csv`, new Blob([csv], { type: "text/csv;charset=utf-8;" }));
}

export async function exportScoresExcel(employees: EmployeeScore[], name = "ai-scorecards") {
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.json_to_sheet(rowsFor(employees));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "AI Scores");
  XLSX.writeFile(wb, `${name}.xlsx`);
}

export async function exportExecutiveSummaryPdf(data: AiIntelligence) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text("AI Workforce Intelligence — Executive Summary", 14, 18);
  doc.setFontSize(10);
  doc.text(`Generated ${new Date(data.generatedAt).toLocaleString()}`, 14, 25);

  let y = 36;
  const line = (label: string, value: string | number) => {
    doc.text(`${label}: ${value}`, 14, y);
    y += 6;
  };
  line("Employees analysed", data.totals.employees);
  line("Average AI score", data.totals.averageScore);
  line("Overall productivity", `${data.totals.overallProductivity}%`);
  line("High performers", data.totals.highPerformers);
  line("Needing support", data.totals.needsSupport);
  line("Burnout alerts", data.totals.burnoutAlerts);
  line("Promotion candidates", data.totals.promotionCandidates);

  y += 4;
  doc.setFontSize(12);
  doc.text("Top 10 employees", 14, y);
  y += 7;
  doc.setFontSize(10);
  for (const e of data.employees.slice(0, 10)) {
    doc.text(`${e.orgRank}. ${e.name} — ${e.overall} (${e.departmentName ?? "—"})`, 14, y);
    y += 6;
  }

  y += 4;
  doc.setFontSize(12);
  doc.text("Key insights", 14, y);
  y += 7;
  doc.setFontSize(9);
  for (const i of data.insights.slice(0, 12)) {
    for (const chunk of doc.splitTextToSize(`• ${i.text}`, 180) as string[]) {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(chunk, 14, y);
      y += 5;
    }
  }
  doc.save("ai-executive-summary.pdf");
}

export function exportGroupsCsv(
  rows: { name: string; headcount: number; average: number; top: number; bottom: number; completionRate: number; rank: number }[],
  name = "ai-department-report",
) {
  if (rows.length === 0) return;
  const headers = ["Rank", "Name", "Headcount", "Average", "Top", "Bottom", "Completion %"];
  const csv = [
    headers.join(","),
    ...rows.map((r) => [r.rank, `"${r.name}"`, r.headcount, r.average, r.top, r.bottom, r.completionRate].join(",")),
  ].join("\n");
  download(`${name}.csv`, new Blob([csv], { type: "text/csv;charset=utf-8;" }));
}