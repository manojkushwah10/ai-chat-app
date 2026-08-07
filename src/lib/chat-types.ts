import type { UIMessage } from "ai";

export interface MessageUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

export interface MessageMetadata {
  usage?: MessageUsage;
}

export type ChatUIMessage = UIMessage<MessageMetadata>;
