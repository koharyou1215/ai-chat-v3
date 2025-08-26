/**
 * Safe JSON parsing utilities with robust error handling
 * Prevents console errors from malformed JSON responses
 */

export interface SafeJsonResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  isNetworkError: boolean;
  statusCode?: number;
}

/**
 * Safely parse JSON from a Response object with comprehensive error handling
 */
export async function safeJsonParse<T>(response: Response): Promise<SafeJsonResult<T>> {
  try {
    // Check if response exists
    if (!response) {
      return {
        success: false,
        error: 'レスポンスが無効です',
        isNetworkError: true
      };
    }

    const statusCode = response.status;

    // Check response status first
    if (!response.ok) {
      // Try to get error text, but don't fail if it's not JSON
      try {
        const errorText = await response.text();
        return {
          success: false,
          error: `HTTPエラー ${statusCode}: ${errorText || response.statusText}`,
          isNetworkError: statusCode >= 500,
          statusCode
        };
      } catch {
        return {
          success: false,
          error: `HTTPエラー ${statusCode}: ${response.statusText}`,
          isNetworkError: statusCode >= 500,
          statusCode
        };
      }
    }

    // Check content-type to ensure it's JSON
    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      const text = await response.text();
      return {
        success: false,
        error: `レスポンスがJSONではありません。Content-Type: ${contentType || 'unknown'}`,
        isNetworkError: false,
        statusCode
      };
    }

    // Attempt to parse JSON
    const data = await response.json() as T;
    
    return {
      success: true,
      data,
      isNetworkError: false,
      statusCode
    };

  } catch (error) {
    // Handle various error types
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        success: false,
        error: 'ネットワークエラー: サーバーに接続できません',
        isNetworkError: true
      };
    }

    if (error instanceof SyntaxError) {
      return {
        success: false,
        error: 'JSONパースエラー: レスポンスの形式が不正です',
        isNetworkError: false,
        statusCode: response?.status
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'JSONの解析中に予期しないエラーが発生しました',
      isNetworkError: false,
      statusCode: response?.status
    };
  }
}

/**
 * Safely parse JSON from a string
 */
export function safeStringJsonParse<T>(jsonString: string): SafeJsonResult<T> {
  try {
    if (!jsonString || typeof jsonString !== 'string') {
      return {
        success: false,
        error: 'JSONストリングが無効です',
        isNetworkError: false
      };
    }

    const data = JSON.parse(jsonString) as T;
    return {
      success: true,
      data,
      isNetworkError: false
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'JSONパースエラー',
      isNetworkError: false
    };
  }
}

/**
 * Create a user-friendly error message from SafeJsonResult
 */
export function formatApiError<T>(result: SafeJsonResult<T>, operation: string = 'API呼び出し'): string {
  if (result.success) {
    return '';
  }

  if (result.isNetworkError) {
    return `${operation}に失敗しました: ネットワーク接続を確認してください。`;
  }

  if (result.statusCode && result.statusCode >= 400) {
    switch (result.statusCode) {
      case 400:
        return `${operation}に失敗しました: リクエストの形式が不正です。`;
      case 401:
        return `${operation}に失敗しました: 認証が必要です。`;
      case 403:
        return `${operation}に失敗しました: アクセス権限がありません。`;
      case 404:
        return `${operation}に失敗しました: リソースが見つかりません。`;
      case 429:
        return `${operation}に失敗しました: リクエストが多すぎます。時間をおいて再試行してください。`;
      case 500:
        return `${operation}に失敗しました: サーバーエラーが発生しました。`;
      default:
        return `${operation}に失敗しました: ${result.error}`;
    }
  }

  return `${operation}に失敗しました: ${result.error}`;
}

/**
 * Wrapper for fetch with automatic JSON parsing and error handling
 */
export async function safeFetch<T>(
  url: string, 
  options?: RequestInit,
  operation?: string
): Promise<SafeJsonResult<T>> {
  try {
    const response = await fetch(url, options);
    const result = await safeJsonParse<T>(response);
    
    // Add operation context to error messages
    if (!result.success && operation) {
      result.error = formatApiError(result, operation);
    }
    
    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'ネットワークエラーが発生しました',
      isNetworkError: true
    };
  }
}

/**
 * Type guard to check if an object has required properties
 */
export function hasRequiredProperties<T extends Record<string, unknown>>(
  obj: unknown, 
  requiredKeys: (keyof T)[]
): obj is T {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const objRecord = obj as Record<string, unknown>;
  return requiredKeys.every(key => {
    const keyStr = String(key);
    return keyStr in objRecord && objRecord[keyStr] !== undefined;
  });
}

/**
 * Safely access nested object properties
 */
export function safeGet<T>(obj: unknown, path: string, defaultValue?: T): T | undefined {
  try {
    const keys = path.split('.');
    let current: unknown = obj;
    
    for (const key of keys) {
      if (current === null || current === undefined) {
        return defaultValue;
      }
      if (typeof current === 'object') {
        current = (current as Record<string, unknown>)[key];
      } else {
        return defaultValue;
      }
    }
    
    return current !== undefined ? (current as T) : defaultValue;
  } catch {
    return defaultValue;
  }
}