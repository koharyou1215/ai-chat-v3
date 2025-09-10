// Batch Embeddings API endpoint for efficient vector processing

import { NextRequest, NextResponse } from "next/server";
import { getApiKey } from "@/utils/api-keys";

interface BatchEmbeddingRequest {
  texts: string[];
}

interface BatchEmbeddingResponse {
  embeddings: number[][];
}

export async function POST(request: NextRequest) {
  try {
    const { texts } = (await request.json()) as BatchEmbeddingRequest;

    if (!Array.isArray(texts) || texts.length === 0) {
      return NextResponse.json(
        { error: "Texts must be a non-empty array" },
        { status: 400 }
      );
    }

    if (texts.some((text) => typeof text !== "string")) {
      return NextResponse.json(
        { error: "All texts must be strings" },
        { status: 400 }
      );
    }

    // Validate batch size (OpenAI limit is 2048 inputs per request)
    if (texts.length > 100) {
      return NextResponse.json(
        { error: "Maximum 100 texts per batch request" },
        { status: 400 }
      );
    }

    const embeddings = await generateEmbeddingsBatch(texts);

    return NextResponse.json({
      embeddings,
    } as BatchEmbeddingResponse);
  } catch (error) {
    console.error("Batch embedding API error:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        details:
          process.env.NODE_ENV === "development" ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * Generate multiple embeddings efficiently using OpenAI's batch API
 */
async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  const apiKey = getApiKey("OPENAI_API_KEY");

  if (!apiKey) {
    console.warn(
      "OpenAI API key not configured, skipping embeddings generation"
    );
    // OpenAI APIキーが設定されていない場合は、ダミーの埋め込みベクトルを返す
    return texts.map(() => new Array(1536).fill(0));
  }

  // Truncate texts if too long (OpenAI embedding limit is ~8k tokens)
  const truncatedTexts = texts.map((text) =>
    text.length > 8000 ? text.substring(0, 8000) : text
  );

  // Retry logic for API stability
  const maxRetries = 3;
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "text-embedding-3-small", // Updated model (ada-002 deprecated)
          input: truncatedTexts,
          encoding_format: "float",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(
          `OpenAI API error: ${response.status} ${
            response.statusText
          } - ${JSON.stringify(errorData)}`
        );

        // Don't retry on 4xx errors (client errors)
        if (response.status >= 400 && response.status < 500) {
          throw error;
        }

        lastError = error;
        console.log(
          `Embedding attempt ${attempt}/${maxRetries} failed:`,
          error.message
        );

        if (attempt < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, attempt - 1) * 1000)
          );
          continue;
        }

        throw error;
      }

      // Success - process response
      const data = await response.json();

      // Ensure the embeddings are returned in the same order as input
      // Define types for OpenAI API response
      interface OpenAIEmbeddingItem {
        index: number;
        embedding: number[];
      }

      interface OpenAIEmbeddingData {
        data: OpenAIEmbeddingItem[];
      }

      const typedData = data as OpenAIEmbeddingData;
      const embeddings = typedData.data
        .sort((a, b) => a.index - b.index)
        .map((item) => item.embedding);

      return embeddings;
    } catch (error) {
      lastError = error as Error;
      console.log(`Embedding attempt ${attempt}/${maxRetries} failed:`, error);

      if (attempt === maxRetries) {
        throw lastError;
      }

      // Exponential backoff: 1s, 2s, 4s
      await new Promise((resolve) =>
        setTimeout(resolve, Math.pow(2, attempt - 1) * 1000)
      );
    }
  }

  throw lastError || new Error("All embedding attempts failed");
}
