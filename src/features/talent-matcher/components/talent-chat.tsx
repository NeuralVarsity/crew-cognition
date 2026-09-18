import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { FileText, Mic, Paperclip, Sparkle, Upload, X } from "lucide-react";
import { toast } from "sonner";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ACCEPTED_DOC_TYPES, extractDocumentText, type ExtractedDocument } from "../lib/documents";
import { streamTalentChat, useTalentMessages, useThreadMutations } from "../hooks";
import { MatchResultView } from "./match-result-view";
import { InsightView } from "./insight-view";
import type { MatchResult } from "../types";
import type { InsightResult } from "../insight-types";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  result?: MatchResult;
  insight?: InsightResult;
};

const SUGGESTION_GROUPS: { label: string; prompts: string[] }[] = [
  {
    label: "Find talent",
    prompts: [
      "Who is the best AI Engineer?",
      "Compare top Python developers",
      "Recommend hiring needs",
    ],
  },
  {
    label: "Staff a project",
    prompts: [
      "Who should lead our next AI project?",
      "Build a team for a fintech AI project",
      "Predict project success",
    ],
  },
  {
    label: "Workforce intelligence",
    prompts: [
      "Show promotion-ready employees",
      "Show burnout risks",
      "Show the highest GitHub contributor",
    ],
  },
];

