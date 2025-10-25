// src/constants/model-pricing.ts

import { ModelInfo } from "@/types/core/settings.types";

export const MODEL_PRICING_DATA: ModelInfo[] = [
  // Google Gemini Models
  {
    id: "google/gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    provider: "gemini",
    pricing: {
      input: 0.00000125, // $1.25 per 1M tokens
      output: 0.000005, // $5.00 per 1M tokens
      currency: "USD",
    },
    contextWindow: 2000000,
    description: "Googleの最新の高性能モデル - 200万トークンのコンテキストウィンドウ",
  },
  {
    id: "google/gemini-2.5-flash-preview-09-2025",
    name: "Gemini 2.5 Flash",
    provider: "gemini",
    pricing: {
      input: 0.00000075, // $0.75 per 1M tokens
      output: 0.000003, // $3.00 per 1M tokens
      currency: "USD",
    },
    contextWindow: 1000000,
    description: "高速でコスト効率の良いモデル - 100万トークンのコンテキストウィンドウ",
  },
  {
    id: "google/gemini-2.5-flash-lite-preview-09-2025",
    name: "Gemini 2.5 Flash Light",
    provider: "gemini",
    pricing: {
      input: 0.000000375, // $0.375 per 1M tokens
      output: 0.0000015, // $1.50 per 1M tokens
      currency: "USD",
    },
    contextWindow: 1000000,
    description: "軽量で高速なモデル - 最もコスト効率が良い",
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
    id: "anthropic/claude-sonnet-4.5",
    name: "Claude Sonnet 4.5",
    provider: "openrouter",
    pricing: {
      input: 0.0000035, // $3.5 per 1M tokens
      output: 0.0000175, // $17.5 per 1M tokens
      currency: "USD",
    },
    contextWindow: 200000,
    description: "バランスの取れた高性能モデル (v4.5)",
  },
  {
    id: "anthropic/claude-haiku-4.5",
    name: "Claude Haiku 4.5",
    provider: "openrouter",
    pricing: {
      input: 0.00000025, // $0.25 per 1M tokens
      output: 0.00000125, // $1.25 per 1M tokens
      currency: "USD",
    },
    contextWindow: 200000,
    description: "高速でコスト効率の良い軽量モデル",
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
  {
    id: "x-ai/grok-4-fast:free",
    name: "Grok 4 Fast（無料版）",
    provider: "openrouter",
    pricing: {
      input: 0, // 無料
      output: 0, // 無料
      currency: "USD",
    },
    contextWindow: 128000,
    description: "⚠️ 無料版: コンテンツフィルタが厳格で、応答が途中で停止する場合があります。デバッグログを確認してfinish_reasonとcontent lengthをチェックしてください。",
  },
  {
    id: "x-ai/grok-4-fast",
    name: "Grok-4 Fast",
    provider: "openrouter",
    pricing: {
      input: 0.000001, // $1 per 1M tokens
      output: 0.000005, // $5 per 1M tokens
      currency: "USD",
    },
    contextWindow: 128000,
    description: "xAIの高速モデル - バランスの取れた性能とコスト",
  },
  // grok-code-fast-1 removed from UI list

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
    id: "deepseek/-v3.2-exp",
    name: "DeepSeek v3.2 Experimental",
    provider: "openrouter",
    pricing: {
      input: 0.00000016, // $0.16 per 1M tokens
      output: 0.00000032, // $0.32 per 1M tokens
      currency: "USD",
    },
    contextWindow: 64000,
    description: "DeepSeek v3.2 実験的バージョン",
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
  // removed x-ai/grok-code-fast-1
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
    id: "qwen/qwen3-vl-8b-instruct",
    name: "Qwen 3 VL 8B",
    provider: "openrouter",
    pricing: {
      input: 0.0000001, // $0.10 per 1M tokens
      output: 0.0000003, // $0.30 per 1M tokens
      currency: "USD",
    },
    contextWindow: 32768,
    description: "軽量マルチモーダルモデル（視覚＋言語）- 8Bパラメータ",
  },
  {
    id: "qwen/qwen3-vl-30b-a3b-instruct",
    name: "Qwen 3 VL 30B",
    provider: "openrouter",
    pricing: {
      input: 0.0000002, // $0.20 per 1M tokens
      output: 0.0000006, // $0.60 per 1M tokens
      currency: "USD",
    },
    contextWindow: 32768,
    description: "マルチモーダル対応の30Bパラメータモデル（視覚＋言語）",
  },
  {
    id: "qwen/qwen3-vl-235b-a22b-instruct",
    name: "Qwen 3 VL 235B",
    provider: "openrouter",
    pricing: {
      input: 0.0000004, // $0.40 per 1M tokens
      output: 0.0000012, // $1.20 per 1M tokens
      currency: "USD",
    },
    contextWindow: 32768,
    description: "超大規模マルチモーダルモデル（視覚＋言語）- 235Bパラメータ",
  },
  {
    id: "opengvlab/internvl3-78b",
    name: "InternVL3 78B",
    provider: "openrouter",
    pricing: {
      input: 0.0000005, // $0.50 per 1M tokens
      output: 0.0000015, // $1.50 per 1M tokens
      currency: "USD",
    },
    contextWindow: 32768,
    description: "高性能なマルチモーダルモデル - 視覚と言語の統合処理",
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
    id: "z-ai/glm-4.6",
    name: "GLM-4.6",
    provider: "openrouter",
    pricing: {
      input: 0.0000006, // $0.60 per 1M tokens
      output: 0.0000006, // $0.60 per 1M tokens
      currency: "USD",
    },
    contextWindow: 128000,
    description: "Tsinghua大学の最新高性能モデル（GLM-4.5の改良版）",
  },
  {
    id: "baidu/ernie-4.5-21b-a3b-thinking",
    name: "ERNIE 4.5 21B Thinking",
    provider: "openrouter",
    pricing: {
      input: 0.00000007, // $0.07 per 1M tokens
      output: 0.00000028, // $0.28 per 1M tokens
      currency: "USD",
    },
    contextWindow: 131072,
    description: "Baiduの軽量MoEモデル - 21B総パラメータ、3Bアクティブ（論理、数学、コーディングに特化）",
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
  {
    id: "inclusionai/ling-1t",
    name: "Ling-1T",
    provider: "openrouter",
    pricing: {
      input: 0.000001, // $1.00 per 1M tokens
      output: 0.000003, // $3.00 per 1M tokens
      currency: "USD",
    },
    contextWindow: 131072,
    description: "1兆パラメータのオープンウェイトモデル - 効率的な推論に特化（約50Bアクティブパラメータ）",
  },
  {
    id: "nvidia/llama-3.3-nemotron-super-49b-v1.5",
    name: "Llama 3.3 Nemotron Super 49B v1.5",
    provider: "openrouter",
    pricing: {
      input: 0.0000001, // $0.10 per 1M tokens
      output: 0.0000004, // $0.40 per 1M tokens
      currency: "USD",
    },
    contextWindow: 131072,
    description: "NVIDIAの49Bパラメータ推論特化モデル - エージェントワークフロー対応（RAG、ツール呼び出し）",
  },
  {
    id: "minimax/minimax-m2:free",
    name: "MiniMax M2（無料版）",
    provider: "openrouter",
    pricing: {
      input: 0, // 無料
      output: 0, // 無料
      currency: "USD",
    },
    contextWindow: 128000,
    description: "⚠️ 無料版: MiniMaxの高性能マルチモーダルモデル - テキスト生成と理解に優れる",
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



