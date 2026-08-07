import { convertToModelMessages, stepCountIs, streamText } from "ai";
import { isProviderId, modelSupportsTools, resolveModel } from "@/lib/providers";
import type { ChatUIMessage } from "@/lib/chat-types";
import { SYSTEM_PROMPT } from "@/lib/system-prompt";
import { tools } from "@/lib/tools";
import { checkRateLimit, getClientIdentifier } from "@/lib/rate-limit";

export const maxDuration = 30;

const MAX_OUTPUT_TOKENS = 2048;
const MAX_AGENT_STEPS = 6;

interface ChatRequestBody {
  messages: ChatUIMessage[];
  provider: string;
  model: string;
}

export async function POST(req: Request) {
  const clientId = getClientIdentifier(req);
  const rateLimit = checkRateLimit(clientId);
  if (!rateLimit.allowed) {
    return Response.json(
      { error: "Too many requests. Please slow down." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      },
    );
  }

  const { messages, provider, model } = (await req.json()) as ChatRequestBody;

  if (!isProviderId(provider)) {
    return Response.json(
      { error: `Unknown provider: ${provider}` },
      { status: 400 },
    );
  }

  if (!model) {
    return Response.json({ error: "Missing model id" }, { status: 400 });
  }

  const useTools = modelSupportsTools(provider, model);

  try {
    const result = streamText({
      model: resolveModel(provider, model),
      system: SYSTEM_PROMPT,
      ...(useTools ? { tools, stopWhen: stepCountIs(MAX_AGENT_STEPS) } : {}),
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      messages: await convertToModelMessages(messages, useTools ? { tools } : undefined),
    });

    return result.toUIMessageStreamResponse<ChatUIMessage>({
      messageMetadata: ({ part }) => {
        if (part.type === "finish") {
          return {
            usage: {
              inputTokens: part.totalUsage.inputTokens,
              outputTokens: part.totalUsage.outputTokens,
              totalTokens: part.totalUsage.totalTokens,
            },
          };
        }
      },
      onError: (error) => {
        console.error("Chat stream error:", error);
        if (error instanceof Error) {
          return error.message;
        }
        if (
          typeof error === "object" &&
          error !== null &&
          "message" in error &&
          typeof error.message === "string"
        ) {
          return error.message;
        }
        return "An error occurred while streaming the response.";
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
