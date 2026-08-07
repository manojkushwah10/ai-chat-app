import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { ProviderId } from "@/lib/providers";
import type { ChatUIMessage } from "@/lib/chat-types";

export interface Conversation {
  id: string;
  title: string;
  providerId: ProviderId;
  modelId: string;
  messages: ChatUIMessage[];
  createdAt: number;
  updatedAt: number;
}

interface ChatDB extends DBSchema {
  conversations: {
    key: string;
    value: Conversation;
    indexes: { "by-updatedAt": number };
  };
}

const DB_NAME = "ai-chat-app";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<ChatDB>> | undefined;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<ChatDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore("conversations", {
          keyPath: "id",
        });
        store.createIndex("by-updatedAt", "updatedAt");
      },
    });
  }
  return dbPromise;
}

export async function getAllConversations(): Promise<Conversation[]> {
  const db = await getDB();
  const conversations = await db.getAllFromIndex(
    "conversations",
    "by-updatedAt"
  );
  return conversations.reverse();
}

export async function saveConversation(
  conversation: Conversation
): Promise<void> {
  const db = await getDB();
  await db.put("conversations", conversation);
}

export async function deleteConversation(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("conversations", id);
}
