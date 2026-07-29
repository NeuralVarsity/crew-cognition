import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  createTalentThread,
  deleteTalentRecommendation,
  deleteTalentThread,
  getTalentContext,
  getTalentThreadMessages,
  listTalentRecommendations,
  listTalentThreads,
  renameTalentThread,
  runTalentMatch,
  saveTalentSettings,
} from "./api/talent.functions";
import type { MatchResult, TalentSettings } from "./types";

export const TALENT_KEYS = {
  context: ["talent", "context"] as const,
  threads: ["talent", "threads"] as const,
  messages: (id: string) => ["talent", "messages", id] as const,
  history: ["talent", "history"] as const,
};

export const useTalentContext = () =>
  useQuery({ queryKey: TALENT_KEYS.context, queryFn: () => getTalentContext(), staleTime: 300_000 });

export const useTalentThreads = () =>
  useQuery({ queryKey: TALENT_KEYS.threads, queryFn: () => listTalentThreads(), staleTime: 30_000 });

export const useTalentMessages = (threadId: string | undefined) =>
  useQuery({
    queryKey: TALENT_KEYS.messages(threadId ?? "none"),
    enabled: !!threadId,
    queryFn: () => getTalentThreadMessages({ data: { threadId: threadId! } }),
  });

export const useTalentHistory = () =>
  useQuery({ queryKey: TALENT_KEYS.history, queryFn: () => listTalentRecommendations(), staleTime: 30_000 });

export function useThreadMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: TALENT_KEYS.threads });
  return {
    create: useMutation({
      mutationFn: (title?: string) => createTalentThread({ data: { title } }),
      onSuccess: invalidate,
      onError: (e: Error) => toast.error(e.message),
    }),
    rename: useMutation({
      mutationFn: (v: { id: string; title: string }) => renameTalentThread({ data: v }),
      onSuccess: invalidate,
      onError: (e: Error) => toast.error(e.message),
    }),
    remove: useMutation({
      mutationFn: (id: string) => deleteTalentThread({ data: { id } }),
      onSuccess: invalidate,
      onError: (e: Error) => toast.error(e.message),
    }),
  };
}

export function useRunMatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      query: string;
      sourceName?: string | null;
      kind?: string;
      topN?: number;
      departmentId?: string | null;
      teamId?: string | null;
      employeeIds?: string[];
    }) => runTalentMatch({ data: input }) as Promise<MatchResult>,
    onSuccess: () => qc.invalidateQueries({ queryKey: TALENT_KEYS.history }),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useSaveTalentSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (s: TalentSettings) =>
      saveTalentSettings({ data: { weights: s.weights, rules: s.rules, roleTemplates: s.roleTemplates } }),
    onSuccess: () => {
      toast.success("Matching configuration saved");
      qc.invalidateQueries({ queryKey: TALENT_KEYS.context });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteRecommendation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTalentRecommendation({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: TALENT_KEYS.history }),
    onError: (e: Error) => toast.error(e.message),
  });
}

export type ChatStreamEvent =
  | { type: "status"; text: string }
  | { type: "match"; result: MatchResult }
  | { type: "text-delta"; delta: string }
  | { type: "error"; message: string }
  | { type: "done" };

/** Streams a talent-match answer (NDJSON) from the server route. */
export async function streamTalentChat(
  body: {
    threadId?: string;
    query: string;
    sourceName?: string | null;
    departmentId?: string | null;
    teamId?: string | null;
    topN?: number;
  },
  onEvent: (event: ChatStreamEvent) => void,
  signal?: AbortSignal,
) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Your session expired — sign in again.");

  const response = await fetch("/api/talent-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok || !response.body) {
    throw new Error((await response.text()) || "The assistant could not respond");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        onEvent(JSON.parse(line) as ChatStreamEvent);
      } catch {
        /* ignore partial frame */
      }
    }
  }
}