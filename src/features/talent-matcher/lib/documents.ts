/** Client-side document text extraction for JD / RFP uploads. */
export const ACCEPTED_DOC_TYPES = ".pdf,.docx,.txt,.md,.csv,.xlsx,.xls";

export type ExtractedDocument = { name: string; text: string; chars: number };

function extension(name: string) {
  return name.slice(name.lastIndexOf(".") + 1).toLowerCase();
}

async function readPdf(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= Math.min(doc.numPages, 40); i += 1) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    pages.push(
      content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .replace(/\s+/g, " "),
    );
  }
  return pages.join("\n\n");
}

type MammothLike = {
  extractRawText: (input: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }>;
};

async function readDocx(file: File): Promise<string> {
  const mod = (await import(/* @vite-ignore */ "mammoth/mammoth.browser.js")) as unknown as
    | MammothLike
    | { default: MammothLike };
  const api = "extractRawText" in mod ? mod : mod.default;
  const { value } = await api.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return value;
}

async function readSheet(file: File): Promise<string> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
  return wb.SheetNames.slice(0, 5)
    .map((name) => `# ${name}\n${XLSX.utils.sheet_to_csv(wb.Sheets[name])}`)
    .join("\n\n");
}

export async function extractDocumentText(file: File): Promise<ExtractedDocument> {
  const ext = extension(file.name);
  let text = "";
  if (ext === "pdf") text = await readPdf(file);
  else if (ext === "docx") text = await readDocx(file);
  else if (ext === "xlsx" || ext === "xls") text = await readSheet(file);
  else text = await file.text();

  text = text.replace(/\u0000/g, "").trim();
  if (!text) throw new Error(`No readable text found in ${file.name}`);
  return { name: file.name, text: text.slice(0, 60_000), chars: text.length };
}