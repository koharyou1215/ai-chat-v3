// src/constants/model-pricing.ts

import { ModelInfo } from "@/types/core/settings.types";

export const MODEL_PRICING_DATA: ModelInfo[] = [
  // Google Gemini Models
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    provider: "gemini",
    pricing: {
      input: 0.00000125, // $1.25 per 1M tokens
      output: 0.000005, // $5.00 per 1M tokens
      currency: "USD",
    },
    contextWindow: 2000000,
    description: "Googleの最新の高性能モデル",
  },
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "gemini",
    pricing: {
      input: 0.00000075, // $0.75 per 1M tokens
      output: 0.000003, // $3.00 per 1M tokens
      currency: "USD",
    },
    contextWindow: 1000000,
    description: "高速でコスト効率の良いモデル",
  },
  {
    id: "gemini-2.5-flash-light",
    name: "Gemini 2.5 Flash Light",
    provider: "gemini",
    pricing: {
      input: 0.000000375, // $0.375 per 1M tokens
      output: 0.0000015, // $1.50 per 1M tokens
      currency: "USD",
    },
    contextWindow: 1000000,
    description: "軽量で高速なモデル",
  },

  // Anthropic Claude Models (OpenRouter)
  {
    id: "anthropic/claude-opus-4",
    name: "Claude Opus 4",
    provider: "openrouter",
    pricing: {
      input: 0.000015, // $15 per 1M tokens
      output: 0.000075, // $75 per 1M tokens
      currency: "USD",
    },
    contextWindow: 200000,
    description: "Anthropicの最高性能モデル",
  },
  {
    id: "anthropic/claude-sonnet-4",
    name: "Claude Sonnet 4",
    provider: "openrouter",
    pricing: {
      input: 0.000003, // $3 per 1M tokens
      output: 0.000015, // $15 per 1M tokens
      currency: "USD",
    },
    contextWindow: 200000,
    description: "バランスの取れた高性能モデル",
  },

  // xAI Grok Models (OpenRouter)
  {
    id: "x-ai/grok-4",
    name: "Grok-4",
    provider: "openrouter",
    pricing: {
      input: 0.00001, // $10 per 1M tokens
      output: 0.00003, // $30 per 1M tokens
      currency: "USD",
    },
    contextWindow: 128000,
    description: "xAIの最新モデル",
  },

  // OpenAI Models (OpenRouter)
  {
    id: "openai/gpt-5-chat",
    name: "GPT-5",
    provider: "openrouter",
    pricing: {
      input: 0.000005, // $5 per 1M tokens
      output: 0.000015, // $15 per 1M tokens
      currency: "USD",
    },
    contextWindow: 128000,
    description: "OpenAIの最新モデル",
  },
  {
    id: "openai/gpt-5-mini",
    name: "GPT-5 Mini",
    provider: "openrouter",
    pricing: {
      input: 0.00000015, // $0.15 per 1M tokens
      output: 0.0000006, // $0.60 per 1M tokens
      currency: "USD",
    },
    contextWindow: 128000,
    description: "軽量で高速なGPT-5モデル",
  },

  // Standard Models (OpenRouter)
  {
    id: "deepseek/deepseek-chat-v3.1",
    name: "DeepSeek Chat v3",
    provider: "openrouter",
    pricing: {
      input: 0.00000014, // $0.14 per 1M tokens
      output: 0.00000028, // $0.28 per 1M tokens
      currency: "USD",
    },
    contextWindow: 64000,
    description: "高コストパフォーマンスのモデル",
  },
  {
    id: "mistralai/mistral-medium-3.1",
    name: "Mistral Medium 3.1",
    provider: "openrouter",
    pricing: {
      input: 0.0000027, // $2.70 per 1M tokens
      output: 0.0000081, // $8.10 per 1M tokens
      currency: "USD",
    },
    contextWindow: 128000,
    description: "Mistralの高性能モデル",
  },
  {
    id: "meta-llama/llama-4-maverick",
    name: "Llama 4 Maverick",
    provider: "openrouter",
    pricing: {
      input: 0.0000007, // $0.70 per 1M tokens
      output: 0.0000007, // $0.70 per 1M tokens
      currency: "USD",
    },
    contextWindow: 128000,
    description: "Metaの最新オープンソースモデル",
  },

  // Specialized Models (OpenRouter)
  {
    id: "qwen/qwen3-max",
    name: "qwen3-max",
    provider: "openrouter",
    pricing: {
      input: 0.000002, // $2 per 1M tokens
      output: 0.000002, // $2 per 1M tokens
      currency: "USD",
    },
    contextWindow: 128000,
    description: "Alibabaの高性能モデル",
  },

  {
    id: "qwen/qwen-plus-2025-07-28:thinking",
    name: "qwen-plus-2025-07-28:thinking",
    provider: "openrouter",
    pricing: {
      input: 0.0000004, // $0.40 per 1M tokens
      output: 0.000004, // $4.0 per 1M tokens
      currency: "USD",
    },
    contextWindow: 128000,
    description: "思考プロセスを可視化するモデル",
  },
  {
    id: "qwen/qwen-plus-2025-07-28",
    name: "qwen-plus-2025-07-28",
    provider: "openrouter",
    pricing: {
      input: 0.0000004, // $0.40 per 1M tokens
      output: 0.0000012, // $1.20 per 1M tokens
      currency: "USD",
    },
    contextWindow: 128000,
    description: "思考プロセスを可視化するモデル",
  },
  {
    id: "qwen/qwen3-next-80b-a3b-instruct",
    name: "qwen3-next-80b-a3b-instruct",
    provider: "openrouter",
    pricing: {
      input: 0.0000001, // $0.10 per 1M tokens
      output: 0.0000008, // $0.80 per 1M tokens
      currency: "USD",
    },
    contextWindow: 128000,
    description: "指示に従うことに特化したモデル",
  },
  {
    id: "qwen/qwen3-next-80b-a3b-thinking",
    name: "qwen3-next-80b-a3b-thinking",
    provider: "openrouter",
    pricing: {
      input: 0.0000004, // $0.40 per 1M tokens
      output: 0.0000012, // $1.20 per 1M tokens
      currency: "USD",
    },
    contextWindow: 128000,
    description: "思考プロセスを可視化するモデル",
  },
  {
    id: "x-ai/grok-code-fast-1",
    name: "Grok Code Fast",
    provider: "openrouter",
    pricing: {
      input: 0.0000005, // $0.50 per 1M tokens
      output: 0.0000005, // $0.50 per 1M tokens
      currency: "USD",
    },
    contextWindow: 128000,
    description: "コード生成に特化したモデル",
  },
  {
    id: "nousresearch/hermes-4-405b",
    name: "Hermes 4 405B",
    provider: "openrouter",
    pricing: {
      input: 0.0000009, // $0.90 per 1M tokens
      output: 0.0000009, // $0.90 per 1M tokens
      currency: "USD",
    },
    contextWindow: 128000,
    description: "大規模なパラメータを持つモデル",
  },
  {
    id: "z-ai/glm-4.5",
    name: "GLM-4.5",
    provider: "openrouter",
    pricing: {
      input: 0.0000006, // $0.60 per 1M tokens
      output: 0.0000006, // $0.60 per 1M tokens
      currency: "USD",
    },
    contextWindow: 128000,
    description: "Tsinghua大学の高性能モデル",
  },
  {
    id: "moonshotai/kimi-k2-0905",
    name: "Kimi K2",
    provider: "openrouter",
    pricing: {
      input: 0.0000008, // $0.80 per 1M tokens
      output: 0.0000008, // $0.80 per 1M tokens
      currency: "USD",
    },
    contextWindow: 128000,
    description: "Moonshot AIの最新モデル",
  },
];

// モデルIDから価格情報を取得するヘルパー関数
export const getModelPricing = (modelId: string): ModelInfo | undefined => {
  return MODEL_PRICING_DATA.find((model) => model.id === modelId);
};

// 価格をフォーマットするヘルパー関数
export const formatPrice = (
  price: number,
  currency: "USD" | "JPY" = "USD"
): string => {
  if (currency === "JPY") {
    return `¥${(price * 150).toFixed(2)}`; // 仮の為替レート 1USD = 150JPY
  }
  return `$${price.toFixed(6)}`;
};

// 1Mトークンあたりの価格を表示用にフォーマット
export const formatPricePerMillion = (
  price: number,
  currency: "USD" | "JPY" = "USD"
): string => {
  const pricePerMillion = price * 1000000;
  if (currency === "JPY") {
    return `¥${pricePerMillion.toFixed(0)}`;
  }
  return `$${pricePerMillion.toFixed(2)}`;
};

