"use client";

import type { Conversation } from "@/lib/db";
import { ThemeToggle } from "@/components/ThemeToggle";

interface SidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  isOpen: boolean;
  onNew: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

function startOfDay(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function groupConversations(conversations: Conversation[]) {
  const today = startOfDay(Date.now());
  const yesterday = today - 86_400_000;
  const weekAgo = today - 7 * 86_400_000;

  const groups: { label: string; items: Conversation[] }[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "Previous 7 days", items: [] },
    { label: "Older", items: [] },
  ];

  for (const conversation of conversations) {
    const day = startOfDay(conversation.updatedAt);
    if (day >= today) groups[0].items.push(conversation);
    else if (day >= yesterday) groups[1].items.push(conversation);
    else if (day >= weekAgo) groups[2].items.push(conversation);
    else groups[3].items.push(conversation);
  }

  return groups.filter((group) => group.items.length > 0);
}

export function Sidebar({
  conversations,
  activeId,
  isOpen,
  onNew,
  onSelect,
  onDelete,
  onClose,
}: SidebarProps) {
  const groups = groupConversations(conversations);

  return (
    <>
      {isOpen ? (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          aria-hidden="true"
        />
      ) : null}

      <aside
        className={
          "fixed inset-y-0 left-0 z-50 flex h-full w-72 shrink-0 flex-col border-r border-black/10 bg-white transition-transform duration-200 ease-in-out dark:border-white/10 dark:bg-zinc-950 md:static md:z-auto md:w-64 md:translate-x-0 " +
          (isOpen ? "translate-x-0" : "-translate-x-full")
        }
      >
        <div className="flex items-center gap-2 px-4 py-4">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-indigo-400 to-violet-500">
            <span className="text-xs font-bold text-white">S</span>
          </div>
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Switchboard AI
          </span>

          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <button
              onClick={onClose}
              aria-label="Close sidebar"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-black/5 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-100 md:hidden"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4"
              >
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-3">
          <button
            onClick={() => {
              onNew();
              onClose();
            }}
            className="flex w-full items-center gap-2 rounded-lg border border-black/10 bg-black/5 px-3 py-2 text-sm text-zinc-700 transition-colors hover:bg-black/10 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200 dark:hover:bg-white/10"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
            >
              <path d="M10 4a1 1 0 0 1 1 1v4h4a1 1 0 1 1 0 2h-4v4a1 1 0 1 1-2 0v-4H5a1 1 0 1 1 0-2h4V5a1 1 0 0 1 1-1Z" />
            </svg>
            New chat
          </button>
        </div>

        <nav className="mt-4 flex-1 space-y-4 overflow-y-auto px-3 pb-4">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="px-2 pb-1 text-xs font-medium text-zinc-500">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((conversation) => {
                  const isActive = conversation.id === activeId;
                  return (
                    <li key={conversation.id} className="group relative">
                      <button
                        onClick={() => {
                          onSelect(conversation.id);
                          onClose();
                        }}
                        className={
                          "block w-full truncate rounded-lg px-2 py-1.5 pr-7 text-left text-sm transition-colors " +
                          (isActive
                            ? "bg-black/5 text-zinc-900 dark:bg-white/10 dark:text-zinc-100"
                            : "text-zinc-600 hover:bg-black/5 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-zinc-200")
                        }
                        title={conversation.title}
                      >
                        {conversation.title}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(conversation.id);
                        }}
                        aria-label="Delete conversation"
                        className="absolute right-1 top-1/2 hidden -translate-y-1/2 rounded-md p-1 text-zinc-500 hover:bg-black/10 hover:text-red-500 group-hover:block dark:hover:bg-white/10 dark:hover:text-red-400"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="h-3.5 w-3.5"
                        >
                          <path
                            fillRule="evenodd"
                            d="M8.75 1A1.75 1.75 0 0 0 7 2.75V3H4.25a.75.75 0 0 0 0 1.5h.3l.7 9.14A2.5 2.5 0 0 0 7.74 16h4.52a2.5 2.5 0 0 0 2.49-2.36l.7-9.14h.3a.75.75 0 0 0 0-1.5H13v-.25A1.75 1.75 0 0 0 11.25 1h-2.5ZM8.5 2.75a.25.25 0 0 1 .25-.25h2.5a.25.25 0 0 1 .25.25V3h-3v-.25ZM7.25 6a.75.75 0 0 1 .75.75v5.5a.75.75 0 0 1-1.5 0v-5.5A.75.75 0 0 1 7.25 6Zm3 0a.75.75 0 0 1 .75.75v5.5a.75.75 0 0 1-1.5 0v-5.5a.75.75 0 0 1 .75-.75Z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
