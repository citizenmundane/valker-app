import { TrendingData } from "../types/Asset";
import { assetDB } from "../data/database";
import { redditScanner } from "./redditScanner";
import { googleTrendsService } from "./googleTrendsService";
import { twitterSentimentService } from "./twitterSentimentService";

interface DataSource {
  name: string;
  enabled: boolean;
  lastRun: Date | null;
  interval: number; // hours
  priority: number; // 1-5, higher = more important
}

interface SignalData {
  ticker: string;
  type: "Stock" | "Coin";
  memeScore: number;
  politicalScore: number;
  earningsScore: number;
  signalSource: string;
  confidence: number;
  summary: string;
  metadata?: Record<string, any>;
  // New retention fields
  unusualVolume?: boolean;
  isPoliticalTrade?: boolean;
  isEarningsBased?: boolean;
}

class DataIngestionService {
  private dataSources: Map<string, DataSource> = new Map();
  private isRunning: boolean = false;
  private lastFullScan: Date | null = null;

  constructor() {
    this.initializeDataSources();
  }

  private initializeDataSources() {
    const sources: Array<[string, DataSource]> = [
      [
        "coingecko",
        {
          name: "CoinGecko Trending",
          enabled: true,
          lastRun: null,
          interval: 6,
          priority: 4,
        },
      ],
      [
        "reddit",
        {
          name: "Reddit Mentions",
          enabled: true,
          lastRun: null,
          interval: 8,
          priority: 5,
        },
      ],
      [
        "twitter",
        {
          name: "Twitter/X Trending",
          enabled: true,
          lastRun: null,
          interval: 12,
          priority: 3,
        },
      ],
      [
        "stocktwits",
        {
          name: "StockTwits Trending",
          enabled: true,
          lastRun: null,
          interval: 12,
          priority: 3,
        },
      ],
      [
        "finviz",
        {
          name: "Finviz Unusual Volume",
          enabled: true,
          lastRun: null,
          interval: 24,
          priority: 4,
        },
      ],
      [
        "quiverquant",
        {
          name: "US Congress Trades",
          enabled: true,
          lastRun: null,
          interval: 24,
          priority: 5,
        },
      ],
      [
        "canadian_mp",
        {
          name: "Canadian MP Trades",
          enabled: true,
          lastRun: null,
          interval: 24,
          priority: 4,
        },
      ],
      [
        "fmp_earnings",
        {
          name: "FMP Earnings Calendar",
          enabled: true,
          lastRun: null,
          interval: 24,
          priority: 3,
        },
      ],
      [
        "github",
        {
          name: "GitHub Trending",
          enabled: true,
          lastRun: null,
          interval: 24,
          priority: 2,
        },
      ],
    ];

    sources.forEach(([key, source]) => {
      this.dataSources.set(key, source);
    });
  }

  // Enhanced signal quality filtering with retention criteria
  private meetsQualityThreshold(signal: SignalData): boolean {
    let signalTypes = 0;

    // Count signal types
    if (signal.memeScore >= 2) signalTypes++;
    if (signal.politicalScore >= 1) signalTypes++;
    if (signal.earningsScore >= 1) signalTypes++;

    // Must have at least 2 of 3 signal types OR meet retention criteria
    if (signalTypes < 2) {
      // Check retention criteria for single-signal assets
      if (signal.memeScore >= 2) return true; // Criteria 1
      if (signal.unusualVolume === true) return true; // Criteria 3
      if (signal.isPoliticalTrade === true || signal.isEarningsBased === true)
        return true; // Criteria 4

      // Exception: Very high confidence single signals
      if (signal.confidence < 85) return false;
    }

    // Reddit-specific filtering with enhanced validation
    if (signal.signalSource === "Reddit") {
      const mentions = signal.metadata?.mentions || 0;

      // Apply different thresholds based on asset type
      const minMentions = signal.type === "Stock" ? 10 : 5;
      if (mentions < minMentions) return false;

      // Reject if only meme score and it's low
      if (
        signal.memeScore < 2 &&
        signal.politicalScore === 0 &&
        signal.earningsScore === 0
      ) {
        return false;
      }
    }

    // General confidence threshold
    if (signal.confidence < 60) return false;

    return true;
  }

