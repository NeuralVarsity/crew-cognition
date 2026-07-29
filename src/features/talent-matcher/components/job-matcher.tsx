import { useCallback, useState } from "react";
import { FileUp, Loader2, Sparkle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/common/page-header";
import { cn } from "@/lib/utils";
import { ACCEPTED_DOC_TYPES, extractDocumentText, type ExtractedDocument } from "../lib/documents";
import { useRunMatch } from "../hooks";
import { MatchResultView } from "./match-result-view";

export function JobMatcher() {
  const match = useRunMatch();
  const [doc, setDoc] = useState<ExtractedDocument | null>(null);
  const [text, setText] = useState("");
  const [dragging, setDragging] = useState(false);

  const handleFiles = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    try {
      const parsed = await extractDocumentText(file);
      setDoc(parsed);
      setText(parsed.text);
      toast.success(`${parsed.name} parsed — ${parsed.chars.toLocaleString()} characters`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not read that file");
    }
  }, []);

  const result = match.data;
  const top = result?.candidates[0];
  const runner = result?.candidates[1];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Job & project matcher"
        description="Upload a JD, RFP or project brief. Requirements are extracted, then every employee is ranked on synced GitHub, Jira, ClickUp and HR evidence."
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Requirement source</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-center transition-colors",
              dragging ? "border-primary bg-primary/5" : "border-border",
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              void handleFiles(Array.from(e.dataTransfer.files));
            }}
          >
            <FileUp className="size-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Drag &amp; drop a PDF, DOCX, TXT or Excel file</p>
            <label className="cursor-pointer text-sm font-medium text-primary underline-offset-4 hover:underline">
              Browse files
              <input
                type="file"
                accept={ACCEPTED_DOC_TYPES}
                className="hidden"
                onChange={(e) => {
                  void handleFiles(Array.from(e.target.files ?? []));
                  e.target.value = "";
                }}
              />
            </label>
            {doc ? <Badge variant="secondary">{doc.name}</Badge> : null}
          </div>

          <Textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setDoc(null);
            }}
            rows={8}
            placeholder="…or paste the job description / RFP text here"
          />

          <Button
            disabled={text.trim().length < 20 || match.isPending}
            onClick={() =>
              match.mutate({
                query: text.trim(),
                sourceName: doc?.name ?? null,
                kind: doc ? "document" : "job_description",
                topN: 10,
              })
            }
          >
            {match.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Sparkle className="mr-2 size-4" />}
            {match.isPending ? "Ranking employees…" : "Extract & rank employees"}
          </Button>
        </CardContent>
      </Card>

      {result ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "Top match", value: top?.name, score: top?.overall },
              { label: "Runner-up", value: runner?.name, score: runner?.overall },
              {
                label: "Largest skill gap",
                value: result.skillGaps[0]?.skill ?? "None detected",
                score: result.skillGaps[0] ? Math.round(result.skillGaps[0].coverage) / 10 : undefined,
              },
            ].map((item) => (
              <Card key={item.label}>
                <CardContent className="py-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</p>
                  <p className="text-lg font-semibold">{item.value ?? "—"}</p>
                  {item.score != null ? (
                    <p className="text-sm text-muted-foreground">{item.score.toFixed(1)}/10</p>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
          <MatchResultView result={result} />
        </>
      ) : null}
    </div>
  );
}