export function TalentChat({ threadId }: { threadId?: string }) {
  const navigate = useNavigate();
  const { create } = useThreadMutations();
  const { data: persisted } = useTalentMessages(threadId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<"ready" | "submitted" | "streaming">("ready");
  const [statusText, setStatusText] = useState("");
  const [docs, setDocs] = useState<ExtractedDocument[]>([]);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  /** Thread created by this component during a send — its route change must not reset local state. */
  const ownThreadRef = useRef<string | undefined>(threadId);
  const messageCountRef = useRef(0);
  messageCountRef.current = messages.length;

  useEffect(() => {
    if (!persisted?.length) return;
    if (messageCountRef.current > 0) return;
    setMessages(
      persisted.map((m, index) => {
        const parts = m.parts as { type: string; text?: string; result?: MatchResult }[];
        return {
          id: `${m.id}-${index}`,
          role: m.role,
          text: parts.filter((p) => p.type === "text").map((p) => p.text ?? "").join("\n"),
          result: parts.find((p) => p.type === "match")?.result,
          insight: (parts as { type: string; insight?: InsightResult }[]).find((p) => p.type === "insight")?.insight,
        };
      }),
    );
  }, [persisted, threadId]);

  useEffect(() => {
    if (threadId !== ownThreadRef.current) {
      ownThreadRef.current = threadId;
      setMessages([]);
    }
    textareaRef.current?.focus();
  }, [threadId]);

  const addFiles = useCallback(async (files: File[]) => {
    for (const file of files) {
      try {
        const parsed = await extractDocumentText(file);
        setDocs((prev) => [...prev.filter((d) => d.name !== parsed.name), parsed]);
        toast.success(`${parsed.name} attached — ${parsed.chars.toLocaleString()} characters extracted`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : `Could not read ${file.name}`);
      }
    }
  }, []);

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text && !docs.length) return;
      if (status !== "ready") return;

      let activeThread = threadId;
      const isNewThread = !activeThread;
      if (!activeThread) {
        const thread = await create.mutateAsync(text.slice(0, 80) || docs[0]?.name);
        activeThread = thread.id;
        ownThreadRef.current = thread.id;
      }

      const attachedText = docs.map((d) => `--- ${d.name} ---\n${d.text}`).join("\n\n");
      const query = [text, attachedText].filter(Boolean).join("\n\n");
      const sourceName = docs.length ? docs.map((d) => d.name).join(", ") : null;
      const userId = `u-${Date.now()}`;
      const assistantId = `a-${Date.now()}`;

      setMessages((prev) => [
        ...prev,
        { id: userId, role: "user", text: text || `Analyze ${sourceName}` },
        { id: assistantId, role: "assistant", text: "" },
      ]);
      setDocs([]);
      setStatus("submitted");
      setStatusText("Analyzing your request…");

      try {
        await streamTalentChat({ threadId: activeThread, query, sourceName }, (event) => {
          if (event.type === "status") setStatusText(event.text);
          if (event.type === "match") {
            setStatus("streaming");
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, result: event.result } : m)),
            );
          }
          if (event.type === "insight") {
            setStatus("streaming");
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, insight: event.insight } : m)),
            );
          }
          if (event.type === "text-delta") {
            setStatus("streaming");
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, text: m.text + event.delta } : m)),
            );
          }
          if (event.type === "error") throw new Error(event.message);
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "The assistant could not respond";
        toast.error(message);
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId && !m.text ? { ...m, text: `⚠️ ${message}` } : m)),
        );
      } finally {
        setStatus("ready");
        setStatusText("");
        textareaRef.current?.focus();
        if (isNewThread && activeThread) {
          // Navigate only once the answer is persisted: the thread route mounts a
          // fresh chat that restores the saved transcript.
          navigate({ to: "/ai-workspace/chat/$threadId", params: { threadId: activeThread } });
        }
      }
    },
    [create, docs, navigate, status, threadId],
  );

  const handleSubmit = (message: PromptInputMessage, event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void send(message.text ?? "");
  };

  return (
    <div
      className={cn("flex h-full min-h-0 flex-col", dragging && "ring-2 ring-primary ring-offset-2 rounded-lg")}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        void addFiles(Array.from(e.dataTransfer.files));
      }}
    >
      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="mx-auto w-full max-w-4xl">
          {!messages.length ? (
            <ConversationEmptyState
              title="Ask your workforce anything"
              description="Your enterprise AI copilot answers from synchronized GitHub, Jira, ClickUp, Excel and AI Intelligence data."
              icon={<Sparkle className="size-6" />}
            >
              <div className="w-full max-w-3xl space-y-5">
                <div className="text-center">
                  <h2 className="text-xl font-semibold tracking-tight">Ask your workforce anything</h2>
                  <p className="mx-auto mt-1 max-w-lg text-sm text-muted-foreground">
                    Describe a role, paste a job description, drop an RFP or ask an analytical question. Every answer is
                    computed from synchronized GitHub, Jira, ClickUp, Excel and AI Intelligence data — never guessed.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {SUGGESTION_GROUPS.map((group) => (
                    <div key={group.label} className="rounded-xl border bg-card/50 p-3 text-left">
                      <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        {group.label}
                      </div>
                      <div className="space-y-1.5">
                        {group.prompts.map((prompt) => (
                          <button
                            key={prompt}
                            type="button"
                            onClick={() => void send(prompt)}
                            className="w-full rounded-lg border border-transparent px-2 py-1.5 text-left text-sm transition hover:border-border hover:bg-accent"
                          >
                            {prompt}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </ConversationEmptyState>
          ) : null}

          {messages.map((message) => (
            <Message from={message.role} key={message.id}>
              <MessageContent>
                {message.text ? <MessageResponse>{message.text}</MessageResponse> : null}
                {!message.text && message.role === "assistant" && status !== "ready" ? (
                  <Shimmer>{statusText || "Thinking..."}</Shimmer>
                ) : null}
              </MessageContent>
              {message.result ? (
                <div className="mt-2 w-full">
                  <MatchResultView result={message.result} />
                </div>
              ) : null}
              {message.insight ? (
                <div className="mt-2 w-full">
                  <InsightView insight={message.insight} />
                </div>
              ) : null}
            </Message>
          ))}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="mx-auto w-full max-w-4xl shrink-0 p-4 pt-0">
        {docs.length ? (
          <div className="mb-2 flex flex-wrap gap-2">
            {docs.map((doc) => (
              <Badge key={doc.name} variant="secondary" className="gap-1">
                <FileText className="size-3" />
                {doc.name}
                <button
                  type="button"
                  aria-label={`Remove ${doc.name}`}
                  onClick={() => setDocs((prev) => prev.filter((d) => d.name !== doc.name))}
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        ) : null}

        <PromptInput onSubmit={handleSubmit}>
          <PromptInputTextarea
            ref={textareaRef}
            autoFocus
            placeholder="Ask anything — find talent, compare people, check burnout risk, or drop a JD / RFP…"
          />
          <PromptInputFooter>
            <PromptInputTools>
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => fileRef.current?.click()}>
                <Paperclip className="size-4" />
                <span className="sr-only">Attach a document</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => toast.info("Voice input is coming soon")}
              >
                <Mic className="size-4" />
                <span className="sr-only">Voice input</span>
              </Button>
              <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
                <Upload className="size-3" /> PDF, DOCX, TXT, Excel · drag &amp; drop supported
              </span>
            </PromptInputTools>
            <PromptInputSubmit status={status === "ready" ? undefined : status} disabled={status !== "ready"} />
          </PromptInputFooter>
        </PromptInput>

        <input
          ref={fileRef}
          type="file"
          multiple
          accept={ACCEPTED_DOC_TYPES}
          className="hidden"
          onChange={(e) => {
            void addFiles(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}