  // Enhanced summary generation
  private generateEnhancedSummary(signal: SignalData): string {
    const sources = [];
    const metrics = [];

    // Identify signal sources
    if (signal.signalSource === "Reddit" && signal.metadata?.mentions) {
      sources.push("Reddit");
      metrics.push(`${signal.metadata.mentions} mentions`);
      if (signal.metadata.sentiment > 0.7) {
        metrics.push("high sentiment");
      }
    }

    if (signal.signalSource === "Finviz" && signal.metadata?.volumeRatio) {
      sources.push("Finviz");
      metrics.push(`${signal.metadata.volumeRatio.toFixed(1)}x volume`);
      signal.unusualVolume = signal.metadata.volumeRatio > 2.0; // Set unusual volume flag
    }

    if (signal.signalSource === "QuiverQuant") {
      sources.push("Congress Trades");
      metrics.push("insider activity");
      signal.isPoliticalTrade = true; // Set political trade flag
    }

    if (signal.signalSource === "Canadian_MP") {
      sources.push("Canadian MP Trades");
      metrics.push("political activity");
      signal.isPoliticalTrade = true; // Set political trade flag
    }

    if (signal.signalSource === "FMP_Earnings") {
      sources.push("Earnings");
      metrics.push("upcoming report");
      signal.isEarningsBased = true; // Set earnings-based flag
    }

    if (signal.signalSource === "StockTwits") {
      sources.push("StockTwits");
      metrics.push("trending");
    }

    if (signal.signalSource === "CoinGecko") {
      sources.push("CoinGecko");
      if (signal.metadata?.priceChange24h) {
        metrics.push(
          `${signal.metadata.priceChange24h > 0 ? "+" : ""}${signal.metadata.priceChange24h.toFixed(1)}% (24h)`,
        );
      }
    }

    // Build enhanced summary
    let summary = `Trending on ${sources.join(" + ")}`;
    if (metrics.length > 0) {
      summary += ` with ${metrics.join(" and ")}`;
    }

    return summary;
  }

  // CoinGecko Trending Coins
  private async scanCoinGeckoTrending(): Promise<SignalData[]> {
    console.log("🚀 Scanning CoinGecko trending coins...");

    try {
      const response = await fetch(
        "https://api.coingecko.com/api/v3/search/trending",
      );
      const data = await response.json();

      if (!data.coins) return [];

      const signals: SignalData[] = [];

      for (const coin of data.coins.slice(0, 10)) {
        const coinData = coin.item;

        // Get additional market data with retry logic
        await this.delay(1000);

        try {
          const marketResponse = await fetch(
            `https://api.coingecko.com/api/v3/coins/${coinData.id}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false`,
          );

          const marketData = await marketResponse.json();

          const priceChange24h =
            marketData.market_data?.price_change_percentage_24h || 0;
          const marketCapRank = marketData.market_cap_rank || 999;

          const memeScore = this.calculateCryptoMemeScore({
            rank: coinData.market_cap_rank,
            priceChange24h,
            marketCapRank,
          });

          const signal: SignalData = {
            ticker: coinData.symbol.toUpperCase(),
            type: "Coin",
            memeScore,
            politicalScore: 0,
            earningsScore: 0,
            signalSource: "CoinGecko",
            confidence: Math.min(95, 60 + memeScore * 10),
            summary: "",
            metadata: {
              coinId: coinData.id,
              marketCapRank,
              priceChange24h,
            },
          };

          signal.summary = this.generateEnhancedSummary(signal);

          if (this.meetsQualityThreshold(signal)) {
            signals.push(signal);
          }
        } catch (marketDataError) {
          console.warn(
            `⚠️ Failed to fetch market data for ${coinData.symbol}, skipping`,
          );
        }
      }

      console.log(
        `✅ CoinGecko: Found ${signals.length} high-quality trending coins`,
      );
      return signals;
    } catch (error) {
      console.error("❌ CoinGecko scan failed:", error);
      return [];
    }
  }

