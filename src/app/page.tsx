"use client";

import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { ChatWindow } from "@/components/ChatWindow";
import { useConversations } from "@/hooks/useConversations";

export default function ChatPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const {
    conversations,
    activeConversation,
    activeId,
    isLoaded,
    newConversation,
    selectConversation,
    removeConversation,
    updateSettings,
    persistMessages,
  } = useConversations();

  if (!isLoaded || !activeConversation) {
    return <div className="h-full w-full bg-white dark:bg-zinc-950" />;
  }

  return (
    <div className="flex h-full w-full">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        isOpen={isSidebarOpen}
        onNew={newConversation}
        onSelect={selectConversation}
        onDelete={removeConversation}
        onClose={() => setIsSidebarOpen(false)}
      />
      <ChatWindow
        key={activeConversation.id}
        conversation={activeConversation}
        onSettingsChange={updateSettings}
        onMessagesChange={persistMessages}
        onOpenSidebar={() => setIsSidebarOpen(true)}
      />
    </div>
  );
}
