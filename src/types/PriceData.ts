export interface PriceQuote {
  source: "FMP" | "TwelveData" | "Yahoo";
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: Date;
  success: boolean;
  error?: string;
}

export interface PriceComparison {
  symbol: string;
  quotes: PriceQuote[];
  discrepancies: {
    maxDifference: number;
    maxDifferencePercent: number;
    sources: string[];
  };
  recommendedQuote: PriceQuote;
}

export interface PriceSourceStatus {
  source: string;
  enabled: boolean;
  lastUsed: Date | null;
  successRate: number;
  avgResponseTime: number;
  requestsToday: number;
  rateLimitRemaining: number;
}