  // Enhanced Reddit Mentions with proper ticker validation
  private async scanRedditMentions(): Promise<SignalData[]> {
    console.log("🔥 Scanning Reddit with enhanced ticker validation...");

    try {
      const scanResult = await redditScanner.scanRedditMentions();
      const signals: SignalData[] = [];

      scanResult.mentions.forEach((mention) => {
        const memeScore = this.calculateRedditMemeScore({
          mentions: mention.mentions,
          avgScore: mention.avgScore,
          sentiment: mention.sentiment,
        });

        const signal: SignalData = {
          ticker: mention.ticker,
          type: mention.type,
          memeScore,
          politicalScore: 0,
          earningsScore: 0,
          signalSource: "Reddit",
          confidence: Math.min(
            95,
            mention.mentions / 10 + mention.sentiment * 30,
          ),
          summary: "",
          metadata: {
            mentions: mention.mentions,
            avgScore: mention.avgScore,
            sentiment: mention.sentiment,
            posts: mention.posts,
            rawMentions: mention.rawMentions,
          },
        };

        signal.summary = this.generateEnhancedSummary(signal);

        if (this.meetsQualityThreshold(signal)) {
          signals.push(signal);
        }
      });

      console.log(
        `✅ Reddit: Found ${signals.length} high-quality validated tickers`,
      );

      // Log debug info if available
      if (scanResult.debugInfo) {
        console.log(
          `🔍 Reddit Debug: ${scanResult.debugInfo.rawExtractions.length} raw extractions, ${scanResult.debugInfo.filteredOut.length} filtered out`,
        );
      }

      return signals;
    } catch (error) {
      console.error("❌ Reddit scan failed:", error);
      return [];
    }
  }

  // Finviz Unusual Volume - Disabled due to API requirements
  private async scanFinvizUnusualVolume(): Promise<SignalData[]> {
    console.log(
      "📈 Finviz unusual volume scanning disabled - requires API access",
    );
    console.log(
      "💡 To enable: Add Finviz API credentials or web scraping setup",
    );

    // Return empty array instead of mock data
    return [];
  }

  // QuiverQuant Congress Trades - Disabled due to API requirements
  private async scanCongressTrades(): Promise<SignalData[]> {
    console.log(
      "🏛️ Congress trades scanning disabled - requires QuiverQuant API access",
    );
    console.log("💡 To enable: Add QuiverQuant API credentials");

    // Return empty array instead of mock data
    return [];
  }

  // FMP Earnings Calendar - Disabled due to API requirements
  private async scanEarningsCalendar(): Promise<SignalData[]> {
    console.log(
      "📅 Earnings calendar scanning disabled - requires FMP API access",
    );
    console.log(
      "💡 To enable: Add FMP API credentials to environment variables",
    );

    // Return empty array instead of mock data
    return [];
  }

  // Google Trends
  private async scanGoogleTrends(): Promise<SignalData[]> {
    console.log("📈 Scanning Google Trends...");

    try {
      const [stockTrends, cryptoTrends] = await Promise.all([
        googleTrendsService.getTrendingStocks(),
        googleTrendsService.getTrendingCrypto(),
      ]);

      const allTrends = [...stockTrends, ...cryptoTrends];
      const signals: SignalData[] = [];

      for (const trend of allTrends) {
        const trendScore = this.calculateTrendScore(trend.trendScore);

        const signal: SignalData = {
          ticker: trend.ticker,
          type: this.determineAssetType(trend.ticker),
          memeScore: Math.min(4, Math.floor(trend.trendScore / 25)), // Convert to 0-4 scale
          politicalScore: 0, // Trends don't indicate political activity
          earningsScore: 0, // Trends don't indicate earnings
          signalSource: "Google Trends",
          confidence: Math.min(95, 40 + trend.trendScore / 2),
          summary: `Trending on Google: ${trend.trendScore.toFixed(0)}% interest over time`,
          metadata: {
            trendScore: trend.trendScore,
            interestOverTime: trend.interestOverTime,
          },
        };

        if (this.meetsQualityThreshold(signal)) {
          signals.push(signal);
        }
      }

      console.log(`✅ Google Trends: Generated ${signals.length} signals`);
      return signals;
    } catch (error) {
      console.error("❌ Google Trends scan failed:", error);
      return [];
    }
  }

