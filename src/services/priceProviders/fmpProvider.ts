import { QuoteData, PriceProvider } from "./types";
import { settings } from "../../config/settings";

export class FMPProvider implements PriceProvider {
  private baseUrl = "https://financialmodelingprep.com/api/v3";
  private apiKey = settings.pricing.fmp.apiKey;

  async fetchQuote(symbol: string): Promise<QuoteData | null> {
    // Check if we have a valid API key
    if (!this.apiKey || this.apiKey === "demo") {
      throw new Error(
        "Valid FMP API key required. Get one free at https://financialmodelingprep.com/",
      );
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/quote/${symbol}?apikey=${this.apiKey}`,
        {
          headers: {
            Accept: "application/json",
          },
        },
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error(
            "Invalid FMP API key. Please check your API key at https://financialmodelingprep.com/",
          );
        }
        throw new Error(`FMP API error: ${response.status}`);
      }

      const data = await response.json();

      if (!Array.isArray(data) || data.length === 0) {
        return null;
      }

      const quote = data[0];

      return {
        source: "FMP",
        symbol: quote.symbol,
        price: quote.price || 0,
        change: quote.change || 0,
        volume: quote.volume || 0,
        timestamp: new Date(),
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`FMP request failed: ${error}`);
    }
  }

  async fetchBatchQuotes(symbols: string[]): Promise<QuoteData[]> {
    // Check if we have a valid API key
    if (!this.apiKey || this.apiKey === "demo") {
      throw new Error("Valid FMP API key required");
    }

    try {
      const symbolList = symbols.join(",");
      const response = await fetch(
        `${this.baseUrl}/quote/${symbolList}?apikey=${this.apiKey}`,
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Invalid FMP API key");
        }
        throw new Error(`FMP API error: ${response.status}`);
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        return [];
      }

      return data.map((quote) => ({
        source: "FMP",
        symbol: quote.symbol,
        price: quote.price || 0,
        change: quote.change || 0,
        volume: quote.volume || 0,
        timestamp: new Date(),
      }));
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`FMP batch request failed: ${error}`);
    }
  }
}
