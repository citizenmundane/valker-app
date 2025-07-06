import { QuoteData, PriceProvider } from "./types";
import { settings } from "../../config/settings";

export class YahooProvider implements PriceProvider {
  private requestCount = 0;
  private lastResetTime = Date.now();
  private failedTickers = new Set<string>();
  private retrySuppressionMap = new Map<string, number>();

  private checkRateLimit(): boolean {
    const now = Date.now();
    const minutesSinceReset = (now - this.lastResetTime) / (1000 * 60);

    if (minutesSinceReset >= 1) {
      this.requestCount = 0;
      this.lastResetTime = now;
    }

    return this.requestCount < settings.pricing.yahoo.rateLimit;
  }

  private shouldSuppressRetry(symbol: string): boolean {
    const lastFailTime = this.retrySuppressionMap.get(symbol);
    if (!lastFailTime) return false;

    // Suppress retries for 30 minutes after repeated failures
    const suppressionPeriod = 30 * 60 * 1000; // 30 minutes
    return Date.now() - lastFailTime < suppressionPeriod;
  }

  private markTickerFailed(symbol: string): void {
    this.failedTickers.add(symbol);
    this.retrySuppressionMap.set(symbol, Date.now());
  }

  private async fetchWithTimeout(url: string): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      settings.pricing.requestTimeout,
    );

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  async fetchQuote(symbol: string): Promise<QuoteData | null> {
    const startTime = Date.now();

    try {
      if (!settings.pricing.yahoo.enabled) {
        return null;
      }

      // Check if we should suppress retries for this ticker
      if (this.shouldSuppressRetry(symbol)) {
        console.log(`⏭️ Yahoo: Skipping ${symbol} (retry suppressed)`);
        return null;
      }

      if (!this.checkRateLimit()) {
        console.warn(`⚠️ Yahoo: Rate limit exceeded, skipping ${symbol}`);
        return null;
      }

      this.requestCount++;

      // Use proxy to avoid CORS issues
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=2d`,
      )}`;

      const response = await this.fetchWithTimeout(proxyUrl);

      if (!response.ok) {
        throw new Error(
          `Yahoo proxy error: ${response.status} ${response.statusText}`,
        );
      }

      const proxyData = await response.json();

      if (!proxyData.contents) {
        throw new Error("No data from Yahoo proxy");
      }

      let data;
      try {
        data = JSON.parse(proxyData.contents);
      } catch {
        throw new Error("Invalid JSON response from Yahoo");
      }

      // Gracefully handle missing chart data
      if (!data.chart) {
        console.warn(`⚠️ Yahoo: No chart data for ${symbol}`);
        this.markTickerFailed(symbol);
        return null;
      }

      if (
        !data.chart.result ||
        !Array.isArray(data.chart.result) ||
        data.chart.result.length === 0
      ) {
        console.warn(`⚠️ Yahoo: Invalid chart result for ${symbol}`);
        this.markTickerFailed(symbol);
        return null;
      }

      const result = data.chart.result[0];

      if (!result) {
        console.warn(`⚠️ Yahoo: Empty chart result for ${symbol}`);
        this.markTickerFailed(symbol);
        return null;
      }

      // Check for error in the result
      if (result.error) {
        console.warn(
          `⚠️ Yahoo: API error for ${symbol}: ${result.error.description || "Unknown error"}`,
        );
        this.markTickerFailed(symbol);
        return null;
      }

      const meta = result.meta;
      if (!meta) {
        console.warn(`⚠️ Yahoo: No meta data for ${symbol}`);
        this.markTickerFailed(symbol);
        return null;
      }

      // Safely extract price data with fallbacks
      const currentPrice = meta.regularMarketPrice || meta.previousClose || 0;
      const previousClose = meta.previousClose || currentPrice;

      if (currentPrice === 0) {
        console.warn(`⚠️ Yahoo: No valid price data for ${symbol}`);
        this.markTickerFailed(symbol);
        return null;
      }

      const change = currentPrice - previousClose;

      // Safely extract volume data
      let volume = 0;
      try {
        const quotes = result.indicators?.quote?.[0];
        if (quotes?.volume && Array.isArray(quotes.volume)) {
          const recentVolumes = quotes.volume.filter(
            (v: number) => v != null && v > 0,
          );
          volume = recentVolumes[recentVolumes.length - 1] || 0;
        }
      } catch {
        // Volume extraction failed, but continue with 0 volume
        console.warn(`⚠️ Yahoo: Could not extract volume for ${symbol}`);
      }

      const responseTime = Date.now() - startTime;
      console.log(`✅ Yahoo: ${symbol} fetched in ${responseTime}ms`);

      // Remove from failed tickers on success
      this.failedTickers.delete(symbol);
      this.retrySuppressionMap.delete(symbol);

      return {
        source: "Yahoo",
        symbol: symbol.toUpperCase(),
        price: currentPrice,
        change,
        volume,
        timestamp: new Date(),
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      // Log as warning instead of error to avoid breaking ingestion
      console.warn(
        `⚠️ Yahoo: ${symbol} failed in ${responseTime}ms: ${errorMessage}`,
      );

      // Mark ticker as failed for retry suppression
      this.markTickerFailed(symbol);

      return null;
    }
  }

  async fetchBatchQuotes(symbols: string[]): Promise<QuoteData[]> {
    if (!settings.pricing.yahoo.enabled || symbols.length === 0) {
      return [];
    }

    console.log(`📊 Yahoo: Fetching quotes for ${symbols.length} symbols...`);

    // Filter out symbols that are in retry suppression
    const activeSymbols = symbols.filter(
      (symbol) => !this.shouldSuppressRetry(symbol),
    );

    if (activeSymbols.length < symbols.length) {
      const suppressedCount = symbols.length - activeSymbols.length;
      console.log(
        `⏭️ Yahoo: Skipping ${suppressedCount} symbols (retry suppressed)`,
      );
    }

    // Process symbols with controlled concurrency to avoid overwhelming the API
    const batchSize = 5;
    const results: QuoteData[] = [];

    for (let i = 0; i < activeSymbols.length; i += batchSize) {
      const batch = activeSymbols.slice(i, i + batchSize);

      const batchPromises = batch.map((symbol) => this.fetchQuote(symbol));
      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach((result, index) => {
        if (result.status === "fulfilled" && result.value) {
          results.push(result.value);
        } else if (result.status === "rejected") {
          console.warn(`⚠️ Yahoo: Batch request failed for ${batch[index]}`);
        }
      });

      // Add delay between batches to respect rate limits
      if (i + batchSize < activeSymbols.length) {
        await this.delay(1000);
      }
    }

    const successRate =
      activeSymbols.length > 0
        ? (results.length / activeSymbols.length) * 100
        : 0;
    console.log(
      `✅ Yahoo: Batch complete - ${results.length}/${activeSymbols.length} symbols (${successRate.toFixed(1)}% success rate)`,
    );

    return results;
  }

  // Get list of currently failed tickers
  getFailedTickers(): string[] {
    return Array.from(this.failedTickers);
  }

  // Clear failed ticker cache (useful for manual retry)
  clearFailedTickers(): void {
    this.failedTickers.clear();
    this.retrySuppressionMap.clear();
    console.log("🧹 Yahoo: Cleared failed ticker cache");
  }

  // Get retry suppression status
  getSuppressionStatus(): Array<{
    symbol: string;
    failTime: Date;
    suppressedUntil: Date;
  }> {
    const suppressionPeriod = 30 * 60 * 1000; // 30 minutes
    const now = Date.now();

    return Array.from(this.retrySuppressionMap.entries())
      .filter(([, failTime]) => now - failTime < suppressionPeriod)
      .map(([symbol, failTime]) => ({
        symbol,
        failTime: new Date(failTime),
        suppressedUntil: new Date(failTime + suppressionPeriod),
      }));
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
