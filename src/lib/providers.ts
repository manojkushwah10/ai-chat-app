import { createGroq } from "@ai-sdk/groq";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { LanguageModel } from "ai";

export type ProviderId = "groq" | "openrouter";

export interface ModelOption {
  id: string;
  label: string;
  /**
   * Whether this model can be trusted with tool calling (e.g. webSearch).
   * Defaults to true. Set to false for models that error out or behave
   * unreliably when tools are attached — verified case-by-case, since this
   * varies by model/provider and isn't something we can detect generically.
   */
  supportsTools?: boolean;
}

export interface ProviderConfig {
  id: ProviderId;
  label: string;
  models: ModelOption[];
}

export const PROVIDERS: ProviderConfig[] = [
  {
    id: "groq",
    label: "Groq",
    models: [
      // First in the list = default model for new conversations. GPT-OSS
      // 120B is the most reliable of these three at actually invoking
      // tools correctly (verified with repeated hand testing) — keep it
      // first unless that changes.
      { id: "openai/gpt-oss-120b", label: "GPT-OSS 120B" },
      {
        id: "llama-3.1-8b-instant",
        label: "Llama 3.1 8B Instant",
        // Groq occasionally hard-fails ("Failed to call a function") mid
        // -generation for this model when a tool is attached — not a
        // schema issue on our end, just an intermittent Groq/model
        // reliability gap (~1 in 6 in hand testing). Tools stay enabled
        // since it mostly works, but it isn't the default for that reason.
      },
    ],
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    models: [
      { id: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B" },
      { id: "deepseek/deepseek-chat", label: "DeepSeek Chat" },
      { id: "mistralai/mistral-large", label: "Mistral Large" },
    ],
  },
];

export const DEFAULT_PROVIDER: ProviderId = "groq";

export function isProviderId(value: string): value is ProviderId {
  return PROVIDERS.some((provider) => provider.id === value);
}

export function getProviderConfig(providerId: ProviderId): ProviderConfig {
  const provider = PROVIDERS.find((p) => p.id === providerId);
  if (!provider) {
    throw new Error(`Unknown provider: ${providerId}`);
  }
  return provider;
}

export function modelSupportsTools(
  providerId: ProviderId,
  modelId: string,
): boolean {
  const model = getProviderConfig(providerId).models.find(
    (m) => m.id === modelId,
  );
  return model?.supportsTools ?? true;
}

export function resolveModel(
  providerId: ProviderId,
  modelId: string,
): LanguageModel {
  switch (providerId) {
    case "groq": {
      const groq = createGroq({
        apiKey: process.env.GROQ_API_KEY,
      });
      return groq(modelId);
    }
    case "openrouter": {
      const openrouter = createOpenRouter({
        apiKey: process.env.OPENROUTER_API_KEY,
      });
      return openrouter(modelId);
    }
    default: {
      const exhaustiveCheck: never = providerId;
      throw new Error(`Unsupported provider: ${exhaustiveCheck}`);
    }
  }
}
