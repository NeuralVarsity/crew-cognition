import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getAiIntelligence, saveAiSettings } from "./api/ai.functions";
import type { AiSettings } from "./types";

export const AI_QUERY_KEY = ["ai", "intelligence"];

export const useAiIntelligence = () =>
  useQuery({ queryKey: AI_QUERY_KEY, queryFn: () => getAiIntelligence(), staleTime: 60_000 });

export function useSaveAiSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (settings: AiSettings) => saveAiSettings({ data: settings }),
    onSuccess: () => {
      toast.success("AI scoring settings saved — scores recalculated");
      qc.invalidateQueries({ queryKey: AI_QUERY_KEY });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}