  private calculateTrendScore(trendScore: number): number {
    // Convert Google Trends score (0-100) to our scoring system
    if (trendScore >= 80) return 4;
    if (trendScore >= 60) return 3;
    if (trendScore >= 40) return 2;
    if (trendScore >= 20) return 1;
    return 0;
  }

  // Main orchestration method with cleanup integration
  async runDataIngestion(forceAll: boolean = false): Promise<{
    added: number;
    skipped: number;
    autoRejected: number;
    sources: string[];
  }> {
    if (this.isRunning && !forceAll) {
      console.log("⏳ Data ingestion already running...");
      return { added: 0, skipped: 0, autoRejected: 0, sources: [] };
    }

    this.isRunning = true;
    console.log(
      "🤖 Starting comprehensive data ingestion with enhanced Reddit validation...",
    );

    // Run cleanup before ingestion
    const cleanupResults = assetDB.runOnWatchAssetCleanup();
    if (cleanupResults.deletedAssets > 0 || cleanupResults.deletedPending > 0) {
      console.log(
        `🧹 Pre-ingestion cleanup: ${cleanupResults.deletedAssets + cleanupResults.deletedPending} On Watch assets removed`,
      );
    }

    const allSignals: SignalData[] = [];
    const sourcesRun: string[] = [];

    try {
      // Run each data source based on schedule or force
      const scanPromises: Promise<SignalData[]>[] = [];

      for (const [sourceKey, source] of this.dataSources.entries()) {
        if (!source.enabled) continue;

        const shouldRun = forceAll || this.shouldRunSource(source);
        if (!shouldRun) continue;

        console.log(`🔄 Running ${source.name}...`);
        sourcesRun.push(source.name);

        let scanPromise: Promise<SignalData[]>;

        switch (sourceKey) {
          case "coingecko":
            scanPromise = this.scanCoinGeckoTrending();
            break;
          case "reddit":
            scanPromise = this.scanRedditMentions();
            break;
          case "finviz":
            scanPromise = this.scanFinvizUnusualVolume();
            break;
          case "quiverquant":
            scanPromise = this.scanCongressTrades();
            break;
          case "fmp_earnings":
            scanPromise = this.scanEarningsCalendar();
            break;
          case "google":
            scanPromise = this.scanGoogleTrends();
            break;
          default:
            continue;
        }

        scanPromises.push(scanPromise);
        source.lastRun = new Date();
      }

      // Execute all scans in parallel with some delay between them
      const results = await Promise.allSettled(scanPromises);

      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          allSignals.push(...result.value);
        } else {
          console.error(
            `❌ Source ${sourcesRun[index]} failed:`,
            result.reason,
          );
        }
      });

      // Process and deduplicate signals
      const processedSignals = this.deduplicateSignals(allSignals);
      const results_summary = this.saveSignalsToPending(processedSignals);

      this.lastFullScan = new Date();

      console.log(
        `✅ Data ingestion complete: ${results_summary.added} high-quality signals, ${results_summary.skipped} duplicates/low-quality, ${results_summary.autoRejected} auto-rejected`,
      );
      console.log(`📊 Sources run: ${sourcesRun.join(", ")}`);

      return {
        added: results_summary.added,
        skipped: results_summary.skipped,
        autoRejected: results_summary.autoRejected,
        sources: sourcesRun,
      };
    } catch (error) {
      console.error("❌ Data ingestion failed:", error);
      return { added: 0, skipped: 0, autoRejected: 0, sources: sourcesRun };
    } finally {
      this.isRunning = false;
    }
  }

  // Enhanced signal saving with auto-rejection tracking
  private saveSignalsToPending(signals: SignalData[]): {
    added: number;
    skipped: number;
    autoRejected: number;
  } {
    let added = 0;
    let skipped = 0;
    let autoRejected = 0;

    signals.forEach((signal) => {
      try {
        const trendingData: TrendingData = {
          ticker: signal.ticker,
          type: signal.type,
          memeScore: signal.memeScore,
          sources: [signal.signalSource],
          confidence: signal.confidence,
          summary: signal.summary,
          unusualVolume: signal.unusualVolume,
          isPoliticalTrade: signal.isPoliticalTrade,
          isEarningsBased: signal.isEarningsBased,
        };

        assetDB.addPendingAsset(trendingData);
        added++;
      } catch (error) {
        if (error instanceof Error && error.message.includes("auto-rejected")) {
          autoRejected++;
        } else {
          // Asset already exists
          skipped++;
        }
      }
    });

    return { added, skipped, autoRejected };
  }

  // Helper methods (keeping existing implementations)
  private shouldRunSource(source: DataSource): boolean {
    if (!source.lastRun) return true;
    const hoursSinceLastRun =
      (Date.now() - source.lastRun.getTime()) / (1000 * 60 * 60);
    return hoursSinceLastRun >= source.interval;
  }

  private deduplicateSignals(signals: SignalData[]): SignalData[] {
    const seen = new Set<string>();
    const deduplicated: SignalData[] = [];

    // Sort by confidence to keep highest quality signals
    signals.sort((a, b) => b.confidence - a.confidence);

    signals.forEach((signal) => {
      const key = `${signal.ticker}-${signal.signalSource}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(signal);
      }
    });

    return deduplicated;
  }

  // Scoring algorithms (keeping existing implementations)
  private calculateCryptoMemeScore(data: {
    rank: number;
    priceChange24h: number;
    marketCapRank: number;
  }): number {
    let score = 0;

    if (data.rank <= 3) score += 3;
    else if (data.rank <= 7) score += 2;
    else score += 1;

    if (Math.abs(data.priceChange24h) > 20) score += 1;
    if (data.marketCapRank > 100) score += 1;

    return Math.min(4, score);
  }

  private calculateRedditMemeScore(data: {
    mentions: number;
    avgScore: number;
    sentiment: number;
  }): number {
    let score = 0;

    // Adjusted thresholds for new validation system
    if (data.mentions > 100) score += 3;
    else if (data.mentions > 50) score += 2;
    else if (data.mentions > 10) score += 1;

    if (data.sentiment > 0.75) score += 1;
    if (data.avgScore > 100) score += 1;

    return Math.min(4, score);
  }

  private calculateVolumeMemeScore(
    volumeRatio: number,
    priceChange: number,
  ): number {
    let score = 0;

    if (volumeRatio > 3) score += 2;
    else if (volumeRatio > 2) score += 1;

    if (priceChange > 5) score += 1;
    if (volumeRatio > 5) score += 1;

    return Math.min(4, score);
  }

  private calculateEarningsScore(surpriseHistory: number): number {
    if (surpriseHistory > 0.1) return 2;
    if (surpriseHistory > 0.05) return 1;
    return 0;
  }

  // Utility methods (keeping existing implementations)
  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Public API methods (keeping existing implementations)
  getDataSourceStatus(): Array<{
    name: string;
    enabled: boolean;
    lastRun: Date | null;
    nextRun: Date | null;
  }> {
    return Array.from(this.dataSources.entries()).map(([key, source]) => ({
      name: source.name,
      enabled: source.enabled,
      lastRun: source.lastRun,
      nextRun: source.lastRun
        ? new Date(source.lastRun.getTime() + source.interval * 60 * 60 * 1000)
        : null,
    }));
  }

  toggleDataSource(sourceName: string, enabled: boolean): boolean {
    for (const [key, source] of this.dataSources.entries()) {
      if (source.name === sourceName) {
        source.enabled = enabled;
        return true;
      }
    }
    return false;
  }

  async forceRunSource(sourceName: string): Promise<SignalData[]> {
    for (const [key, source] of this.dataSources.entries()) {
      if (source.name === sourceName) {
        console.log(`🔄 Force running ${sourceName}...`);

        let signals: SignalData[] = [];

        switch (key) {
          case "coingecko":
            signals = await this.scanCoinGeckoTrending();
            break;
          case "reddit":
            signals = await this.scanRedditMentions();
            break;
          case "finviz":
            signals = await this.scanFinvizUnusualVolume();
            break;
          case "quiverquant":
            signals = await this.scanCongressTrades();
            break;
          case "fmp_earnings":
            signals = await this.scanEarningsCalendar();
            break;
          case "google":
            signals = await this.scanGoogleTrends();
            break;
        }

        source.lastRun = new Date();
        return signals;
      }
    }

    throw new Error(`Data source ${sourceName} not found`);
  }

  isCurrentlyRunning(): boolean {
    return this.isRunning;
  }

  getLastFullScan(): Date | null {
    return this.lastFullScan;
  }

  // New methods for Reddit scanner control
  setRedditDebugMode(enabled: boolean): void {
    redditScanner.setDebugMode(enabled);
  }

  getRedditDebugInfo() {
    return redditScanner.getDebugInfo();
  }

  getRedditSampleTickers() {
    return redditScanner.getSampleValidTickers();
  }

  private determineAssetType(ticker: string): "Stock" | "Coin" {
    // Implement the logic to determine the asset type based on the ticker
    // This is a placeholder and should be replaced with the actual implementation
    return "Stock"; // Placeholder return, actual implementation needed
  }

  private async scanTwitterMentions(): Promise<SignalData[]> {
    console.log("🐦 Scanning Twitter mentions...");

    try {
      const mentions = await twitterSentimentService.scanTwitterMentions();
      const signals: SignalData[] = [];

      for (const mention of mentions) {
        const memeScore = this.calculateTwitterMemeScore({
          mentions: mention.mentions,
          sentiment: mention.sentiment,
          avgScore: mention.avgScore,
        });

        const signal: SignalData = {
          ticker: mention.ticker,
          type: mention.type,
          memeScore,
          politicalScore: 0,
          earningsScore: 0,
          signalSource: "Twitter",
          confidence: Math.min(
            95,
            40 + mention.mentions * 5 + mention.sentiment * 30,
          ),
          summary: `🐦 Trending on Twitter: ${mention.mentions} mentions with ${(mention.sentiment * 100).toFixed(0)}% positive sentiment`,
          metadata: {
            mentions: mention.mentions,
            sentiment: mention.sentiment,
            avgScore: mention.avgScore,
          },
        };

        if (this.meetsQualityThreshold(signal)) {
          signals.push(signal);
        }
      }

      console.log(`✅ Twitter: Generated ${signals.length} signals`);
      return signals;
    } catch (error) {
      console.error("❌ Twitter scan failed:", error);
      return [];
    }
  }

  private calculateTwitterMemeScore(data: {
    mentions: number;
    sentiment: number;
    avgScore: number;
  }): number {
    let score = 0;

    // Mentions weight
    if (data.mentions >= 10) score += 4;
    else if (data.mentions >= 5) score += 3;
    else if (data.mentions >= 3) score += 2;
    else if (data.mentions >= 2) score += 1;

    // Sentiment weight
    if (data.sentiment >= 0.8) score += 1;
    else if (data.sentiment >= 0.6) score += 0.5;

    // Engagement weight
    if (data.avgScore >= 1000) score += 1;
    else if (data.avgScore >= 500) score += 0.5;

    return Math.min(4, score);
  }

  async scanAllSources(): Promise<SignalData[]> {
    console.log(
      "🔍 Starting comprehensive market scan with enhanced sentiment...",
    );

    const [redditData, cryptoData, stockData, trendsData, twitterData] =
      await Promise.all([
        this.scanRedditMentions().catch((err) => {
          console.error("Reddit scan failed:", err);
          return [];
        }),
        this.scanCoinGeckoTrending().catch((err) => {
          console.error("CoinGecko scan failed:", err);
          return [];
        }),
        this.scanFMPStockData(this.getPopularStockTickers()).catch((err) => {
          console.error("FMP stock scan failed:", err);
          return [];
        }),
        this.scanGoogleTrends().catch((err) => {
          console.error("Google Trends scan failed:", err);
          return [];
        }),
        this.scanTwitterMentions().catch((err) => {
          console.error("Twitter scan failed:", err);
          return [];
        }),
      ]);

    // Combine all signals
    const allSignals = [
      ...redditData,
      ...cryptoData,
      ...stockData,
      ...trendsData,
      ...twitterData,
    ];

    // Process and deduplicate
    return this.processAndDeduplicateSignals(allSignals);
  }
}

export const dataIngestionService = new DataIngestionService();
