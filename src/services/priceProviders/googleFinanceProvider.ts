import { QuoteData, PriceProvider } from "./types";

export class GoogleFinanceProvider implements PriceProvider {
  private requestCount = 0;
  private lastResetTime = Date.now();
  private readonly rateLimit = 30; // Conservative rate limit

  private checkRateLimit(): boolean {
    const now = Date.now();
    const minutesSinceReset = (now - this.lastResetTime) / (1000 * 60);

    if (minutesSinceReset >= 1) {
      this.requestCount = 0;
      this.lastResetTime = now;
    }

    return this.requestCount < this.rateLimit;
  }

  async fetchQuote(symbol: string): Promise<QuoteData | null> {
    const startTime = Date.now();

    try {
      if (!this.checkRateLimit()) {
        console.warn(
          `⚠️ Google Finance: Rate limit exceeded, skipping ${symbol}`,
        );
        return null;
      }

      this.requestCount++;

      // Use Google Finance search API (unofficial but more reliable than scraping)
      const searchUrl = `https://www.google.com/finance/quote/${symbol}:NASDAQ`;

      // Use a proxy service to avoid CORS
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(searchUrl)}`;

      const response = await fetch(proxyUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });

      if (!response.ok) {
        throw new Error(`Google Finance proxy error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.contents) {
        throw new Error("No data from Google Finance proxy");
      }

      // Parse HTML response to extract price data
      const html = data.contents;
      const priceData = this.parseGoogleFinanceHTML(html, symbol);

      if (!priceData) {
        console.warn(`⚠️ Google Finance: Could not parse data for ${symbol}`);
        return null;
      }

      const responseTime = Date.now() - startTime;
      console.log(`✅ Google Finance: ${symbol} fetched in ${responseTime}ms`);

      return {
        source: "Google Finance",
        symbol: symbol.toUpperCase(),
        price: priceData.price,
        change: priceData.change,
        volume: priceData.volume || 0,
        timestamp: new Date(),
      };
    } catch {
      console.warn(`Failed to fetch price for ${symbol} from Google Finance`);
      return null;
    }
  }

  async fetchBatchQuotes(symbols: string[]): Promise<QuoteData[]> {
    console.log(
      `📊 Google Finance: Fetching quotes for ${symbols.length} symbols...`,
    );

    const results: QuoteData[] = [];

    // Process sequentially to respect rate limits
    for (const symbol of symbols) {
      try {
        const quote = await this.fetchQuote(symbol);
        if (quote) {
          results.push(quote);
        }

        // Add delay between requests
        await this.delay(2000);
      } catch {
        console.warn(`⚠️ Google Finance: Failed to fetch ${symbol}`);
      }
    }

    const successRate = (results.length / symbols.length) * 100;
    console.log(
      `✅ Google Finance: Batch complete - ${results.length}/${symbols.length} symbols (${successRate.toFixed(1)}% success rate)`,
    );

    return results;
  }

  private parseGoogleFinanceHTML(
    html: string,
    symbol: string,
  ): { price: number; change: number; volume?: number } | null {
    try {
      // Look for price data in the HTML using regex patterns
      // Google Finance typically has price data in specific div elements

      // Pattern for current price
      const priceMatch = html.match(/data-last-price="([^"]+)"/);
      const priceMatch2 = html.match(/class="[^"]*YMlKec[^"]*"[^>]*>([^<]+)</);

      // Pattern for change
      const changeMatch = html.match(/data-last-change="([^"]+)"/);
      const changeMatch2 = html.match(/class="[^"]*P2Luy[^"]*"[^>]*>([^<]+)</);

      // Pattern for volume
      const volumeMatch = html.match(/Volume[^>]*>([^<]+)</i);

      let price = 0;
      let change = 0;
      let volume = 0;

      // Extract price
      if (priceMatch && priceMatch[1]) {
        price = parseFloat(priceMatch[1].replace(/[,$]/g, ""));
      } else if (priceMatch2 && priceMatch2[1]) {
        price = parseFloat(priceMatch2[1].replace(/[,$]/g, ""));
      }

      // Extract change
      if (changeMatch && changeMatch[1]) {
        change = parseFloat(changeMatch[1].replace(/[,$+]/g, ""));
      } else if (changeMatch2 && changeMatch2[1]) {
        const changeText = changeMatch2[1].replace(/[,$+]/g, "");
        change = parseFloat(changeText);
      }

      // Extract volume
      if (volumeMatch && volumeMatch[1]) {
        const volumeText = volumeMatch[1].replace(/[,]/g, "");
        volume = parseFloat(volumeText) || 0;
      }

      if (price > 0) {
        return { price, change, volume };
      }

      return null;
    } catch (error) {
      console.warn(
        `⚠️ Google Finance: HTML parsing failed for ${symbol}:`,
        error,
      );
      return null;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
