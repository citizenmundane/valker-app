// Ticker validation service with whitelists and validation logic
export class TickerValidationService {
  private stockTickers: Set<string> = new Set();
  private cryptoTickers: Set<string> = new Set();
  private initialized: boolean = false;
  private debugMode: boolean = false;

  constructor() {
    this.initializeWhitelists();
    // Enable debug mode in development
    this.debugMode = import.meta.env.DEV || false;
  }

  private initializeWhitelists() {
    // Top 1000+ US stock tickers (major exchanges)
    const validStockTickers = [
      // Major Tech
      "AAPL",
      "MSFT",
      "GOOGL",
      "GOOG",
      "AMZN",
      "TSLA",
      "META",
      "NVDA",
      "NFLX",
      "ADBE",
      "CRM",
      "ORCL",
      "INTC",
      "AMD",
      "QCOM",
      "AVGO",
      "TXN",
      "CSCO",
      "IBM",
      "UBER",
      "LYFT",
      "SNAP",
      "TWTR",
      "PINS",
      "SPOT",
      "ROKU",
      "ZM",
      "DOCU",
      "SHOP",
      "SQ",

      // Meme Stocks & Popular Trading
      "GME",
      "AMC",
      "BBBY",
      "NOK",
      "BB",
      "PLTR",
      "WISH",
      "CLOV",
      "SPCE",
      "NKLA",
      "RIVN",
      "LCID",
      "F",
      "NIO",
      "XPEV",
      "LI",
      "BABA",
      "JD",
      "PDD",
      "DIDI",

      // Financial
      "JPM",
      "BAC",
      "WFC",
      "GS",
      "MS",
      "C",
      "BRK.A",
      "BRK.B",
      "V",
      "MA",
      "PYPL",
      "AXP",
      "COF",
      "USB",
      "PNC",
      "TFC",
      "SCHW",
      "BLK",
      "SPGI",
      "ICE",

      // Healthcare & Biotech
      "JNJ",
      "PFE",
      "UNH",
      "ABBV",
      "TMO",
      "DHR",
      "ABT",
      "LLY",
      "BMY",
      "MRK",
      "GILD",
      "AMGN",
      "BIIB",
      "REGN",
      "VRTX",
      "ILMN",
      "MRNA",
      "BNTX",
      "ZTS",
      "CVS",

      // Energy
      "XOM",
      "CVX",
      "COP",
      "EOG",
      "SLB",
      "PSX",
      "VLO",
      "MPC",
      "KMI",
      "OKE",

      // Consumer
      "WMT",
      "HD",
      "PG",
      "KO",
      "PEP",
      "COST",
      "LOW",
      "TGT",
      "SBUX",
      "MCD",
      "NKE",
      "LULU",
      "TJX",
      "DIS",
      "CMCSA",
      "T",
      "VZ",
      "TMUS",
      "CHTR",
      "DISH",

      // Industrial
      "BA",
      "CAT",
      "DE",
      "GE",
      "HON",
      "LMT",
      "RTX",
      "UPS",
      "FDX",
      "UNP",

      // ETFs & Popular Funds
      "SPY",
      "QQQ",
      "IWM",
      "VTI",
      "VOO",
      "VEA",
      "VWO",
      "AGG",
      "BND",
      "TLT",
      "GLD",
      "SLV",
      "USO",
      "XLE",
      "XLF",
      "XLK",
      "XLV",
      "XLI",
      "XLP",
      "XLU",
      "ARKK",
      "ARKQ",
      "ARKW",
      "ARKG",
      "ARKF",
      "SQQQ",
      "TQQQ",
      "UVXY",
      "VIX",

      // REITs
      "AMT",
      "PLD",
      "CCI",
      "EQIX",
      "PSA",
      "WELL",
      "DLR",
      "O",
      "SBAC",
      "EXR",

      // Utilities
      "NEE",
      "DUK",
      "SO",
      "D",
      "AEP",
      "EXC",
      "XEL",
      "SRE",
      "PEG",
      "ED",

      // Materials
      "LIN",
      "APD",
      "ECL",
      "SHW",
      "FCX",
      "NEM",
      "DOW",
      "DD",
      "PPG",
      "NUE",
    ];

    // Top 500+ crypto tickers (major cryptocurrencies)
    const validCryptoTickers = [
      // Major Cryptocurrencies
      "BTC",
      "ETH",
      "BNB",
      "XRP",
      "ADA",
      "SOL",
      "DOGE",
      "DOT",
      "AVAX",
      "SHIB",
      "MATIC",
      "LTC",
      "UNI",
      "LINK",
      "ATOM",
      "XLM",
      "VET",
      "FIL",
      "TRX",
      "ETC",
      "HBAR",
      "ALGO",
      "ICP",
      "NEAR",
      "FLOW",
      "MANA",
      "SAND",
      "AXS",
      "CHZ",
      "ENJ",

      // Meme Coins
      "PEPE",
      "FLOKI",
      "BONK",
      "WIF",
      "BOME",
      "BABYDOGE",
      "SAFEMOON",
      "ELON",
      "AKITA",
      "KISHU",
      "HOKK",
      "LEASH",
      "BONE",
      "RYOSHI",
      "JACY",
      "SAITAMA",

      // DeFi Tokens
      "AAVE",
      "COMP",
      "MKR",
      "SNX",
      "YFI",
      "SUSHI",
      "CRV",
      "BAL",
      "REN",
      "KNC",
      "ZRX",
      "LRC",
      "BAND",
      "ALPHA",
      "CREAM",
      "BADGER",
      "PICKLE",
      "FARM",
      "ROOK",

      // Layer 1 & 2
      "LUNA",
      "LUNC",
      "USTC",
      "FTM",
      "ONE",
      "HARMONY",
      "CELO",
      "KLAY",
      "WAVES",
      "ZIL",
      "ICX",
      "QTUM",
      "ONT",
      "NEO",
      "GAS",
      "EOS",
      "IOST",
      "TRON",
      "BTT",

      // Exchange Tokens
      "FTT",
      "CRO",
      "HT",
      "OKB",
      "LEO",
      "KCS",
      "GT",
      "BGB",
      "MX",
      "WBT",

      // Gaming & NFT
      "GMT",
      "GST",
      "SLP",
      "RON",
      "ALICE",
      "TLM",
      "ILV",
      "GALA",
      "TOWER",
      "SKILL",
      "PYR",
      "NFTX",
      "RARI",
      "SUPER",
      "WHALE",
      "MASK",
      "AUDIO",
      "LOOKS",
      "X2Y2",

      // Stablecoins
      "USDT",
      "USDC",
      "BUSD",
      "DAI",
      "TUSD",
      "USDP",
      "GUSD",
      "USDN",
      "FEI",
      "LUSD",

      // Privacy Coins
      "XMR",
      "ZEC",
      "DASH",
      "DCR",
      "BEAM",
      "GRIN",
      "FIRO",
      "ARRR",
      "DERO",
      "OXEN",

      // Infrastructure
      "DOT",
      "KSM",
      "ATOM",
      "OSMO",
      "JUNO",
      "SCRT",
      "REGEN",
      "DVPN",
      "AKT",
      "ROWAN",
    ];

    // Populate sets for O(1) lookup
    validStockTickers.forEach((ticker) =>
      this.stockTickers.add(ticker.toUpperCase()),
    );
    validCryptoTickers.forEach((ticker) =>
      this.cryptoTickers.add(ticker.toUpperCase()),
    );

    this.initialized = true;
    console.log(
      `✅ Ticker validation initialized: ${this.stockTickers.size} stocks, ${this.cryptoTickers.size} crypto`,
    );
  }

