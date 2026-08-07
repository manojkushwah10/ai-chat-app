"use client";

import { memo, useEffect, useRef, useState } from "react";
import { MarkdownContent } from "@/components/MarkdownContent";
import type { ChatUIMessage } from "@/lib/chat-types";

interface MessageBubbleProps {
  message: ChatUIMessage;
  isBusy: boolean;
  onEdit: (messageId: string, newText: string) => void;
}

function getMessageText(message: ChatUIMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

export const MessageBubble = memo(function MessageBubble({
  message,
  isBusy,
  onEdit,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const text = getMessageText(message);
  const usage = message.metadata?.usage;

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(text);
  const [copied, setCopied] = useState(false);
  const copiedTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (copiedTimeout.current) clearTimeout(copiedTimeout.current);
    };
  }, []);

  function handleCopy() {
    void navigator.clipboard.writeText(text);
    setCopied(true);
    if (copiedTimeout.current) clearTimeout(copiedTimeout.current);
    copiedTimeout.current = setTimeout(() => setCopied(false), 1500);
  }

  function startEdit() {
    setEditValue(text);
    setIsEditing(true);
  }

  function cancelEdit() {
    setIsEditing(false);
  }

  function saveEdit() {
    const trimmed = editValue.trim();
    if (!trimmed || trimmed === text) {
      setIsEditing(false);
      return;
    }
    onEdit(message.id, trimmed);
    setIsEditing(false);
  }

  function handleEditKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      saveEdit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelEdit();
    }
  }

  if (isEditing) {
    return (
      <li className="flex flex-row-reverse gap-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-black/5 text-xs font-semibold text-zinc-600 dark:bg-white/10 dark:text-zinc-300">
          Y
        </div>
        <div className="w-full max-w-[85%] sm:max-w-[75%]">
          <textarea
            autoFocus
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleEditKeyDown}
            rows={3}
            className="w-full resize-none rounded-2xl border border-indigo-400/50 bg-black/5 px-4 py-2.5 text-sm leading-relaxed text-zinc-800 outline-none dark:bg-white/5 dark:text-zinc-200"
          />
          <div className="mt-1.5 flex justify-end gap-2">
            <button
              onClick={cancelEdit}
              className="rounded-md px-2.5 py-1 text-xs text-zinc-500 hover:bg-black/5 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-200"
            >
              Cancel
            </button>
            <button
              onClick={saveEdit}
              className="rounded-md bg-indigo-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-600"
            >
              Save & submit
            </button>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className={"group flex gap-3 " + (isUser ? "flex-row-reverse" : "flex-row")}>
      <div
        className={
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-semibold " +
          (isUser
            ? "bg-black/5 text-zinc-600 dark:bg-white/10 dark:text-zinc-300"
            : "bg-gradient-to-br from-indigo-400 to-violet-500 text-white")
        }
      >
        {isUser ? "Y" : "A"}
      </div>

      <div className={"flex min-w-0 max-w-[85%] flex-col gap-1 sm:max-w-[75%] " + (isUser ? "items-end" : "items-start")}>
        {isUser || text ? (
          <div
            className={
              "rounded-2xl px-4 py-2.5 " +
              (isUser
                ? "whitespace-pre-wrap text-sm leading-relaxed bg-indigo-500 text-white"
                : "bg-black/5 text-zinc-800 dark:bg-white/5 dark:text-zinc-200")
            }
          >
            {isUser ? text : <MarkdownContent text={text} />}
          </div>
        ) : null}

        <div
          className={
            "flex items-center gap-2 " + (isUser ? "flex-row-reverse" : "flex-row")
          }
        >
          {!isUser && usage ? (
            <span
              title={`Input: ${usage.inputTokens ?? "?"} · Output: ${usage.outputTokens ?? "?"} · Total: ${usage.totalTokens ?? "?"}`}
              className="text-[11px] text-zinc-400 dark:text-zinc-500"
            >
              {(usage.outputTokens ?? usage.totalTokens ?? 0).toLocaleString()} tokens
            </span>
          ) : null}

          <div
            className={
              "flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 " +
              (isUser ? "flex-row-reverse" : "flex-row")
            }
          >
            <button
              onClick={handleCopy}
              aria-label="Copy message"
              title="Copy"
              className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-400 hover:bg-black/5 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-white/10 dark:hover:text-zinc-200"
            >
              {copied ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                  <path
                    fillRule="evenodd"
                    d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                  <path d="M7 3.5A1.5 1.5 0 0 1 8.5 2h3.879a1.5 1.5 0 0 1 1.06.44l3.122 3.12A1.5 1.5 0 0 1 17 6.622V12.5a1.5 1.5 0 0 1-1.5 1.5h-1v-3.379a3 3 0 0 0-.879-2.121L10.5 5.379A3 3 0 0 0 8.379 4.5H7v-1Z" />
                  <path d="M4.5 6A1.5 1.5 0 0 0 3 7.5v9A1.5 1.5 0 0 0 4.5 18h7a1.5 1.5 0 0 0 1.5-1.5v-5.879a1.5 1.5 0 0 0-.44-1.06L9.44 6.439A1.5 1.5 0 0 0 8.378 6H4.5Z" />
                </svg>
              )}
            </button>

            {isUser ? (
              <button
                onClick={startEdit}
                disabled={isBusy}
                aria-label="Edit message"
                title="Edit"
                className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-400 hover:bg-black/5 hover:text-zinc-700 disabled:opacity-30 dark:text-zinc-500 dark:hover:bg-white/10 dark:hover:text-zinc-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                  <path d="M13.586 3.586a2 2 0 1 1 2.828 2.828l-.793.793-2.828-2.828.793-.793ZM11.379 5.793 3 14.172V17h2.828l8.38-8.379-2.83-2.828Z" />
                </svg>
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </li>
  );
});
