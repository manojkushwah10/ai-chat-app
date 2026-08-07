"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { UIMessage } from "ai";
import {
  deleteConversation as deleteConversationFromDB,
  getAllConversations,
  saveConversation,
  type Conversation,
} from "@/lib/db";
import { DEFAULT_PROVIDER, getProviderConfig, type ProviderId } from "@/lib/providers";

const TITLE_MAX_LENGTH = 48;

function deriveTitle(messages: UIMessage[]): string {
  const firstUserMessage = messages.find((message) => message.role === "user");
  const text = firstUserMessage?.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join(" ")
    .trim();

  if (!text) return "New chat";
  return text.length > TITLE_MAX_LENGTH
    ? `${text.slice(0, TITLE_MAX_LENGTH).trimEnd()}…`
    : text;
}

function createBlankConversation(): Conversation {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title: "New chat",
    providerId: DEFAULT_PROVIDER,
    modelId: getProviderConfig(DEFAULT_PROVIDER).models[0].id,
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getAllConversations().then((stored) => {
      if (cancelled) return;
      if (stored.length > 0) {
        setConversations(stored);
        setActiveId(stored[0].id);
      } else {
        const blank = createBlankConversation();
        setConversations([blank]);
        setActiveId(blank.id);
      }
      setIsLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId]
  );

  const newConversation = useCallback(() => {
    const existingBlank = conversations.find((c) => c.messages.length === 0);
    if (existingBlank) {
      setActiveId(existingBlank.id);
      return;
    }
    const blank = createBlankConversation();
    setConversations((prev) => [blank, ...prev]);
    setActiveId(blank.id);
  }, [conversations]);

  const selectConversation = useCallback((id: string) => {
    setActiveId(id);
  }, []);

  const removeConversation = useCallback(
    (id: string) => {
      const remaining = conversations.filter((c) => c.id !== id);

      if (activeId === id) {
        if (remaining.length > 0) {
          setConversations(remaining);
          setActiveId(remaining[0].id);
        } else {
          const blank = createBlankConversation();
          setConversations([blank]);
          setActiveId(blank.id);
        }
      } else {
        setConversations(remaining);
      }

      void deleteConversationFromDB(id);
    },
    [conversations, activeId]
  );

  const updateSettings = useCallback(
    (id: string, patch: { providerId: ProviderId; modelId: string }) => {
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== id) return c;
          const updated = { ...c, ...patch, updatedAt: Date.now() };
          if (updated.messages.length > 0) void saveConversation(updated);
          return updated;
        })
      );
    },
    []
  );

  const persistMessages = useCallback((id: string, messages: UIMessage[]) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const updated: Conversation = {
          ...c,
          messages,
          title: c.messages.length === 0 ? deriveTitle(messages) : c.title,
          updatedAt: Date.now(),
        };
        void saveConversation(updated);
        return updated;
      })
    );
  }, []);

  return {
    conversations,
    activeConversation,
    activeId,
    isLoaded,
    newConversation,
    selectConversation,
    removeConversation,
    updateSettings,
    persistMessages,
  };
}