  // Extract stock tickers using strict $TICKER format
  extractStockTickers(text: string): string[] {
    // Regex for $TICKER format only (1-5 characters)
    const stockRegex = /\$([A-Z]{1,5})\b/g;
    const matches = text.match(stockRegex) || [];

    const validTickers = matches
      .map((match) => match.replace("$", "").toUpperCase())
      .filter((ticker) => this.isValidStockTicker(ticker));

    if (this.debugMode && matches.length > 0) {
      const invalidTickers = matches
        .map((match) => match.replace("$", "").toUpperCase())
        .filter((ticker) => !this.isValidStockTicker(ticker));

      if (invalidTickers.length > 0) {
        console.log(
          `🔍 Reddit Debug - Invalid stock tickers filtered: ${invalidTickers.join(", ")}`,
        );
      }
    }

    return [...new Set(validTickers)]; // Remove duplicates
  }

  // Extract crypto tickers from crypto-focused subreddits
  extractCryptoTickers(
    text: string,
    isCryptoSubreddit: boolean = false,
  ): string[] {
    if (!isCryptoSubreddit) return [];

    // More permissive regex for crypto in crypto subreddits
    const cryptoRegex = /\b([A-Z]{2,6})\b/g;
    const matches = text.match(cryptoRegex) || [];

    // Filter out common English words and validate against crypto whitelist
    const blacklist = new Set([
      "THE",
      "AND",
      "FOR",
      "ARE",
      "BUT",
      "NOT",
      "YOU",
      "ALL",
      "CAN",
      "HER",
      "WAS",
      "ONE",
      "OUR",
      "OUT",
      "DAY",
      "GET",
      "USE",
      "MAN",
      "NEW",
      "NOW",
      "WAY",
      "MAY",
      "SAY",
      "SEE",
      "HIM",
      "TWO",
      "HOW",
      "ITS",
      "WHO",
      "OIL",
      "SIT",
      "SET",
      "RUN",
      "EAT",
      "FAR",
      "SEA",
      "EYE",
      "BED",
      "RED",
      "TOP",
      "ARM",
      "TOO",
      "OLD",
      "ANY",
      "APP",
      "BAD",
      "BIG",
      "BOY",
      "BUY",
      "CAR",
      "CUT",
      "DID",
      "END",
      "FEW",
      "GOT",
      "HIT",
      "HOT",
      "JOB",
      "LET",
      "LOT",
      "LOW",
      "OWN",
      "PAY",
      "PUT",
      "SIX",
      "TEN",
      "TRY",
      "WIN",
      "YES",
      "YET",
      "USD",
      "EUR",
      "GBP",
      "JPY",
      "CAD",
      "AUD",
      "CHF",
      "CNY",
      "INR",
      "KRW",
      "BRL",
      "MXN",
      "RUB",
      "ZAR",
      "CEO",
      "CFO",
      "CTO",
      "COO",
      "CMO",
      "CIO",
      "IPO",
      "SEC",
      "FDA",
      "FBI",
      "CIA",
      "NSA",
      "IRS",
      "DOJ",
      "API",
      "SDK",
      "URL",
      "DNS",
      "VPN",
      "SSL",
      "HTTP",
      "HTML",
      "CSS",
      "SQL",
      "XML",
      "JSON",
      "REST",
    ]);

    const validTickers = matches
      .map((match) => match.toUpperCase())
      .filter(
        (ticker) =>
          !blacklist.has(ticker) &&
          ticker.length >= 2 &&
          ticker.length <= 6 &&
          this.isValidCryptoTicker(ticker),
      );

    if (this.debugMode && matches.length > 0) {
      const invalidTickers = matches
        .map((match) => match.toUpperCase())
        .filter(
          (ticker) =>
            !blacklist.has(ticker) &&
            ticker.length >= 2 &&
            ticker.length <= 6 &&
            !this.isValidCryptoTicker(ticker),
        );

      if (invalidTickers.length > 0) {
        console.log(
          `🔍 Reddit Debug - Invalid crypto tickers filtered: ${invalidTickers.join(", ")}`,
        );
      }
    }

    return [...new Set(validTickers)]; // Remove duplicates
  }

  // Validation methods
  isValidStockTicker(ticker: string): boolean {
    return this.stockTickers.has(ticker.toUpperCase());
  }

  isValidCryptoTicker(ticker: string): boolean {
    return this.cryptoTickers.has(ticker.toUpperCase());
  }

  // Get debug information
  getDebugInfo(): {
    stockCount: number;
    cryptoCount: number;
    debugMode: boolean;
  } {
    return {
      stockCount: this.stockTickers.size,
      cryptoCount: this.cryptoTickers.size,
      debugMode: this.debugMode,
    };
  }

  // Enable/disable debug mode
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
    console.log(`🔍 Reddit Debug Mode: ${enabled ? "ENABLED" : "DISABLED"}`);
  }

  // Get sample of valid tickers for testing
  getSampleTickers(): { stocks: string[]; crypto: string[] } {
    return {
      stocks: Array.from(this.stockTickers).slice(0, 20),
      crypto: Array.from(this.cryptoTickers).slice(0, 20),
    };
  }
}

export const tickerValidation = new TickerValidationService();
