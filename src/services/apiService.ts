import { TrendingData } from "../types/Asset";
import { pricingService } from "./pricingService";

// API configuration
const API_CONFIG = {
  REDDIT_DELAY: 1000, // 1 second between requests
  COINGECKO_DELAY: 1200, // Respect rate limits
  MAX_RETRIES: 3,
};

interface RedditMention {
  ticker: string;
  mentions: number;
  sentiment: number;
  avgScore: number;
  source: string;
}

interface CoinData {
  ticker: string;
  name: string;
  priceChange24h: number;
  marketCapRank: number;
  volume24h: number;
  marketCap: number;
  source: string;
}

interface StockData {
  ticker: string;
  price: number;
  changePercent: number;
  volume: number;
  source: string;
}

class APIService {
  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async fetchWithRetry(
    url: string,
    options: RequestInit = {},
    retries = API_CONFIG.MAX_RETRIES,
  ): Promise<Response> {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          "User-Agent": "AlphaMachine/1.0",
          ...options.headers,
        },
      });

      if (!response.ok && retries > 0) {
        await this.delay(2000);
        return this.fetchWithRetry(url, options, retries - 1);
      }

      return response;
    } catch (error) {
      if (retries > 0) {
        await this.delay(2000);
        return this.fetchWithRetry(url, options, retries - 1);
      }
      throw error;
    }
  }

  // Reddit API Integration
  async fetchRedditTrending(): Promise<RedditMention[]> {
    const subreddits = [
      "wallstreetbets",
      "stocks",
      "investing",
      "cryptocurrency",
      "CryptoCurrency",
    ];
    const mentions = new Map<
      string,
      { count: number; totalScore: number; posts: number }
    >();

    console.log("🔍 Scanning Reddit for trending tickers...");

    for (const subreddit of subreddits) {
      try {
        await this.delay(API_CONFIG.REDDIT_DELAY);

        const response = await this.fetchWithRetry(
          `https://www.reddit.com/r/${subreddit}/hot.json?limit=100`,
        );

        if (!response.ok) continue;

        const data = await response.json();

        data.data.children.forEach((post: any) => {
          const title = post.data.title.toUpperCase();
          const body = (post.data.selftext || "").toUpperCase();
          const text = `${title} ${body}`;
          const score = post.data.score || 0;

          // Enhanced ticker extraction
          const tickerMatches =
            text.match(/\$([A-Z]{2,5})\b|(?:^|\s)([A-Z]{2,5})(?=\s|$)/g) || [];

          tickerMatches.forEach((match) => {
            const ticker = match.replace(/[$\s]/g, "");

            // Filter out common false positives
            const blacklist = [
              "THE",
              "AND",
              "FOR",
              "ARE",
              "BUT",
              "NOT",
              "YOU",
              "ALL",
              "CAN",
              "HER",
              "WAS",
              "ONE",
              "OUR",
              "OUT",
              "DAY",
              "GET",
              "USE",
              "MAN",
              "NEW",
              "NOW",
              "WAY",
              "MAY",
              "SAY",
              "SEE",
              "HIM",
              "TWO",
              "HOW",
              "ITS",
              "WHO",
              "OIL",
              "SIT",
              "SET",
              "RUN",
              "EAT",
              "FAR",
              "SEA",
              "EYE",
              "BED",
              "RED",
              "TOP",
              "ARM",
              "TOO",
              "OLD",
              "ANY",
              "APP",
              "BAD",
              "BIG",
              "BOY",
              "BUY",
              "CAR",
              "CUT",
              "DID",
              "END",
              "FEW",
              "GOT",
              "HIT",
              "HOT",
              "JOB",
              "LET",
              "LOT",
              "LOW",
              "OWN",
              "PAY",
              "PUT",
              "SIX",
              "TEN",
              "TRY",
              "WIN",
              "YES",
              "YET",
            ];

            if (
              ticker.length >= 2 &&
              ticker.length <= 5 &&
              !blacklist.includes(ticker)
            ) {
              const current = mentions.get(ticker) || {
                count: 0,
                totalScore: 0,
                posts: 0,
              };
              mentions.set(ticker, {
                count: current.count + 1,
                totalScore: current.totalScore + Math.max(score, 1),
                posts: current.posts + 1,
              });
            }
          });
        });

        console.log(`✅ Scanned r/${subreddit}`);
      } catch (error) {
        console.error(`❌ Failed to fetch r/${subreddit}:`, error);
      }
    }

    // Process and filter results
    return Array.from(mentions.entries())
      .filter(([, data]) => data.count >= 5) // Minimum 5 mentions
      .map(([ticker, data]) => ({
        ticker,
        mentions: data.count,
        sentiment: Math.min(
          1,
          Math.max(0, data.totalScore / (data.posts * 100)),
        ), // Normalize sentiment
        avgScore: data.totalScore / data.posts,
        source: "Reddit",
      }))
      .sort((a, b) => b.mentions - a.mentions)
      .slice(0, 20); // Top 20 most mentioned
  }

  // CoinGecko API Integration
  async fetchCoinGeckoTrending(): Promise<CoinData[]> {
    console.log("🚀 Fetching trending crypto from CoinGecko...");

    try {
      await this.delay(API_CONFIG.COINGECKO_DELAY);

      // Get trending coins
      const trendingResponse = await this.fetchWithRetry(
        "https://api.coingecko.com/api/v3/search/trending",
      );
      const trending = await trendingResponse.json();

      if (!trending.coins) return [];

      // Get detailed market data
      const coinIds = trending.coins
        .slice(0, 15)
        .map((coin: any) => coin.item.id)
        .join(",");

      await this.delay(API_CONFIG.COINGECKO_DELAY);

      const marketResponse = await this.fetchWithRetry(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coinIds}&order=market_cap_desc&per_page=15&page=1&sparkline=false&price_change_percentage=24h,7d`,
      );

      const marketData = await marketResponse.json();

      if (!Array.isArray(marketData)) return [];

      console.log(`✅ Found ${marketData.length} trending coins`);

      return marketData.map((coin: any) => ({
        ticker: coin.symbol.toUpperCase(),
        name: coin.name,
        priceChange24h: coin.price_change_percentage_24h || 0,
        marketCapRank: coin.market_cap_rank || 999,
        volume24h: coin.total_volume || 0,
        marketCap: coin.market_cap || 0,
        source: "CoinGecko",
      }));
    } catch (error) {
      console.error("❌ CoinGecko API error:", error);
      return [];
    }
  }

  // FMP Stock Data Integration
  async fetchFMPStockData(symbols: string[]): Promise<StockData[]> {
    console.log("📈 Fetching stock data from Financial Modeling Prep...");

    const results: StockData[] = [];

    try {
      const stockPrices = await pricingService.fetchStockPrices(symbols);

      stockPrices.forEach((priceData) => {
        if (priceData.price && priceData.percentChange24h !== undefined) {
          results.push({
            ticker: priceData.ticker,
            price: priceData.price,
            changePercent: priceData.percentChange24h,
            volume: priceData.volume || 0,
            source: "Financial Modeling Prep",
          });
        }
      });

      console.log(
        `✅ Retrieved data for ${results.length}/${symbols.length} stocks`,
      );
    } catch (error) {
      console.error("❌ FMP API error:", error);
    }

    return results;
  }

  // Get popular stock tickers to check
  getPopularStockTickers(): string[] {
    return [
      // Meme stocks
      "GME",
      "AMC",
      "BBBY",
      "PLTR",
      "WISH",
      "CLOV",
      "SPCE",
      "NKLA",
      // Tech giants
      "TSLA",
      "NVDA",
      "AAPL",
      "MSFT",
      "GOOGL",
      "AMZN",
      "META",
      // Popular trading stocks
      "SPY",
      "QQQ",
      "IWM",
      "SQQQ",
      "TQQQ",
      "UVXY",
      "VIX",
      // Recent IPOs and SPACs
      "RIVN",
      "LCID",
      "F",
      "NIO",
      "XPEV",
      "LI",
    ];
  }

  // Calculate meme scores based on data
  calculateMemeScore(data: {
    redditMentions?: number;
    redditSentiment?: number;
    priceChange?: number;
    marketCapRank?: number;
  }): number {
    let score = 0;

    // Reddit buzz (0-2 points)
    if (data.redditMentions) {
      if (data.redditMentions > 50) score += 2;
      else if (data.redditMentions > 20) score += 1;

      if (data.redditSentiment && data.redditSentiment > 0.7) score += 1;
    }

    // Price movement (0-2 points)
    if (data.priceChange) {
      if (Math.abs(data.priceChange) > 15) score += 2;
      else if (Math.abs(data.priceChange) > 8) score += 1;
    }

    // Small cap bonus for crypto (0-1 point)
    if (data.marketCapRank && data.marketCapRank > 50) score += 1;

    return Math.min(4, score);
  }

  // Main integration method
  async scanAllSources(): Promise<TrendingData[]> {
    console.log("🔍 Starting comprehensive market scan...");

    const [redditData, cryptoData, stockData] = await Promise.all([
      this.fetchRedditTrending().catch((err) => {
        console.error("Reddit scan failed:", err);
        return [];
      }),
      this.fetchCoinGeckoTrending().catch((err) => {
        console.error("CoinGecko scan failed:", err);
        return [];
      }),
      this.fetchFMPStockData(this.getPopularStockTickers()).catch((err) => {
        console.error("FMP stock scan failed:", err);
        return [];
      }),
    ]);

    // Merge and process all data
    const trendingAssets: TrendingData[] = [];
    const processedTickers = new Set<string>();

    // Process Reddit mentions
    redditData.forEach((reddit) => {
      if (processedTickers.has(reddit.ticker)) return;

      const memeScore = this.calculateMemeScore({
        redditMentions: reddit.mentions,
        redditSentiment: reddit.sentiment,
      });

      if (memeScore >= 2) {
        // Only include if significant buzz
        trendingAssets.push({
          ticker: reddit.ticker,
          type: this.determineAssetType(reddit.ticker),
          memeScore,
          sources: ["Reddit"],
          confidence: Math.min(95, reddit.mentions * 2 + reddit.sentiment * 30),
          summary: `🔥 Trending on Reddit: ${reddit.mentions} mentions with ${(reddit.sentiment * 100).toFixed(0)}% positive sentiment`,
        });
        processedTickers.add(reddit.ticker);
      }
    });

    // Process crypto data
    cryptoData.forEach((crypto) => {
      const existingIndex = trendingAssets.findIndex(
        (asset) => asset.ticker === crypto.ticker,
      );
      const memeScore = this.calculateMemeScore({
        priceChange: crypto.priceChange24h,
        marketCapRank: crypto.marketCapRank,
      });

      if (existingIndex >= 0) {
        // Merge with existing
        const existing = trendingAssets[existingIndex];
        existing.sources.push("CoinGecko");
        existing.memeScore = Math.max(existing.memeScore, memeScore);
        existing.confidence = Math.min(95, existing.confidence + 20);
        existing.summary += ` | 🚀 ${crypto.priceChange24h > 0 ? "+" : ""}${crypto.priceChange24h.toFixed(1)}% (24h)`;
      } else if (memeScore >= 2) {
        trendingAssets.push({
          ticker: crypto.ticker,
          type: "Coin",
          memeScore,
          sources: ["CoinGecko"],
          confidence: Math.min(
            90,
            Math.abs(crypto.priceChange24h) * 2 + (100 - crypto.marketCapRank),
          ),
          summary: `🚀 ${crypto.name}: ${crypto.priceChange24h > 0 ? "+" : ""}${crypto.priceChange24h.toFixed(1)}% in 24h, ranked #${crypto.marketCapRank}`,
        });
      }
    });

    // Process stock data
    stockData.forEach((stock) => {
      const existingIndex = trendingAssets.findIndex(
        (asset) => asset.ticker === stock.ticker,
      );
      const memeScore = this.calculateMemeScore({
        priceChange: stock.changePercent,
      });

      if (existingIndex >= 0) {
        // Merge with existing
        const existing = trendingAssets[existingIndex];
        existing.sources.push("Financial Modeling Prep");
        existing.memeScore = Math.max(existing.memeScore, memeScore);
        existing.confidence = Math.min(95, existing.confidence + 15);
        existing.summary += ` | 📈 ${stock.changePercent > 0 ? "+" : ""}${stock.changePercent.toFixed(1)}%`;
      } else if (memeScore >= 2 || Math.abs(stock.changePercent) > 10) {
        trendingAssets.push({
          ticker: stock.ticker,
          type: "Stock",
          memeScore,
          sources: ["Financial Modeling Prep"],
          confidence: Math.min(85, Math.abs(stock.changePercent) * 3),
          summary: `📈 ${stock.changePercent > 0 ? "+" : ""}${stock.changePercent.toFixed(1)}% price movement`,
        });
      }
    });

    // Sort by confidence and return top results
    const results = trendingAssets
      .filter((asset) => asset.confidence >= 50)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 25);

    console.log(
      `✅ Scan complete: Found ${results.length} high-confidence trending assets`,
    );
    return results;
  }

  private determineAssetType(ticker: string): "Stock" | "Coin" {
    const cryptoTickers = [
      "BTC",
      "ETH",
      "BNB",
      "XRP",
      "ADA",
      "SOL",
      "DOGE",
      "DOT",
      "AVAX",
      "SHIB",
      "MATIC",
      "LTC",
      "UNI",
      "LINK",
      "ATOM",
      "XLM",
      "VET",
      "FIL",
      "TRX",
      "ETC",
      "HBAR",
      "ALGO",
      "ICP",
      "NEAR",
      "FLOW",
      "MANA",
      "SAND",
      "AXS",
      "CHZ",
      "ENJ",
      "PEPE",
      "FLOKI",
      "BABYDOGE",
      "SAFEMOON",
      "BONK",
      "WIF",
      "BOME",
    ];
    return cryptoTickers.includes(ticker) ? "Coin" : "Stock";
  }
}

export const apiService = new APIService();
