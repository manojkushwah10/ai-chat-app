import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { isProviderId, resolveModel } from "@/lib/providers";

export const maxDuration = 30;

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
      maxOutputTokens: 500,
      messages: await convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse({
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
