export class APIError extends Error {
  constructor(
    public status: number | string,
    public message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class ValidationError extends Error {
  constructor(
    public field: string,
    public message: string,
    public value?: unknown
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error {
  constructor(
    public message: string = '認証に失敗しました',
    public details?: unknown
  ) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class RateLimitError extends Error {
  constructor(
    public retryAfter: number,
    public message: string = 'レート制限に達しました'
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class NetworkError extends Error {
  constructor(
    public message: string = 'ネットワークエラーが発生しました',
    public originalError?: Error
  ) {
    super(message);
    this.name = 'NetworkError';
  }
}
