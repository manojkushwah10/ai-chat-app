import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { isProviderId, resolveModel } from "@/lib/providers";
import type { ChatUIMessage } from "@/lib/chat-types";
import { SYSTEM_PROMPT } from "@/lib/system-prompt";

export const maxDuration = 30;

const MAX_OUTPUT_TOKENS = 2048;

interface ChatRequestBody {
  messages: UIMessage[];
  provider: string;
  model: string;
}

export async function POST(req: Request) {
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

  try {
    const result = streamText({
      model: resolveModel(provider, model),
      system: SYSTEM_PROMPT,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      messages: await convertToModelMessages(messages),
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
        if (error instanceof Error) {
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
