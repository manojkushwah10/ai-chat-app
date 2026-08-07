"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { PROVIDERS, getProviderConfig, type ProviderId } from "@/lib/providers";
import type { Conversation } from "@/lib/db";

const MAX_TEXTAREA_HEIGHT = 200;

interface ChatWindowProps {
  conversation: Conversation;
  onSettingsChange: (
    id: string,
    patch: { providerId: ProviderId; modelId: string }
  ) => void;
  onMessagesChange: (id: string, messages: UIMessage[]) => void;
  onOpenSidebar: () => void;
}

export function ChatWindow({
  conversation,
  onSettingsChange,
  onMessagesChange,
  onOpenSidebar,
}: ChatWindowProps) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat" }),
    []
  );

  const { messages, sendMessage, status, error, clearError } = useChat({
    id: conversation.id,
    messages: conversation.messages,
    transport,
    onFinish: ({ messages }) => onMessagesChange(conversation.id, messages),
  });

  const currentProvider = getProviderConfig(conversation.providerId);
  const isBusy = status === "submitted" || status === "streaming";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleProviderChange(nextProviderId: ProviderId) {
    if (nextProviderId === conversation.providerId) return;
    onSettingsChange(conversation.id, {
      providerId: nextProviderId,
      modelId: getProviderConfig(nextProviderId).models[0].id,
    });
  }

  function handleModelChange(nextModelId: string) {
    onSettingsChange(conversation.id, {
      providerId: conversation.providerId,
      modelId: nextModelId,
    });
  }

  function submitMessage() {
    const text = input.trim();
    if (!text || isBusy) return;
    if (error) clearError();
    sendMessage(
      { text },
      { body: { provider: conversation.providerId, model: conversation.modelId } }
    );
    setInput("");
    const el = textareaRef.current;
    if (el) el.style.height = "auto";
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submitMessage();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      submitMessage();
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col bg-white dark:bg-zinc-900">
      <header className="flex items-center gap-2 border-b border-black/10 px-3 py-3 dark:border-white/10 sm:gap-3 sm:px-6">
        <button
          onClick={onOpenSidebar}
          aria-label="Open sidebar"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:bg-black/5 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-100 md:hidden"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
          >
            <path
              fillRule="evenodd"
              d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75Zm0 10.5a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75ZM2.75 9.25a.75.75 0 0 0 0 1.5h14.5a.75.75 0 0 0 0-1.5H2.75Z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        <h1 className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-700 dark:text-zinc-300 md:flex-initial">
          {conversation.title}
        </h1>

        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          <div className="inline-flex rounded-lg border border-black/10 bg-black/5 p-0.5 dark:border-white/10 dark:bg-white/5">
            {PROVIDERS.map((provider) => (
              <button
                key={provider.id}
                onClick={() => handleProviderChange(provider.id)}
                className={
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors " +
                  (provider.id === conversation.providerId
                    ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200")
                }
              >
                {provider.label}
              </button>
            ))}
          </div>

          <select
            value={conversation.modelId}
            onChange={(e) => handleModelChange(e.target.value)}
            className="rounded-lg border border-black/10 bg-black/5 px-2.5 py-1.5 text-xs text-zinc-700 outline-none transition-colors hover:bg-black/10 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10"
          >
            {currentProvider.models.map((model) => (
              <option
                key={model.id}
                value={model.id}
                className="bg-white dark:bg-zinc-900"
              >
                {model.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400 to-violet-500">
              <span className="text-base font-bold text-white">A</span>
            </div>
            <p className="text-sm text-zinc-500">
              Message {currentProvider.label} to get started.
            </p>
          </div>
        ) : (
          <ul className="mx-auto flex max-w-3xl flex-col gap-6 px-3 py-6 sm:px-6">
            {messages.map((message) => (
              <li
                key={message.id}
                className={
                  "flex gap-3 " +
                  (message.role === "user" ? "flex-row-reverse" : "flex-row")
                }
              >
                <div
                  className={
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-semibold " +
                    (message.role === "user"
                      ? "bg-black/5 text-zinc-600 dark:bg-white/10 dark:text-zinc-300"
                      : "bg-gradient-to-br from-indigo-400 to-violet-500 text-white")
                  }
                >
                  {message.role === "user" ? "Y" : "A"}
                </div>
                <div
                  className={
                    "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed sm:max-w-[75%] " +
                    (message.role === "user"
                      ? "bg-indigo-500 text-white"
                      : "bg-black/5 text-zinc-800 dark:bg-white/5 dark:text-zinc-200")
                  }
                >
                  {message.parts.map((part, index) =>
                    part.type === "text" ? (
                      <span key={index}>{part.text}</span>
                    ) : null
                  )}
                </div>
              </li>
            ))}
            <div ref={bottomRef} />
          </ul>
        )}

        {error ? (
          <div className="mx-auto max-w-3xl px-3 pb-4 sm:px-6">
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
              {error.message}
            </p>
          </div>
        ) : null}
      </main>

      <form
        onSubmit={handleSubmit}
        className="mx-auto w-full max-w-3xl px-3 pb-4 sm:px-6 sm:pb-6"
      >
        <div className="flex items-end gap-2 rounded-2xl border border-black/10 bg-black/5 px-3 py-2 focus-within:border-indigo-400/50 dark:border-white/10 dark:bg-white/5">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${currentProvider.label}...`}
            rows={1}
            className="max-h-[200px] flex-1 resize-none overflow-y-auto bg-transparent py-1.5 text-sm text-zinc-800 outline-none placeholder:text-zinc-500 dark:text-zinc-200"
          />
          <button
            type="submit"
            disabled={isBusy || !input.trim()}
            className="mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-500 text-white transition-opacity disabled:opacity-30"
            aria-label="Send message"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
            >
              <path d="M3.105 3.105a.75.75 0 0 1 .814-.163l13.5 5.25a.75.75 0 0 1 0 1.396l-13.5 5.25a.75.75 0 0 1-.99-.943L4.89 10 2.93 4.05a.75.75 0 0 1 .176-.945Z" />
            </svg>
          </button>
        </div>
        <p className="px-1 pt-1.5 text-[11px] text-zinc-400 dark:text-zinc-500">
          Enter for a new line · Ctrl/⌘ + Enter to send
        </p>
      </form>
    </div>
  );
}
