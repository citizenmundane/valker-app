import { PriceData } from "../types/Asset";
import { PriceAggregator } from "./priceProviders/priceAggregator";

class PricingService {
  private lastUpdateTime: Date | null = null;
  private updateInterval: number = 5 * 60 * 1000; // 5 minutes
  private isUpdating: boolean = false;
  private priceAggregator: PriceAggregator;

  constructor() {
    this.priceAggregator = new PriceAggregator();
  }

  private async fetchWithRetry(
    url: string,
    maxRetries: number = 3,
    baseDelay: number = 1000,
  ): Promise<Response> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          return response;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      } catch (error) {
        lastError = error as Error;

        if (attempt === maxRetries) {
          break;
        }

        // Exponential backoff with jitter
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
        console.log(
          `⏳ Fetch attempt ${attempt + 1} failed, retrying in ${Math.round(delay)}ms...`,
        );
        await this.delay(delay);
      }
    }

    throw lastError!;
  }

  async fetchStockPrices(tickers: string[]): Promise<PriceData[]> {
    console.log(`📈 Fetching stock prices for ${tickers.length} tickers...`);

    try {
      const quotes = await this.priceAggregator.fetchBatchQuotes(tickers);

      return quotes.map((quote) => ({
        ticker: quote.symbol,
        price: quote.price,
        change24h: quote.change,
        percentChange24h:
          quote.price > 0
            ? (quote.change / (quote.price - quote.change)) * 100
            : 0,
        lastUpdated: quote.timestamp,
        source: quote.source,
      }));
    } catch (error) {
      console.error("❌ Stock price fetch failed:", error);
      return [];
    }
  }

  async fetchCryptoPrices(tickers: string[]): Promise<PriceData[]> {
    console.log(`🚀 Fetching crypto prices for ${tickers.length} tickers...`);

    try {
      // Convert tickers to CoinGecko IDs
      const tickerToId = await this.getCoinGeckoIds(tickers);
      const coinIds = Object.values(tickerToId).filter((id) => id);

      if (coinIds.length === 0) return [];

      await this.delay(1000); // Rate limiting

      const response = await this.fetchWithRetry(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds.join(",")}&vs_currencies=usd&include_24hr_change=true`,
      );

      const data = await response.json();
      const results: PriceData[] = [];

      Object.entries(tickerToId).forEach(([ticker, coinId]) => {
        if (coinId && data[coinId]) {
          const coinData = data[coinId];
          const price = coinData.usd || 0;
          const percentChange24h = coinData.usd_24h_change || 0;
          const change24h = (price * percentChange24h) / 100;

          results.push({
            ticker,
            price,
            change24h,
            percentChange24h,
            lastUpdated: new Date(),
            source: "CoinGecko",
          });

          console.log(
            `✅ ${ticker}: $${price.toFixed(price < 1 ? 6 : 2)} (${percentChange24h > 0 ? "+" : ""}${percentChange24h.toFixed(2)}%)`,
          );
        }
      });

      return results;
    } catch (error) {
      console.error("❌ Failed to fetch crypto prices:", error);
      return [];
    }
  }

  private async getCoinGeckoIds(
    tickers: string[],
  ): Promise<Record<string, string>> {
    try {
      const response = await this.fetchWithRetry(
        "https://api.coingecko.com/api/v3/coins/list",
      );
      const coins = await response.json();

      const tickerToId: Record<string, string> = {};

      tickers.forEach((ticker) => {
        const coin = coins.find(
          (c: any) => c.symbol.toLowerCase() === ticker.toLowerCase(),
        );
        if (coin) {
          tickerToId[ticker] = coin.id;
        }
      });

      return tickerToId;
    } catch (error) {
      console.error("Failed to fetch CoinGecko coin list:", error);

      // Fallback mapping for common coins
      const fallbackMapping: Record<string, string> = {
        BTC: "bitcoin",
        ETH: "ethereum",
        BNB: "binancecoin",
        XRP: "ripple",
        ADA: "cardano",
        SOL: "solana",
        DOGE: "dogecoin",
        DOT: "polkadot",
        AVAX: "avalanche-2",
        SHIB: "shiba-inu",
        MATIC: "matic-network",
        LTC: "litecoin",
        UNI: "uniswap",
        LINK: "chainlink",
        ATOM: "cosmos",
        XLM: "stellar",
        VET: "vechain",
        FIL: "filecoin",
        TRX: "tron",
        ETC: "ethereum-classic",
        HBAR: "hedera-hashgraph",
        ALGO: "algorand",
        ICP: "internet-computer",
        NEAR: "near",
        FLOW: "flow",
        MANA: "decentraland",
        SAND: "the-sandbox",
        AXS: "axie-infinity",
        CHZ: "chiliz",
        ENJ: "enjincoin",
        PEPE: "pepe",
        FLOKI: "floki",
        BONK: "bonk",
        WIF: "dogwifcoin",
      };

      const result: Record<string, string> = {};
      tickers.forEach((ticker) => {
        if (fallbackMapping[ticker.toUpperCase()]) {
          result[ticker] = fallbackMapping[ticker.toUpperCase()];
        }
      });

      return result;
    }
  }

  async updateAllPrices(
    assets: { ticker: string; type: "Stock" | "Coin" }[],
  ): Promise<PriceData[]> {
    if (this.isUpdating) {
      console.log("⏳ Price update already in progress...");
      return [];
    }

    this.isUpdating = true;
    console.log("💰 Starting comprehensive price update...");

    try {
      const stocks = assets
        .filter((a) => a.type === "Stock")
        .map((a) => a.ticker);
      const cryptos = assets
        .filter((a) => a.type === "Coin")
        .map((a) => a.ticker);

      const [stockPrices, cryptoPrices] = await Promise.all([
        stocks.length > 0 ? this.fetchStockPrices(stocks) : Promise.resolve([]),
        cryptos.length > 0
          ? this.fetchCryptoPrices(cryptos)
          : Promise.resolve([]),
      ]);

      const allPrices = [...stockPrices, ...cryptoPrices];
      this.lastUpdateTime = new Date();

      // Log provider status
      const providerStatus = this.priceAggregator.getProviderStatus();
      const enabledProviders = providerStatus
        .filter((p) => p.enabled)
        .map((p) => p.name);
      console.log(
        `✅ Price update complete: ${allPrices.length} assets updated using ${enabledProviders.join(", ")}`,
      );

      // Show API key warnings if needed
      const missingKeys = providerStatus.filter(
        (p) => p.name !== "Yahoo" && !p.hasApiKey,
      );
      if (missingKeys.length > 0) {
        console.log(
          `⚠️ Consider adding API keys for: ${missingKeys.map((p) => p.name).join(", ")} for better price coverage`,
        );
      }

      return allPrices;
    } catch (error) {
      console.error("❌ Price update failed:", error);
      return [];
    } finally {
      this.isUpdating = false;
    }
  }

  shouldUpdatePrices(): boolean {
    if (!this.lastUpdateTime) return true;
    return Date.now() - this.lastUpdateTime.getTime() > this.updateInterval;
  }

  getLastUpdateTime(): Date | null {
    return this.lastUpdateTime;
  }

  isCurrentlyUpdating(): boolean {
    return this.isUpdating;
  }

  getProviderStatus() {
    return this.priceAggregator.getProviderStatus();
  }

  getEnabledProviders(): string[] {
    return this.priceAggregator.getEnabledProviders();
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const pricingService = new PricingService();
