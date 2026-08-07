import type { InferUITools, UIDataTypes, UIMessage } from "ai";
import type { tools } from "@/lib/tools";

export interface MessageUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

export interface MessageMetadata {
  usage?: MessageUsage;
}

export type ChatTools = InferUITools<typeof tools>;

export type ChatUIMessage = UIMessage<MessageMetadata, UIDataTypes, ChatTools>;
