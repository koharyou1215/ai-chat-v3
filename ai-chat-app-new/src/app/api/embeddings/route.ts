// OpenAI Embeddings API endpoint for vector search functionality

import { NextRequest, NextResponse } from 'next/server';
import { getApiKey } from '@/utils/api-keys';

interface EmbeddingRequest {
  text: string;
}

interface BatchEmbeddingRequest {
  texts: string[];
}

interface EmbeddingResponse {
  embedding: number[];
}

interface BatchEmbeddingResponse {
  embeddings: number[][];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Single text embedding
    if ('text' in body) {
      const { text } = body as EmbeddingRequest;
      
      if (!text || typeof text !== 'string') {
        return NextResponse.json(
          { error: 'Text is required and must be a string' },
          { status: 400 }
        );
      }

      const embedding = await generateEmbedding(text);
      
      return NextResponse.json({
        embedding
      } as EmbeddingResponse);
    }
    
    // Batch text embeddings
    if ('texts' in body) {
      const { texts } = body as BatchEmbeddingRequest;
      
      if (!Array.isArray(texts) || texts.length === 0) {
        return NextResponse.json(
          { error: 'Texts must be a non-empty array' },
          { status: 400 }
        );
      }

      if (texts.some(text => typeof text !== 'string')) {
        return NextResponse.json(
          { error: 'All texts must be strings' },
          { status: 400 }
        );
      }

      if (texts.length > 100) {
        return NextResponse.json(
          { error: 'Maximum 100 texts per batch request' },
          { status: 400 }
        );
      }

      const embeddings = await generateEmbeddingsBatch(texts);
      
      return NextResponse.json({
        embeddings
      } as BatchEmbeddingResponse);
    }
    
    return NextResponse.json(
      { error: 'Invalid request format. Expected "text" or "texts" field' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Embedding API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined 
      },
      { status: 500 }
    );
  }
}

/**
 * Generate a single embedding using OpenAI's API
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = getApiKey('OPENAI_API_KEY');
  
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }
  
  // Truncate text if too long (OpenAI embedding limit is ~8k tokens)
  const truncatedText = text.length > 8000 ? text.substring(0, 8000) : text;
  
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-ada-002', // Most cost-effective model
      input: truncatedText,
      encoding_format: 'float'
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

/**
 * Generate multiple embeddings in batch using OpenAI's API
 */
async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  const apiKey = getApiKey('OPENAI_API_KEY');
  
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }
  
  // Truncate texts if too long
  const truncatedTexts = texts.map(text => 
    text.length > 8000 ? text.substring(0, 8000) : text
  );
  
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-ada-002',
      input: truncatedTexts,
      encoding_format: 'float'
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
  }

  const data = await response.json();
  // Define types for OpenAI API response
  interface OpenAIEmbeddingItem {
    embedding: number[];
  }
  
  interface OpenAIEmbeddingData {
    data: OpenAIEmbeddingItem[];
  }
  
  const typedData = data as OpenAIEmbeddingData;
  return typedData.data.map(item => item.embedding);
}