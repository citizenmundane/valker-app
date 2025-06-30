export interface Asset {
  id: string;
  ticker: string;
  type: "Stock" | "Coin";
  memeScore: number; // 0-4
  politicalScore: number; // 0-3
  earningsScore: number; // 0-2
  totalScore: number; // calculated
  recommendation: "Buy & Hold" | "Short-Term Watch" | "On Watch";
  alertSent: boolean;
  gptSummary: string;
  // New pricing fields
  livePrice?: number;
  priceChange24h?: number;
  percentChange24h?: number;
  lastPriceUpdate?: Date;
  // New retention fields
  sources?: string[]; // Which APIs/sources detected this
  unusualVolume?: boolean; // Flag for unusual volume activity
  isPoliticalTrade?: boolean; // Flag for political/insider trades
  isEarningsBased?: boolean; // Flag for earnings-related signals
  visibility?: "visible" | "hidden"; // Control visibility in UI
  createdAt: Date;
  updatedAt: Date;
}

export interface PendingAsset {
  id: string;
  ticker: string;
  type: "Stock" | "Coin";
  memeScore: number;
  politicalScore: number;
  earningsScore: number;
  totalScore: number;
  recommendation: "Buy & Hold" | "Short-Term Watch" | "On Watch";
  gptSummary: string;
  sources: string[]; // Which APIs/sources detected this
  confidence: number; // 0-100 confidence score
  discoveredAt: Date;
  status: "pending" | "approved" | "rejected";
  // New retention fields
  unusualVolume?: boolean;
  isPoliticalTrade?: boolean;
  isEarningsBased?: boolean;
  visibility?: "visible" | "hidden";
}

export interface AssetFormData {
  ticker: string;
  type: "Stock" | "Coin";
  memeScore: number;
  politicalScore: number;
  earningsScore: number;
  gptSummary: string;
  sources?: string[];
  unusualVolume?: boolean;
  isPoliticalTrade?: boolean;
  isEarningsBased?: boolean;
}

export interface TrendingData {
  ticker: string;
  type: "Stock" | "Coin";
  memeScore: number;
  sources: string[];
  confidence: number;
  summary: string;
  unusualVolume?: boolean;
  isPoliticalTrade?: boolean;
  isEarningsBased?: boolean;
}

export interface PriceData {
  ticker: string;
  price: number;
  change24h: number;
  percentChange24h: number;
  lastUpdated: Date;
  source: string;
  volume?: number;
}
