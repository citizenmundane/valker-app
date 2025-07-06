import { tickerValidation } from "./tickerValidation";

interface RedditMention {
  ticker: string;
  type: "Stock" | "Coin";
  mentions: number;
  sentiment: number;
  avgScore: number;
  posts: number;
  source: string;
  rawMentions?: string[]; // For debug mode
}

interface RedditPost {
  data: {
    title?: string;
    selftext?: string;
    score?: number;
    num_comments?: number;
    upvote_ratio?: number;
  };
}

interface RedditResponse {
  data: {
    children: RedditPost[];
  };
}

interface RedditScanResult {
  mentions: RedditMention[];
  debugInfo?: {
    totalPosts: number;
    rawExtractions: string[];
    filteredOut: string[];
    subredditsScanned: string[];
  };
}

export class RedditScanner {
  private debugMode: boolean = false;
  private requestDelay: number = 1500; // 1.5 seconds between requests

  constructor() {
    // Enable debug mode in development
    this.debugMode = import.meta.env.DEV || false;
    if (this.debugMode) {
      console.log("🔍 Reddit Scanner: Debug mode enabled");
    }
  }

  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
    tickerValidation.setDebugMode(enabled);
    console.log(
      `🔍 Reddit Scanner Debug Mode: ${enabled ? "ENABLED" : "DISABLED"}`,
    );
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async fetchWithRetry(url: string, retries = 3): Promise<Response> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          headers: {
            "User-Agent": "Valker/1.0 (Educational Research)",
            Accept: "application/json",
          },
        });

        if (response.ok) {
          return response;
        }

        if (response.status === 429) {
          // Rate limited, wait longer
          const waitTime = Math.pow(2, attempt) * 2000;
          console.log(`⏳ Reddit rate limited, waiting ${waitTime}ms...`);
          await this.delay(waitTime);
          continue;
        }

        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      } catch (error) {
        if (attempt === retries) {
          throw error;
        }
        await this.delay(1000 * (attempt + 1));
      }
    }
    throw new Error("Max retries exceeded");
  }

  private isCryptoSubreddit(subreddit: string): boolean {
    const cryptoSubs = [
      "cryptocurrency",
      "cryptomarkets",
      "altcoin",
      "defi",
      "ethtrader",
      "bitcoin",
      "ethereum",
      "dogecoin",
      "shibarmy",
      "solana",
    ];
    return cryptoSubs.includes(subreddit.toLowerCase());
  }

  private analyzeSentiment(text: string): number {
    // Enhanced sentiment analysis
    const positiveWords = [
      "moon",
      "rocket",
      "bullish",
      "pump",
      "squeeze",
      "diamond",
      "hands",
      "hodl",
      "buy",
      "long",
      "call",
      "green",
      "profit",
      "gain",
      "win",
      "success",
      "🚀",
      "💎",
      "",
      "mooning",
      "exploding",
      "flying",
      "soaring",
      "breaking",
      "out",
      "breakout",
      "support",
      "resistance",
      "break",
      "through",
      "volume",
      "spike",
      "momentum",
      "lambo",
      "tendies",
      "gains",
      "moon",
      "rocket",
      "pump",
      "bull",
      "bullish",
    ];

    const negativeWords = [
      "bearish",
      "dump",
      "sell",
      "short",
      "put",
      "red",
      "loss",
      "crash",
      "dump",
      "paper",
      "hands",
      "fud",
      "scam",
      "rug",
      "pull",
      "dead",
      "📉",
      "💀",
      "",
      "falling",
      "dropping",
      "crashing",
      "bear",
      "market",
      "recession",
      "bubble",
      "dump",
      "sell",
      "short",
      "bearish",
      "crash",
      "loss",
      "red",
    ];

    const textLower = text.toLowerCase();
    let positiveCount = 0;
    let negativeCount = 0;

    positiveWords.forEach((word) => {
      const regex = new RegExp(`\\b${word}\\b`, "gi");
      const matches = textLower.match(regex);
      if (matches) positiveCount += matches.length;
    });

    negativeWords.forEach((word) => {
      const regex = new RegExp(`\\b${word}\\b`, "gi");
      const matches = textLower.match(regex);
      if (matches) negativeCount += matches.length;
    });

    // Calculate sentiment score (0-1)
    const total = positiveCount + negativeCount;
    if (total === 0) return 0.5; // Neutral

    return Math.max(0, Math.min(1, positiveCount / total));
  }

  private calculateEngagementScore(post: RedditPost): number {
    // Enhanced engagement scoring
    const upvotes = post.data.score || 0;
    const comments = post.data.num_comments || 0;
    const upvoteRatio = post.data.upvote_ratio || 0.5;

    // Weight different engagement factors
    const upvoteScore = Math.min(upvotes / 100, 1); // Cap at 100 upvotes
    const commentScore = Math.min(comments / 50, 1); // Cap at 50 comments
    const ratioScore = upvoteRatio;

    // Weighted average
    return upvoteScore * 0.4 + commentScore * 0.3 + ratioScore * 0.3;
  }

  async scanRedditMentions(): Promise<RedditScanResult> {
    console.log(
      "🔍 Starting enhanced Reddit scan with improved sentiment analysis...",
    );

    const subreddits = [
      // Stock-focused subreddits
      "wallstreetbets",
      "stocks",
      "investing",
      "SecurityAnalysis",
      "ValueInvesting",
      "pennystocks",
      "robinhoodpennystocks",
      "StockMarket",
      "options",
      "thetagang",

      // Crypto-focused subreddits
      "cryptocurrency",
      "CryptoCurrency",
      "altcoin",
      "defi",
      "ethtrader",
      "bitcoin",
      "ethereum",
      "dogecoin",
      "shibarmy",
    ];

    const tickerMentions = new Map<
      string,
      {
        type: "Stock" | "Coin";
        count: number;
        totalScore: number;
        posts: number;
        sentiment: number;
        rawMentions: string[];
      }
    >();

    const debugInfo = {
      totalPosts: 0,
      rawExtractions: [] as string[],
      filteredOut: [] as string[],
      subredditsScanned: [] as string[],
    };

    for (const subreddit of subreddits) {
      try {
        await this.delay(this.requestDelay);

        console.log(`🔍 Scanning r/${subreddit}...`);
        const response = await this.fetchWithRetry(
          `https://www.reddit.com/r/${subreddit}/hot.json?limit=100`,
        );

        const data = await response.json() as RedditResponse;

        if (!data.data?.children) {
          console.warn(`⚠️ No data from r/${subreddit}`);
          continue;
        }

        debugInfo.subredditsScanned.push(subreddit);
        const isCrypto = this.isCryptoSubreddit(subreddit);

        data.data.children.forEach((post: RedditPost) => {
          const title = (post.data.title || "").toUpperCase();
          const body = (post.data.selftext || "").toUpperCase();
          const text = `${title} ${body}`;

          // Enhanced scoring
          const engagementScore = this.calculateEngagementScore(post);
          const sentimentScore = this.analyzeSentiment(text);
          const finalScore =
            Math.max(post.data.score || 0, 1) *
            engagementScore *
            sentimentScore;

          debugInfo.totalPosts++;

          // Extract stock tickers ($TICKER format)
          const stockTickers = tickerValidation.extractStockTickers(text);

          // Extract crypto tickers (only from crypto subreddits)
          const cryptoTickers = tickerValidation.extractCryptoTickers(
            text,
            isCrypto,
          );

          // Process stock tickers
          stockTickers.forEach((ticker) => {
            if (this.debugMode) {
              debugInfo.rawExtractions.push(
                `$${ticker} (Stock) from r/${subreddit}`,
              );
            }

            const key = `${ticker}-Stock`;
            const current = tickerMentions.get(key) || {
              type: "Stock" as const,
              count: 0,
              totalScore: 0,
              posts: 0,
              sentiment: 0,
              rawMentions: [],
            };

            tickerMentions.set(key, {
              type: "Stock",
              count: current.count + 1,
              totalScore: current.totalScore + finalScore,
              posts: current.posts + 1,
              sentiment: current.sentiment + sentimentScore,
              rawMentions: this.debugMode
                ? [
                    ...current.rawMentions,
                    `r/${subreddit}: ${title.substring(0, 50)}...`,
                  ]
                : [],
            });
          });

          // Process crypto tickers
          cryptoTickers.forEach((ticker) => {
            if (this.debugMode) {
              debugInfo.rawExtractions.push(
                `${ticker} (Crypto) from r/${subreddit}`,
              );
            }

            const key = `${ticker}-Coin`;
            const current = tickerMentions.get(key) || {
              type: "Coin" as const,
              count: 0,
              totalScore: 0,
              posts: 0,
              sentiment: 0,
              rawMentions: [],
            };

            tickerMentions.set(key, {
              type: "Coin",
              count: current.count + 1,
              totalScore: current.totalScore + finalScore,
              posts: current.posts + 1,
              sentiment: current.sentiment + sentimentScore,
              rawMentions: this.debugMode
                ? [
                    ...current.rawMentions,
                    `r/${subreddit}: ${title.substring(0, 50)}...`,
                  ]
                : [],
            });
          });
        });

        console.log(`✅ Scanned r/${subreddit}`);
      } catch (error) {
        console.error(`❌ Failed to fetch r/${subreddit}:`, error);
      }
    }

    // Process and filter results
    const mentions: RedditMention[] = Array.from(tickerMentions.entries())
      .filter(([, data]) => data.count >= 3) // Minimum 3 mentions
      .map(([key, data]) => {
        const [ticker, type] = key.split("-");
        return {
          ticker,
          type: type as "Stock" | "Coin",
          mentions: data.count,
          sentiment: data.sentiment / data.posts,
          avgScore: data.totalScore / data.posts,
          posts: data.posts,
          source: "Reddit",
          rawMentions: this.debugMode ? data.rawMentions : undefined,
        };
      })
      .sort((a, b) => b.mentions - a.mentions)
      .slice(0, 20); // Top 20 most mentioned

    console.log(
      `✅ Reddit: Found ${mentions.length} trending tickers with enhanced sentiment`,
    );

    return {
      mentions,
      debugInfo: this.debugMode ? debugInfo : undefined,
    };
  }

  getDebugInfo() {
    return {
      debugMode: this.debugMode,
      requestDelay: this.requestDelay,
    };
  }

  getSampleValidTickers() {
    return tickerValidation.getSampleTickers();
  }
}

export const redditScanner = new RedditScanner();
