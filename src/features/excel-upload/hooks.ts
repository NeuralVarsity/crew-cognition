import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  deleteImportJob,
  getImportContext,
  getImportFileUrl,
  listImportIssues,
  listImportJobs,
} from "./api/imports.functions";
import type { ImportRecord } from "./types";

export function useImportContext() {
  return useQuery({ queryKey: ["imports", "context"], queryFn: () => getImportContext(), staleTime: 60_000 });
}

export function useImportJobs() {
  return useQuery({
    queryKey: ["imports", "jobs"],
    queryFn: async () => (await listImportJobs()) as unknown as ImportRecord[],
  });
}

export function useImportIssues(importId: string | null) {
  return useQuery({
    queryKey: ["imports", "issues", importId],
    enabled: !!importId,
    queryFn: () => listImportIssues({ data: { importId: importId! } }),
  });
}

export function useDeleteImport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (importId: string) => deleteImportJob({ data: { importId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["imports"] }),
  });
}

export function useImportFileUrl() {
  return useMutation({ mutationFn: (path: string) => getImportFileUrl({ data: { path } }) });
}

/** Streams the original file into the private `imports` bucket, scoped by organization. */
export async function uploadSourceFile(file: File, organizationId: string) {
  const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(-120);
  const path = `${organizationId}/${crypto.randomUUID()}-${safeName}`;
  const { error } = await supabase.storage.from("imports").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "application/octet-stream",
  });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  return path;
}