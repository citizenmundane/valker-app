interface TrendData {
  ticker: string;
  trendScore: number; // 0-100
  interestOverTime: number;
  relatedQueries: string[];
  source: "Google Trends";
  // Enhanced fields
  spikeDetected?: boolean;
  spikeIntensity?: number;
  momentum?: number;
  volatility?: number;
  trendDirection?: "rising" | "falling" | "stable";
  seasonalAdjusted?: number;
}

interface GoogleTrendsTimelineData {
  value: number[];
}

interface GoogleTrendsResponse {
  timelineData: GoogleTrendsTimelineData[];
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
      const trendsData = JSON.parse(data.contents.replace(")]}'", "")) as GoogleTrendsResponse;

      if (!trendsData.timelineData || trendsData.timelineData.length === 0) {
        return null;
      }

      // Calculate trend score based on recent interest
      const recentData = trendsData.timelineData.slice(-7); // Last 7 days
      const avgInterest =
        recentData.reduce(
          (sum: number, day: GoogleTrendsTimelineData) => sum + (day.value[0] || 0),
          0,
        ) / recentData.length;

      // Calculate trend direction (comparing recent vs older data)
      const olderData = trendsData.timelineData.slice(-14, -7);
      const olderAvg =
        olderData.reduce(
          (sum: number, day: GoogleTrendsTimelineData) => sum + (day.value[0] || 0),
          0,
        ) / olderData.length;

      const trendDirection = avgInterest > olderAvg ? 1.2 : 0.8;

      // Enhanced analysis
      const allValues = trendsData.timelineData.map(d => d.value[0] || 0);
      const spikeAnalysis = this.detectSpike(allValues);
      const momentum = this.calculateMomentum(allValues);
      const volatility = this.calculateVolatility(allValues);
      const direction = this.getTrendDirection(avgInterest, olderAvg);
      const seasonalAdjusted = this.calculateSeasonalAdjustment(allValues, avgInterest);

