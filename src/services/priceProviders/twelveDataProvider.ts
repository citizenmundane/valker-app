import { QuoteData, PriceProvider } from "./types";
import { settings } from "../../config/settings";

export class TwelveDataProvider implements PriceProvider {
  private baseUrl = "https://api.twelvedata.com";
  private apiKey = settings.pricing.twelveData.apiKey;

  async fetchQuote(symbol: string): Promise<QuoteData | null> {
    // Check if we have a valid API key
    if (!this.apiKey || this.apiKey === "demo") {
      throw new Error(
        "Valid Twelve Data API key required. Get one free at https://twelvedata.com/pricing",
      );
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/quote?symbol=${symbol}&apikey=${this.apiKey}`,
        {
          headers: {
            Accept: "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Twelve Data API error: ${response.status}`);
      }

      const data = await response.json();

      // Check for API key error in response
      if (data.message && data.message.includes("demo")) {
        throw new Error(
          "Demo API key insufficient. Get a free API key at https://twelvedata.com/pricing",
        );
      }

      if (data.status === "error") {
        throw new Error(data.message || "Twelve Data API error");
      }

      if (!data.price) {
        return null;
      }

      const price = parseFloat(data.price);
      const previousClose = parseFloat(data.previous_close);
      const change = price - previousClose;

      return {
        source: "TwelveData",
        symbol: data.symbol,
        price,
        change,
        volume: parseInt(data.volume) || 0,
        timestamp: new Date(),
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Twelve Data request failed: ${error}`);
    }
  }

  async fetchBatchQuotes(symbols: string[]): Promise<QuoteData[]> {
    // Check if we have a valid API key
    if (!this.apiKey || this.apiKey === "demo") {
      throw new Error("Valid Twelve Data API key required");
    }

    const results: QuoteData[] = [];

    // Twelve Data free tier has rate limits, so we process sequentially
    for (const symbol of symbols) {
      try {
        const quote = await this.fetchQuote(symbol);
        if (quote) {
          results.push(quote);
        }

        // Rate limiting for free tier
        await this.delay(1000);
      } catch (error) {
        console.warn(`Twelve Data failed for ${symbol}:`, error);
      }
    }

    return results;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
