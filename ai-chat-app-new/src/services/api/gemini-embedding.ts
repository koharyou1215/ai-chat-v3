export interface GeminiEmbeddingRequest {
  model: string;
  content: {
    parts: { text: string }[];
  };
  taskType?: 'RETRIEVAL_QUERY' | 'RETRIEVAL_DOCUMENT' | 'SEMANTIC_SIMILARITY';
  title?: string;
}

export interface GeminiEmbeddingResponse {
  embedding: {
    values: number[];
  };
}

export class GeminiEmbeddingClient {
  private apiKey: string;
  private baseURL: string;
  private model: string;

  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
    this.baseURL = 'https://generativelanguage.googleapis.com/v1beta/models';
    this.model = 'text-embedding-004';
  }

  /**
   * テキストをベクトル化する
   */
  async generateEmbedding(
    text: string,
    taskType: 'RETRIEVAL_QUERY' | 'RETRIEVAL_DOCUMENT' | 'SEMANTIC_SIMILARITY' = 'SEMANTIC_SIMILARITY',
    title?: string
  ): Promise<number[]> {
    try {
      if (!this.apiKey) {
        throw new Error('Gemini APIキーが設定されていません');
      }

      const request: GeminiEmbeddingRequest = {
        model: this.model,
        content: {
          parts: [{ text }]
        },
        taskType,
        title
      };

      const url = `${this.baseURL}/${this.model}:embedContent?key=${this.apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Gemini Embedding API error: ${errorData.error?.message || response.statusText}`);
      }

      const data: GeminiEmbeddingResponse = await response.json();
      return data.embedding.values;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const apiError = error.response?.data as Record<string, unknown>;
        console.error(
          `Gemini Embedding API Error: ${apiError?.error?.message || error.message}`
        );
        throw new Error(
          `Gemini Embedding API Error: ${apiError?.error?.message || error.message}`
        );
      }
    }
  }

  /**
   * 複数のテキストを一括でベクトル化する
   */
  async generateMultipleEmbeddings(
    texts: string[],
    taskType: 'RETRIEVAL_QUERY' | 'RETRIEVAL_DOCUMENT' | 'SEMANTIC_SIMILARITY' = 'SEMANTIC_SIMILARITY'
  ): Promise<number[][]> {
    try {
      const embeddings: number[][] = [];
      
      // レート制限を考慮して順次処理
      for (const text of texts) {
        const embedding = await this.generateEmbedding(text, taskType);
        embeddings.push(embedding);
        
        // レート制限対策（100ms待機）
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      return embeddings;
    } catch (error) {
      console.error('Multiple embedding generation failed:', error);
      throw error;
    }
  }

  /**
   * コサイン類似度を計算する
   */
  static calculateCosineSimilarity(vectorA: number[], vectorB: number[]): number {
    if (vectorA.length !== vectorB.length) {
      throw new Error('ベクトルの次元が一致しません');
    }

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      magnitudeA += vectorA[i] * vectorA[i];
      magnitudeB += vectorB[i] * vectorB[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }

    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * 最も類似度の高いベクトルを検索する
   */
  static findMostSimilar(
    queryVector: number[],
    candidateVectors: Array<{ id: string; vector: number[]; metadata?: Record<string, unknown> }>,
    topK: number = 10,
    threshold: number = 0.5
  ): Array<{ id: string; similarity: number; metadata?: Record<string, unknown> }> {
    const similarities = candidateVectors.map(candidate => ({
      id: candidate.id,
      similarity: this.calculateCosineSimilarity(queryVector, candidate.vector),
      metadata: candidate.metadata
    }));

    return similarities
      .filter(item => item.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  /**
   * ベクトルを正規化する
   */
  static normalizeVector(vector: number[]): number[] {
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (magnitude === 0) return vector;
    return vector.map(val => val / magnitude);
  }

  /**
   * ユークリッド距離を計算する
   */
  static calculateEuclideanDistance(vectorA: number[], vectorB: number[]): number {
    if (vectorA.length !== vectorB.length) {
      throw new Error('ベクトルの次元が一致しません');
    }

    return Math.sqrt(
      vectorA.reduce((sum, val, i) => sum + Math.pow(val - vectorB[i], 2), 0)
    );
  }

  /**
   * ベクトルの平均を計算する
   */
  static calculateMeanVector(vectors: number[][]): number[] {
    if (vectors.length === 0) return [];
    
    const dimensions = vectors[0].length;
    const meanVector = new Array(dimensions).fill(0);
    
    for (const vector of vectors) {
      for (let i = 0; i < dimensions; i++) {
        meanVector[i] += vector[i];
      }
    }
    
    return meanVector.map(val => val / vectors.length);
  }

  /**
   * モデルを変更
   */
  setModel(model: string) {
    this.model = model;
  }

  /**
   * APIキーを設定
   */
  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
  }
}

// シングルトンインスタンス
export const geminiEmbeddingClient = new GeminiEmbeddingClient();