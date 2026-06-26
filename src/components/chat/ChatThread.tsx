"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { ChatMessage, ChatThread as Thread } from "@/lib/types";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { sendMessage } from "@/app/actions/messages";
import { cn } from "@/lib/utils";

/**
 * Post-match chat. Initial messages are server-rendered; new ones arrive over
 * Supabase Realtime (RLS-scoped to the two participants).
 */
export function ChatThread({ thread }: { thread: Thread }) {
  const [messages, setMessages] = useState<ChatMessage[]>(thread.messages);
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`messages:${thread.conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${thread.conversationId}`,
        },
        (payload) => {
          const m = payload.new as {
            id: string;
            sender_id: string;
            body: string;
            created_at: string;
          };
          setMessages((prev) =>
            prev.some((x) => x.id === m.id)
              ? prev
              : [...prev, { id: m.id, senderId: m.sender_id, body: m.body, createdAt: m.created_at }],
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [thread.conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function submit() {
    const text = body.trim();
    if (!text) return;
    setBody("");
    start(async () => {
      const res = await sendMessage(thread.conversationId, text);
      if ("error" in res) setBody(text); // restore on failure
    });
  }

  return (
    <div className="flex h-[calc(100dvh-12rem)] flex-col rounded-[var(--radius-card)] border border-border bg-surface">
      <header className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Avatar name={thread.otherName} hue={thread.otherHue} size={36} />
        <div>
          <p className="text-sm font-medium text-ink">{thread.otherName}</p>
          <p className="text-[11px] text-ink-faint">Aligning offline</p>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
        {messages.length === 0 && (
          <p className="m-auto max-w-[16rem] text-center text-xs text-ink-faint">
            You both want to take this conversation offline. Someone has to send
            the first calendar invite.
          </p>
        )}
        {messages.map((m) => {
          const mine = m.senderId === thread.meId;
          return (
            <div
              key={m.id}
              className={cn(
                "max-w-[78%] rounded-2xl px-3 py-1.5 text-sm",
                mine
                  ? "self-end bg-brand text-white"
                  : "self-start bg-surface-sunken text-ink",
              )}
            >
              {m.body}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-center gap-2 border-t border-border p-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Send a message…"
          className="flex-1 rounded-full border border-border bg-surface px-4 py-2 text-sm text-ink"
        />
        <Button onClick={submit} disabled={pending || !body.trim()}>
          Send
        </Button>
      </div>
    </div>
  );
}
