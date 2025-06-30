interface TrendData {
  ticker: string;
  trendScore: number; // 0-100
  interestOverTime: number;
  relatedQueries: string[];
  source: "Google Trends";
}

export class GoogleTrendsService {
  private requestDelay = 2000; // 2 seconds between requests
  private failedTickers = new Set<string>();

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async getTrendingStocks(): Promise<TrendData[]> {
    console.log("📈 Fetching Google Trends for popular stocks...");

    const popularStocks = [
      "GME",
      "AMC",
      "TSLA",
      "NVDA",
      "AAPL",
      "MSFT",
      "GOOGL",
      "AMZN",
      "META",
      "SPY",
      "QQQ",
      "PLTR",
      "RIVN",
      "LCID",
      "NIO",
      "XPEV",
      "F",
      "NFLX",
    ];

    const results: TrendData[] = [];

    for (const ticker of popularStocks) {
      try {
        await this.delay(this.requestDelay);
        const trendData = await this.fetchTrendData(ticker);
        if (trendData && trendData.trendScore > 20) {
          // Only include if significant interest
          results.push(trendData);
        }
      } catch (error) {
        console.warn(`⚠️ Google Trends failed for ${ticker}:`, error);
        this.failedTickers.add(ticker);
      }
    }

    console.log(`✅ Google Trends: Found ${results.length} trending stocks`);
    return results;
  }

  async getTrendingCrypto(): Promise<TrendData[]> {
    console.log("🚀 Fetching Google Trends for popular crypto...");

    const popularCrypto = [
      "Bitcoin",
      "Ethereum",
      "Dogecoin",
      "Shiba Inu",
      "Cardano",
      "Solana",
      "Polkadot",
      "Chainlink",
      "Litecoin",
      "Bitcoin Cash",
      "Ethereum Classic",
    ];

    const results: TrendData[] = [];

    for (const coin of popularCrypto) {
      try {
        await this.delay(this.requestDelay);
        const trendData = await this.fetchTrendData(coin);
        if (trendData && trendData.trendScore > 20) {
          results.push(trendData);
        }
      } catch (error) {
        console.warn(`⚠️ Google Trends failed for ${coin}:`, error);
        this.failedTickers.add(coin);
      }
    }

    console.log(`✅ Google Trends: Found ${results.length} trending crypto`);
    return results;
  }

  private async fetchTrendData(query: string): Promise<TrendData | null> {
    try {
      // Use a proxy service to avoid CORS issues
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(
        `https://trends.google.com/trends/api/widgetdata/multiline?hl=en-US&tz=-240&req={"time":"2024-01-01 2024-12-31","keyword":"${query}","cat":"0","geo":"","gprop":"","timezone":"America/New_York"}`,
      )}`;

      const response = await fetch(proxyUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!data.contents) {
        return null;
      }

      // Parse the Google Trends response
      const trendsData = JSON.parse(data.contents.replace(")]}'", ""));

      if (!trendsData.timelineData || trendsData.timelineData.length === 0) {
        return null;
      }

      // Calculate trend score based on recent interest
      const recentData = trendsData.timelineData.slice(-7); // Last 7 days
      const avgInterest =
        recentData.reduce(
          (sum: number, day: any) => sum + (day.value[0] || 0),
          0,
        ) / recentData.length;

      // Calculate trend direction (comparing recent vs older data)
      const olderData = trendsData.timelineData.slice(-14, -7);
      const olderAvg =
        olderData.reduce(
          (sum: number, day: any) => sum + (day.value[0] || 0),
          0,
        ) / olderData.length;

      const trendDirection = avgInterest > olderAvg ? 1.2 : 0.8;

      return {
        ticker: query.toUpperCase(),
        trendScore: Math.min(100, avgInterest * trendDirection),
        interestOverTime: avgInterest,
        relatedQueries: [],
        source: "Google Trends",
      };
    } catch (error) {
      console.warn(`⚠️ Failed to fetch trend data for ${query}:`, error);
      return null;
    }
  }

  getFailedTickers(): string[] {
    return Array.from(this.failedTickers);
  }

  clearFailedTickers(): void {
    this.failedTickers.clear();
  }
}

export const googleTrendsService = new GoogleTrendsService();