      return {
        ticker: query.toUpperCase(),
        trendScore: Math.min(100, avgInterest * trendDirection),
        interestOverTime: avgInterest,
        relatedQueries: [],
        source: "Google Trends",
        spikeDetected: spikeAnalysis.detected,
        spikeIntensity: spikeAnalysis.intensity,
        momentum,
        volatility,
        trendDirection: direction,
        seasonalAdjusted
      };
    } catch (error) {
      console.warn(`⚠️ Failed to fetch trend data for ${query}:`, error);
      return null;
    }
  }

  private detectSpike(values: number[]): { detected: boolean; intensity: number } {
    if (values.length < 7) return { detected: false, intensity: 0 };

    const recent = values.slice(-3); // Last 3 data points
    const baseline = values.slice(0, -3); // Everything before recent
    
    if (baseline.length === 0) return { detected: false, intensity: 0 };

    const recentAvg = recent.reduce((sum, v) => sum + v, 0) / recent.length;
    const baselineAvg = baseline.reduce((sum, v) => sum + v, 0) / baseline.length;
    const baselineStd = this.calculateStandardDeviation(baseline);

    // Spike detected if recent average is significantly above baseline
    const threshold = baselineAvg + (2 * baselineStd); // 2 standard deviations
    const isSpike = recentAvg > threshold && recentAvg > baselineAvg * 1.5;
    
    // Calculate spike intensity (how far above normal)
    const intensity = baselineAvg > 0 ? ((recentAvg - baselineAvg) / baselineAvg) * 100 : 0;

    return {
      detected: isSpike,
      intensity: Math.max(0, intensity)
    };
  }

  private calculateMomentum(values: number[]): number {
    if (values.length < 4) return 0;

    // Calculate rate of change acceleration
    const recent4 = values.slice(-4);
    const changes = recent4.slice(1).map((val, i) => val - recent4[i]);
    
    if (changes.length < 2) return 0;

    // Acceleration = change in rate of change
    const acceleration = changes.slice(1).map((change, i) => change - changes[i]);
    const avgAcceleration = acceleration.reduce((sum, acc) => sum + acc, 0) / acceleration.length;

    // Normalize to 0-100 scale
    return Math.max(0, Math.min(100, 50 + (avgAcceleration * 10)));
  }

  private calculateVolatility(values: number[]): number {
    if (values.length < 2) return 0;

    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const volatility = Math.sqrt(variance);

    // Normalize relative to mean
    return mean > 0 ? (volatility / mean) * 100 : 0;
  }

  private getTrendDirection(recent: number, older: number): "rising" | "falling" | "stable" {
    const change = recent - older;
    const threshold = Math.max(1, older * 0.1); // 10% change threshold
    
    if (change > threshold) return "rising";
    if (change < -threshold) return "falling";
    return "stable";
  }

  private calculateSeasonalAdjustment(values: number[], current: number): number {
    // Simple seasonal adjustment based on day-of-week patterns
    // In production, you'd use more sophisticated seasonal decomposition
    
    if (values.length < 7) return current;

    // Calculate average for each position (representing days)
    const dayAverages = new Array(7).fill(0);
    const dayCounts = new Array(7).fill(0);

    values.forEach((value, index) => {
      const dayIndex = index % 7;
      dayAverages[dayIndex] += value;
      dayCounts[dayIndex]++;
    });

    // Calculate actual day averages
    dayAverages.forEach((sum, i) => {
      if (dayCounts[i] > 0) {
        dayAverages[i] = sum / dayCounts[i];
      }
    });

    const overallAvg = values.reduce((sum, v) => sum + v, 0) / values.length;
    const currentDayIndex = (values.length - 1) % 7;
    const currentDayAvg = dayAverages[currentDayIndex];
    
    // Seasonal factor
    const seasonalFactor = overallAvg > 0 ? currentDayAvg / overallAvg : 1;
    
    // Adjust current value by removing seasonal component
    return seasonalFactor > 0 ? current / seasonalFactor : current;
  }

  private calculateStandardDeviation(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  // New method to get trending tickers with spike detection
  async getSpikingTickers(): Promise<TrendData[]> {
    console.log("📈 Scanning for spiking Google Trends...");

    const stockTrends = await this.getTrendingStocks();
    const cryptoTrends = await this.getTrendingCrypto();
    
    const allTrends = [...stockTrends, ...cryptoTrends];
    
    // Filter for spikes and high momentum
    const spikingTrends = allTrends.filter(trend => 
      trend.spikeDetected || 
      (trend.momentum && trend.momentum > 70) ||
      (trend.spikeIntensity && trend.spikeIntensity > 50)
    );

    // Sort by spike intensity and momentum
    spikingTrends.sort((a, b) => {
      const scoreA = (a.spikeIntensity || 0) + (a.momentum || 0);
      const scoreB = (b.spikeIntensity || 0) + (b.momentum || 0);
      return scoreB - scoreA;
    });

    console.log(`✅ Found ${spikingTrends.length} spiking trends from ${allTrends.length} total`);
    return spikingTrends.slice(0, 10); // Top 10 spikes
  }

  // Method to detect breakout patterns
  async getBreakoutSignals(): Promise<TrendData[]> {
    console.log("📈 Detecting Google Trends breakouts...");

    const allTrends = await this.getSpikingTickers();
    
    // Look for specific breakout patterns
    const breakouts = allTrends.filter(trend => {
      const hasSpike = trend.spikeDetected;
      const hasVolatility = trend.volatility && trend.volatility > 30;
      const hasRisingTrend = trend.trendDirection === "rising";
      const hasMomentum = trend.momentum && trend.momentum > 60;
      
      // Breakout = spike + volatility + rising trend
      return hasSpike && hasVolatility && hasRisingTrend && hasMomentum;
    });

    console.log(`✅ Found ${breakouts.length} breakout patterns`);
    return breakouts;
  }

  getFailedTickers(): string[] {
    return Array.from(this.failedTickers);
  }

  clearFailedTickers(): void {
    this.failedTickers.clear();
  }
}

export const googleTrendsService = new GoogleTrendsService();
