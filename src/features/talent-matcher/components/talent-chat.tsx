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
import type { MatchResult } from "../types";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  result?: MatchResult;
};

const SUGGESTIONS = [
  "Find the best Python developer",
  "Who should lead a React + TypeScript dashboard project?",
  "Rank engineers for a Kubernetes migration",
  "Build a 4-person team for an AI chatbot RFP",
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
          navigate({ to: "/talent/chat/$threadId", params: { threadId: activeThread } });
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
              title="Ask for the right person, not a keyword"
              description="Describe a role, paste a job description or drop an RFP. Every ranking is computed from synced GitHub, Jira, ClickUp and HR data."
              icon={<Sparkle className="size-6" />}
            >
              <div className="flex flex-col items-center gap-3">
                <FileText className="size-8 text-muted-foreground" />
                <h3 className="font-medium">Ask for the right person, not a keyword</h3>
                <p className="max-w-md text-sm text-muted-foreground">
                  Describe a role, paste a job description or drop an RFP. Rankings are computed from synced GitHub, Jira,
                  ClickUp and HR data.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {SUGGESTIONS.map((s) => (
                    <Button key={s} variant="outline" size="sm" onClick={() => void send(s)}>
                      {s}
                    </Button>
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
            placeholder="Find the best Python developer, or drop a JD / RFP here…"
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