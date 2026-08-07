"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PROVIDERS, getProviderConfig, type ProviderId } from "@/lib/providers";
import type { Conversation } from "@/lib/db";
import type { ChatUIMessage } from "@/lib/chat-types";
import { MessageBubble, getMessageText } from "@/components/MessageBubble";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";

const MAX_TEXTAREA_HEIGHT = 200;

interface ChatWindowProps {
  conversation: Conversation;
  onSettingsChange: (
    id: string,
    patch: { providerId: ProviderId; modelId: string }
  ) => void;
  onMessagesChange: (id: string, messages: ChatUIMessage[]) => void;
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
  const baseInputRef = useRef("");
  const messageCountRef = useRef(0);

  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat" }),
    []
  );

  const { messages, sendMessage, status, error, clearError } = useChat<ChatUIMessage>({
    id: conversation.id,
    messages: conversation.messages,
    transport,
    onFinish: ({ messages }) => onMessagesChange(conversation.id, messages),
  });

  const currentProvider = getProviderConfig(conversation.providerId);
  const isBusy = status === "submitted" || status === "streaming";

  const lastMessage = messages[messages.length - 1];
  const showThinking =
    isBusy &&
    (lastMessage?.role !== "assistant" || getMessageText(lastMessage).length === 0);

  const speech = useSpeechRecognition({
    onTranscript: (transcript) => {
      const base = baseInputRef.current;
      setInput(base ? `${base} ${transcript}` : transcript);
    },
    // Speak-to-submit: once listening stops for any reason (user stopped
    // it, silence, or the 30s safety timeout), send whatever was
    // transcribed instead of waiting for a manual click.
    onEnd: () => submitMessage(),
  });

  useEffect(() => {
    const isNewMessage = messages.length !== messageCountRef.current;
    messageCountRef.current = messages.length;
    bottomRef.current?.scrollIntoView({
      behavior: isNewMessage ? "smooth" : "auto",
    });
  }, [messages]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }, [input]);

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
    if (speech.isListening) speech.stop();
    if (error) clearError();
    sendMessage(
      { text },
      { body: { provider: conversation.providerId, model: conversation.modelId } }
    );
    setInput("");
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
  }

  function handleToggleListening() {
    if (speech.isListening) {
      speech.stop();
      return;
    }
    baseInputRef.current = input;
    speech.start();
  }

  const handleEditMessage = useCallback(
    (messageId: string, newText: string) => {
      if (isBusy) return;
      if (error) clearError();
      sendMessage(
        { text: newText, messageId },
        { body: { provider: conversation.providerId, model: conversation.modelId } }
      );
    },
    [isBusy, error, clearError, sendMessage, conversation.providerId, conversation.modelId]
  );

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
                {model.supportsTools === false ? " (no tools)" : ""}
              </option>
            ))}
          </select>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400 to-violet-500">
              <span className="text-base font-bold text-white">S</span>
            </div>
            <p className="text-sm text-zinc-500">
              Send a message to get started.
            </p>
          </div>
        ) : (
          <ul className="mx-auto flex max-w-3xl flex-col gap-6 px-3 py-6 sm:px-6">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isBusy={isBusy}
                onEdit={handleEditMessage}
              />
            ))}
            {showThinking ? (
              <li className="flex gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-400 to-violet-500 text-xs font-semibold text-white">
                  A
                </div>
                <div className="flex items-center gap-1 rounded-2xl bg-black/5 px-4 py-3 dark:bg-white/5">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.3s] dark:bg-zinc-500" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.15s] dark:bg-zinc-500" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 dark:bg-zinc-500" />
                </div>
              </li>
            ) : null}
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
            placeholder="Message Switchboard..."
            rows={1}
            className="max-h-[200px] flex-1 resize-none overflow-y-auto bg-transparent py-1.5 text-sm text-zinc-800 outline-none placeholder:text-zinc-500 dark:text-zinc-200"
          />
          <button
            type="button"
            onClick={handleToggleListening}
            disabled={!speech.isSupported}
            aria-label={
              speech.isListening ? "Stop and send voice message" : "Start voice input"
            }
            title={
              speech.isSupported
                ? speech.isListening
                  ? "Stop and send (auto-sends after 30s)"
                  : "Speak to send"
                : "Voice input not supported in this browser"
            }
            className={
              "mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors disabled:opacity-30 " +
              (speech.isListening
                ? "animate-pulse bg-red-500 text-white"
                : "text-zinc-500 hover:bg-black/10 dark:text-zinc-400 dark:hover:bg-white/10")
            }
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
            >
              <path d="M10 2a3 3 0 0 0-3 3v5a3 3 0 1 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M5.5 9.5a.75.75 0 0 1 .75.75 3.75 3.75 0 0 0 7.5 0 .75.75 0 0 1 1.5 0 5.25 5.25 0 0 1-4.5 5.196V17h1.75a.75.75 0 0 1 0 1.5h-5a.75.75 0 0 1 0-1.5h1.75v-1.554A5.25 5.25 0 0 1 4.75 10.25a.75.75 0 0 1 .75-.75Z" />
            </svg>
          </button>
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
