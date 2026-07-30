import { createFileRoute } from "@tanstack/react-router";

type Body = {
  threadId?: string;
  query?: string;
  sourceName?: string | null;
  departmentId?: string | null;
  teamId?: string | null;
  topN?: number;
};

export const Route = createFileRoute("/api/talent-chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { supabaseFromRequest } = await import("@/features/talent-matcher/lib/auth.server");
        let supabase, userId: string;
        try {
          const auth = await supabaseFromRequest(request);
          supabase = auth.supabase;
          userId = auth.userId;
        } catch {
          return new Response("Unauthorized", { status: 401 });
        }

        const body = (await request.json()) as Body;
        const query = (body.query ?? "").trim();
        if (query.length < 2) return new Response("A question is required", { status: 400 });

        const { runMatch } = await import("@/features/talent-matcher/lib/service.server");
        const { classifyInsight, runInsight } = await import("@/features/talent-matcher/lib/insights.server");
        const { currentOrganizationId } = await import("@/features/talent-matcher/lib/settings.server");
        const { streamText } = await import("ai");
        const { createLovableAiGatewayProvider, requireLovableApiKey, TALENT_MODEL } = await import(
          "@/lib/ai-gateway.server"
        );

        const encoder = new TextEncoder();
        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            const send = (event: Record<string, unknown>) =>
              controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));

            try {
              send({ type: "status", text: "Reading synchronized GitHub, Jira, ClickUp and HR data…" });

              const intent = body.sourceName ? null : classifyInsight(query);

              if (intent) {
                const insight = await runInsight(supabase!, userId, intent, query);
                send({ type: "insight", insight });
                send({ type: "status", text: "Explaining the analysis…" });

                let insightNarrative = "";
                try {
                  const gateway = createLovableAiGatewayProvider(requireLovableApiKey());
                  const ai = streamText({
                    model: gateway(TALENT_MODEL),
                    system:
                      "You are the TalentAI workforce copilot. Explain an analysis that has ALREADY been computed from " +
                      "synchronized GitHub, Jira, ClickUp, Excel and AI Intelligence data. Never invent people, numbers or " +
                      "scores — only reference the JSON provided. Answer in concise markdown: a one-line verdict, then 3–5 " +
                      "bullets naming specific people and their evidence, then one recommended action. The detailed cards are " +
                      "already rendered in the UI, so do not repeat every metric.",
                    prompt: `User question: ${query}\n\nComputed analysis JSON:\n${JSON.stringify({
                      ...insight,
                      people: insight.people.slice(0, 6),
                    })}`,
                  });
                  for await (const delta of ai.textStream) {
                    insightNarrative += delta;
                    send({ type: "text-delta", delta });
                  }
                } catch {
                  insightNarrative =
                    [insight.subtitle, ...insight.notes].filter(Boolean).map((l) => `- ${l}`).join("\n") ||
                    "Analysis computed from synchronized data.";
                  send({ type: "text-delta", delta: insightNarrative });
                }

                if (body.threadId) {
                  try {
                    const organizationId = await currentOrganizationId(supabase!, userId);
                    const now = Date.now();
                    const { error } = await supabase!.from("talent_messages").insert([
                      {
                        organization_id: organizationId,
                        thread_id: body.threadId,
                        user_id: userId,
                        role: "user",
                        client_message_id: `u_${now}`,
                        parts: [{ type: "text", text: query }],
                      },
                      {
                        organization_id: organizationId,
                        thread_id: body.threadId,
                        user_id: userId,
                        role: "assistant",
                        client_message_id: `a_${now}`,
                        parts: [
                          { type: "text", text: insightNarrative },
                          { type: "insight", insight },
                        ],
                      },
                    ]);
                    if (error) console.error("[ai-workspace] persist failed", error.message);
                    await supabase!
                      .from("talent_threads")
                      .update({ updated_at: new Date().toISOString() })
                      .eq("id", body.threadId);
                  } catch (error) {
                    console.error("[ai-workspace] persist error", error);
                  }
                }

                send({ type: "done" });
                return;
              }

              const result = await runMatch(supabase!, userId, {
                query,
                sourceName: body.sourceName ?? null,
                kind: body.sourceName ? "document" : "role",
                topN: body.topN,
                departmentId: body.departmentId ?? null,
                teamId: body.teamId ?? null,
              });

              send({ type: "match", result });
              send({ type: "status", text: "Explaining the ranking…" });

              let narrative = "";
              try {
                const gateway = createLovableAiGatewayProvider(requireLovableApiKey());
                const brief = {
                  requirement: result.requirement,
                  poolSize: result.poolSize,
                  executiveSummary: result.executiveSummary,
                  skillGaps: result.skillGaps.slice(0, 5),
                  prediction: result.prediction,
                  candidates: result.candidates.slice(0, 5).map((c) => ({
                    name: c.name,
                    designation: c.designation,
                    department: c.department,
                    overall: c.overall,
                    fit: c.fit,
                    availability: c.availability.label,
                    matchedSkills: c.matchedSkills.slice(0, 8),
                    missingSkills: c.missingSkills.slice(0, 6),
                    strengths: c.strengths.slice(0, 4),
                    weaknesses: c.weaknesses.slice(0, 3),
                    dimensions: c.dimensions.map((d) => ({ label: d.label, score: d.score })),
                    metrics: c.metrics,
                  })),
                };
                const ai = streamText({
                  model: gateway(TALENT_MODEL),
                  system:
                    "You are the TalentAI workforce analyst. Explain a deterministic candidate ranking that has ALREADY been computed. " +
                    "Never invent people, numbers or scores — only reference the JSON provided. Cite GitHub, Jira and ClickUp evidence. " +
                    "Answer in concise markdown: a one-line verdict, then a short bullet list per top candidate, then skill gaps and a recommendation. " +
                    "Do not repeat the full candidate cards; they are already rendered in the UI.",
                  prompt: `User request: ${query}\n\nComputed analysis JSON:\n${JSON.stringify(brief)}`,
                });
                for await (const delta of ai.textStream) {
                  narrative += delta;
                  send({ type: "text-delta", delta });
                }
              } catch (error) {
                narrative =
                  result.executiveSummary.map((line) => `- ${line}`).join("\n") ||
                  "Ranking computed from synchronized data.";
                send({ type: "text-delta", delta: narrative });
              }

              if (body.threadId) {
                try {
                  const organizationId = await currentOrganizationId(supabase!, userId);
                  const now = Date.now();
                  const { error } = await supabase!.from("talent_messages").insert([
                    {
                      organization_id: organizationId,
                      thread_id: body.threadId,
                      user_id: userId,
                      role: "user",
                      client_message_id: `u_${now}`,
                      parts: [{ type: "text", text: query }],
                    },
                    {
                      organization_id: organizationId,
                      thread_id: body.threadId,
                      user_id: userId,
                      role: "assistant",
                      client_message_id: `a_${now}`,
                      parts: [
                        { type: "text", text: narrative },
                        { type: "match", result },
                      ],
                    },
                  ]);
                  if (error) console.error("[talent-chat] persist failed", error.message);
                  await supabase!
                    .from("talent_threads")
                    .update({ updated_at: new Date().toISOString() })
                    .eq("id", body.threadId);
                } catch (error) {
                  console.error("[talent-chat] persist error", error);
                }
              }

              send({ type: "done" });
            } catch (error) {
              send({ type: "error", message: error instanceof Error ? error.message : "Match failed" });
            } finally {
              controller.close();
            }
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "application/x-ndjson; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
          },
        });
      },
    },
  },
});