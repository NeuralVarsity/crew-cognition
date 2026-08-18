type Row = Record<string, string | number>;

function download(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportRowsCsv(rows: Row[], name: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => `"${String(r[h] ?? "")}"`).join(",")),
  ].join("\n");
  download(`${name}.csv`, new Blob([csv], { type: "text/csv;charset=utf-8;" }));
}

export async function exportRowsExcel(rows: Row[], name: string, sheet = "Report") {
  if (!rows.length) return;
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheet);
  XLSX.writeFile(wb, `${name}.xlsx`);
}

export async function exportSectionsPdf(
  title: string,
  sections: { heading: string; lines: string[] }[],
  name: string,
) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(title, 14, 18);
  doc.setFontSize(9);
  doc.text(`Generated ${new Date().toLocaleString()}`, 14, 25);

  let y = 36;
  const nextPage = () => {
    if (y > 275) {
      doc.addPage();
      y = 20;
    }
  };
  for (const section of sections) {
    nextPage();
    doc.setFontSize(12);
    doc.text(section.heading, 14, y);
    y += 7;
    doc.setFontSize(9);
    for (const l of section.lines.slice(0, 40)) {
      nextPage();
      for (const chunk of doc.splitTextToSize(`• ${l}`, 180) as string[]) {
        nextPage();
        doc.text(chunk, 16, y);
        y += 5;
      }
    }
    y += 6;
  }
  doc.save(`${name}.pdf`);
}
