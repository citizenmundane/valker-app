interface TwitterMention {
  ticker: string;
  type: "Stock" | "Coin";
  mentions: number;
  sentiment: number;
  avgScore: number;
  posts: number;
  source: string;
}

export class TwitterSentimentService {
  private requestDelay: number = 2000;

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async scanTwitterMentions(): Promise<TwitterMention[]> {
    console.log("🐦 Twitter sentiment scanning disabled - requires API access");
    console.log(
      "💡 To enable: Add Twitter API credentials to environment variables",
    );

    // Return empty array instead of mock data
    return [];
  }

  // Keep the sentiment analysis method for potential future use
  private analyzeTwitterSentiment(text: string): number {
    const positiveWords = [
      "bullish",
      "moon",
      "pump",
      "buy",
      "long",
      "call",
      "green",
      "profit",
      "gain",
    ];
    const negativeWords = [
      "bearish",
      "dump",
      "sell",
      "short",
      "put",
      "red",
      "loss",
      "crash",
    ];

    let positiveCount = 0;
    let negativeCount = 0;

    positiveWords.forEach((word) => {
      const regex = new RegExp(`\\b${word}\\b`, "gi");
      const matches = text.match(regex);
      if (matches) positiveCount += matches.length;
    });

    negativeWords.forEach((word) => {
      const regex = new RegExp(`\\b${word}\\b`, "gi");
      const matches = text.match(regex);
      if (matches) negativeCount += matches.length;
    });

    const total = positiveCount + negativeCount;
    if (total === 0) return 0.5;

    return Math.max(0, Math.min(1, positiveCount / total));
  }

  private extractStockTickers(text: string): string[] {
    const tickerMatches = text.match(/\$([A-Z]{2,5})\b/g) || [];
    return tickerMatches.map((match) => match.replace("$", ""));
  }

  private extractCryptoTickers(text: string): string[] {
    const cryptoTickers = [
      "BTC",
      "ETH",
      "DOGE",
      "SHIB",
      "SOL",
      "ADA",
      "DOT",
      "AVAX",
    ];
    return cryptoTickers.filter((ticker) => text.includes(ticker));
  }
}

export const twitterSentimentService = new TwitterSentimentService();
