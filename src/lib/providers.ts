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
      {
        id: "llama-3.3-70b-versatile",
        label: "Llama 3.3 70B Versatile",
        // Groq's function-calling for this model currently errors ("Failed
        // to call a function") when a tool is attached — confirmed by hand.
        supportsTools: false,
      },
      { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B Instant" },
      { id: "openai/gpt-oss-120b", label: "GPT-OSS 120B" },
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

export function modelSupportsTools(providerId: ProviderId, modelId: string): boolean {
  const model = getProviderConfig(providerId).models.find((m) => m.id === modelId);
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
