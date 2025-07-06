export interface QuoteData {
  source: string;
  symbol: string;
  price: number;
  change: number;
  volume: number;
  timestamp: Date;
}

export interface PriceProvider {
  fetchQuote(symbol: string): Promise<QuoteData | null>;
  fetchBatchQuotes?(symbols: string[]): Promise<QuoteData[]>;
}

export interface ProviderStatus {
  name: string;
  enabled: boolean;
  hasApiKey: boolean;
  successRate: number;
  avgResponseTime: number;
  requestsToday: number;
  rateLimitRemaining: number;
  lastUsed: Date | null;
}

// Technical Analysis Types for taapi.io
export interface TechnicalIndicator {
  symbol: string;
  indicator: string;
  value: number;
  signal?: 'buy' | 'sell' | 'neutral';
  timestamp: Date;
}

export interface TechnicalAnalysis {
  symbol: string;
  rsi?: number;
  macd?: {
    macd: number;
    signal: number;
    histogram: number;
  };
  sma?: {
    sma20: number;
    sma50: number;
    sma200: number;
  };
  ema?: {
    ema12: number;
    ema26: number;
  };
  bollinger?: {
    upper: number;
    middle: number;
    lower: number;
  };
  stoch?: {
    k: number;
    d: number;
  };
  timestamp: Date;
}

export interface TechnicalAnalysisProvider {
  fetchTechnicalAnalysis(symbol: string): Promise<TechnicalAnalysis | null>;
  fetchIndicator(symbol: string, indicator: string, params?: Record<string, unknown>): Promise<TechnicalIndicator | null>;
}
