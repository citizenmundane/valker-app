import { QuoteData, PriceProvider } from "./types";
import { FMPProvider } from "./fmpProvider";
import { TwelveDataProvider } from "./twelveDataProvider";
import { YahooProvider } from "./yahooProvider";
import { GoogleFinanceProvider } from "./googleFinanceProvider";
import { settings } from "../../config/settings";

export class PriceAggregator {
  private providers: PriceProvider[] = [];
  private enabledProviders: Set<string> = new Set();
  private yahooProvider?: YahooProvider;

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders() {
    // Only initialize providers if they have valid API keys or don't require them
    if (settings.pricing.fmp.apiKey && settings.pricing.fmp.apiKey !== "demo") {
      this.providers.push(new FMPProvider());
      this.enabledProviders.add("FMP");
    }

    if (
      settings.pricing.twelveData.apiKey &&
      settings.pricing.twelveData.apiKey !== "demo"
    ) {
      this.providers.push(new TwelveDataProvider());
      this.enabledProviders.add("TwelveData");
    }

    // Yahoo doesn't require API key, always available as fallback
    this.yahooProvider = new YahooProvider();
    this.providers.push(this.yahooProvider);
    this.enabledProviders.add("Yahoo");

    // Add Google Finance as additional fallback
    this.providers.push(new GoogleFinanceProvider());
    this.enabledProviders.add("Google Finance");

    console.log(
      `💰 Initialized price providers: ${Array.from(this.enabledProviders).join(", ")}`,
    );

    if (this.enabledProviders.size <= 2) {
      console.log(
        "⚠️ Limited price providers available. Add valid API keys for FMP and Twelve Data for better coverage.",
      );
    }
  }

  async fetchQuoteWithFallback(symbol: string): Promise<QuoteData | null> {
    const errors: string[] = [];

    for (const provider of this.providers) {
      try {
        const quote = await provider.fetchQuote(symbol);

        if (quote) {
          console.log(`✅ ${quote.source}: ${symbol} fetched successfully`);
          return quote;
        }
      } catch {
        console.warn(`⚠️ ${provider.constructor.name}: ${symbol} failed`);
        errors.push(`${provider.constructor.name}: Failed to fetch`);
      }
    }

    if (errors.length > 0) {
      console.warn(
        `⚠️ All providers failed for ${symbol}. Consider adding valid API keys for better reliability.`,
      );
    }

    return null;
  }

  async fetchBatchQuotes(symbols: string[]): Promise<QuoteData[]> {
    console.log(
      `📊 Fetching quotes for ${symbols.length} symbols using available providers...`,
    );

    if (this.providers.length === 0) {
      console.error("❌ No price providers available");
      return [];
    }

    // Process in smaller batches to avoid overwhelming APIs
    const batchSize = 10;
    const results: QuoteData[] = [];

    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);

      const batchPromises = batch.map((symbol) =>
        this.fetchQuoteWithFallback(symbol),
      );

      const batchResults = await Promise.all(batchPromises);

      batchResults.forEach((result) => {
        if (result) {
          results.push(result);
        }
      });

      // Add delay between batches to respect rate limits
      if (i + batchSize < symbols.length) {
        await this.delay(1000);
      }
    }

    const successRate = (results.length / symbols.length) * 100;
    console.log(
      `✅ Price fetch complete: ${results.length}/${symbols.length} symbols (${successRate.toFixed(1)}% success rate)`,
    );

    // Log Yahoo provider status if available
    if (this.yahooProvider) {
      const failedTickers = this.yahooProvider.getFailedTickers();
      const suppressedTickers = this.yahooProvider.getSuppressionStatus();

      if (failedTickers.length > 0) {
        console.log(
          `📊 Yahoo provider: ${failedTickers.length} tickers marked as failed`,
        );
      }

      if (suppressedTickers.length > 0) {
        console.log(
          `⏭️ Yahoo provider: ${suppressedTickers.length} tickers in retry suppression`,
        );
      }
    }

    return results;
  }

  getEnabledProviders(): string[] {
    return Array.from(this.enabledProviders);
  }

  getProviderStatus(): Array<{
    name: string;
    enabled: boolean;
    hasApiKey: boolean;
  }> {
    return [
      {
        name: "FMP",
        enabled: this.enabledProviders.has("FMP"),
        hasApiKey:
          settings.pricing.fmp.apiKey !== "demo" &&
          !!settings.pricing.fmp.apiKey,
      },
      {
        name: "TwelveData",
        enabled: this.enabledProviders.has("TwelveData"),
        hasApiKey:
          settings.pricing.twelveData.apiKey !== "demo" &&
          !!settings.pricing.twelveData.apiKey,
      },
      {
        name: "Yahoo",
        enabled: this.enabledProviders.has("Yahoo"),
        hasApiKey: true, // Yahoo doesn't require API key
      },
      {
        name: "Google Finance",
        enabled: this.enabledProviders.has("Google Finance"),
        hasApiKey: true, // Google Finance doesn't require API key
      },
    ];
  }

  // Get Yahoo provider specific status
  getYahooProviderStatus(): {
    failedTickers: string[];
    suppressedTickers: Array<{
      symbol: string;
      failTime: Date;
      suppressedUntil: Date;
    }>;
  } {
    if (!this.yahooProvider) {
      return { failedTickers: [], suppressedTickers: [] };
    }

    return {
      failedTickers: this.yahooProvider.getFailedTickers(),
      suppressedTickers: this.yahooProvider.getSuppressionStatus(),
    };
  }

  // Clear Yahoo provider failed ticker cache
  clearYahooFailedTickers(): void {
    if (this.yahooProvider) {
      this.yahooProvider.clearFailedTickers();
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Method to check for discrepancies between providers
  async compareProviders(
    symbol: string,
  ): Promise<{ quotes: QuoteData[]; discrepancies: string[] }> {
    const quotes: QuoteData[] = [];
    const discrepancies: string[] = [];

    // Fetch from all available providers
    for (const provider of this.providers) {
      try {
        const quote = await provider.fetchQuote(symbol);
        if (quote) {
          quotes.push(quote);
        }
      } catch {
        // Silently continue for comparison
      }
    }

    // Check for price discrepancies > 0.5%
    if (quotes.length > 1) {
      const prices = quotes.map((q) => q.price);
      const maxPrice = Math.max(...prices);
      const minPrice = Math.min(...prices);
      const discrepancyPercent = ((maxPrice - minPrice) / minPrice) * 100;

      if (discrepancyPercent > 0.5) {
        discrepancies.push(
          `Price discrepancy of ${discrepancyPercent.toFixed(2)}% detected for ${symbol}: ` +
            quotes.map((q) => `${q.source}: $${q.price.toFixed(2)}`).join(", "),
        );
      }
    }

    return { quotes, discrepancies };
  }
}

export const priceAggregator = new PriceAggregator();
