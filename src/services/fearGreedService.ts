interface FearGreedData {
  value: number; // 0-100 scale
  classification: "Extreme Fear" | "Fear" | "Neutral" | "Greed" | "Extreme Greed";
  timestamp: Date;
  change24h?: number;
  change7d?: number;
}

interface MarketSentimentSignal {
  ticker: string;
  type: "Stock" | "Coin" | "Market";
  signalType: "fear_greed_shift" | "market_sentiment" | "volatility_spike";
  confidence: number;
  summary: string;
  fearGreedValue: number;
  classification: string;
  metadata: Record<string, unknown>;
  source: "Fear & Greed Index";
  timestamp: Date;
}

export class FearGreedService {
  private readonly cryptoFearGreedUrl = 'https://api.alternative.me/fng/';
  private lastCryptoData: FearGreedData | null = null;
  private readonly requestDelay = 10000; // Be conservative with free API
  private lastRequest = 0;

  constructor() {
    console.log('😱 Fear & Greed Index service initialized');
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async fetchWithRetry(url: string, retries = 3): Promise<Response> {
    // Rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequest;
    if (timeSinceLastRequest < this.requestDelay) {
      await this.delay(this.requestDelay - timeSinceLastRequest);
    }

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Valker Trading App/1.0',
            'Accept': 'application/json'
          }
        });

        this.lastRequest = Date.now();

        if (response.ok) {
          return response;
        }

        if (response.status === 429) {
          // Rate limited
          const waitTime = Math.pow(2, attempt) * 2000;
          console.log(`⏳ Fear & Greed API rate limited, waiting ${waitTime}ms...`);
          await this.delay(waitTime);
          continue;
        }

        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      } catch (error) {
        if (attempt === retries) {
          throw error;
        }
        await this.delay(1000 * (attempt + 1));
      }
    }
    throw new Error("Max retries exceeded");
  }

  private classifyFearGreed(value: number): "Extreme Fear" | "Fear" | "Neutral" | "Greed" | "Extreme Greed" {
    if (value <= 20) return "Extreme Fear";
    if (value <= 40) return "Fear";
    if (value <= 60) return "Neutral";
    if (value <= 80) return "Greed";
    return "Extreme Greed";
  }

  async getCryptoFearGreed(days: number = 30): Promise<FearGreedData[]> {
    try {
      console.log(`😱 Getting crypto Fear & Greed data (${days} days)...`);

      const response = await this.fetchWithRetry(`${this.cryptoFearGreedUrl}?limit=${days}&format=json`);
      const data = await response.json() as {
        data: Array<{
          value: string;
          value_classification: string;
          timestamp: string;
        }>;
      };

      if (!data.data || !Array.isArray(data.data)) {
        console.warn('⚠️ Invalid Fear & Greed data format');
        return [];
      }

      const fearGreedData: FearGreedData[] = data.data.map(item => {
        const value = parseInt(item.value);
        return {
          value,
          classification: this.classifyFearGreed(value),
          timestamp: new Date(parseInt(item.timestamp) * 1000)
        };
      });

      // Calculate changes
      if (fearGreedData.length >= 2) {
        fearGreedData[0].change24h = fearGreedData[0].value - fearGreedData[1].value;
      }
      
      if (fearGreedData.length >= 7) {
        fearGreedData[0].change7d = fearGreedData[0].value - fearGreedData[6].value;
      }

      // Store latest data
      if (fearGreedData.length > 0) {
        this.lastCryptoData = fearGreedData[0];
      }

      console.log(`✅ Fear & Greed: Got ${fearGreedData.length} data points, current: ${fearGreedData[0]?.value} (${fearGreedData[0]?.classification})`);
      return fearGreedData;

    } catch (error) {
      console.error('❌ Failed to get crypto Fear & Greed data:', error);
      return [];
    }
  }

  async getStockMarketSentiment(): Promise<FearGreedData | null> {
    try {
      // For stock market, we'll use VIX-like calculation from available data
      // This is a simplified approach - in production you'd use actual VIX data
      console.log('😱 Calculating stock market sentiment...');

      // Mock calculation based on typical market indicators
      // In production, you'd integrate with:
      // - VIX (Volatility Index)
      // - Put/Call ratio
      // - Market breadth
      // - Safe haven demand (bonds, gold)
      
      const mockSentiment: FearGreedData = {
        value: 45, // Mock neutral-fear value
        classification: this.classifyFearGreed(45),
        timestamp: new Date(),
        change24h: -3,
        change7d: -8
      };

      console.log(`✅ Stock market sentiment: ${mockSentiment.value} (${mockSentiment.classification})`);
      return mockSentiment;

    } catch (error) {
      console.error('❌ Failed to calculate stock market sentiment:', error);
      return null;
    }
  }

  async detectSentimentShifts(): Promise<MarketSentimentSignal[]> {
    try {
      console.log('😱 Detecting sentiment shifts...');
      
      const signals: MarketSentimentSignal[] = [];

      // Get recent crypto fear & greed data
      const cryptoData = await this.getCryptoFearGreed(7);
      
      if (cryptoData.length >= 2) {
        const current = cryptoData[0];
        const previous = cryptoData[1];
        const change = current.value - previous.value;

        // Detect significant shifts
        if (Math.abs(change) >= 15) {
          const isPositiveShift = change > 0;
          const confidence = Math.min(90, 50 + Math.abs(change));

          signals.push({
            ticker: "CRYPTO",
            type: "Market",
            signalType: "fear_greed_shift",
            confidence,
            summary: `Crypto Fear & Greed shifted ${change > 0 ? '+' : ''}${change.toFixed(0)} points to ${current.value} (${current.classification})`,
            fearGreedValue: current.value,
            classification: current.classification,
            metadata: {
              previousValue: previous.value,
              change,
              isPositiveShift,
              magnitude: Math.abs(change)
            },
            source: "Fear & Greed Index",
            timestamp: new Date()
          });
        }

        // Detect extreme readings
        if (current.value <= 20 || current.value >= 80) {
          const isExtreme = current.value <= 20 || current.value >= 80;
          const confidence = isExtreme ? 85 : 70;

          signals.push({
            ticker: "CRYPTO",
            type: "Market",
            signalType: "market_sentiment",
            confidence,
            summary: `Crypto market showing ${current.classification.toLowerCase()} (${current.value}/100) - potential contrarian opportunity`,
            fearGreedValue: current.value,
            classification: current.classification,
            metadata: {
              isExtreme,
              contrarian: current.value <= 20 ? 'bullish' : 'bearish',
              sustainedDays: this.countSustainedExtreme(cryptoData, current.value <= 20)
            },
            source: "Fear & Greed Index",
            timestamp: new Date()
          });
        }
      }

      // Get stock market sentiment
      const stockSentiment = await this.getStockMarketSentiment();
      if (stockSentiment && stockSentiment.change24h && Math.abs(stockSentiment.change24h) >= 10) {
        signals.push({
          ticker: "SPY",
          type: "Stock",
          signalType: "market_sentiment",
          confidence: 65,
          summary: `Stock market sentiment shifted ${stockSentiment.change24h > 0 ? '+' : ''}${stockSentiment.change24h} points to ${stockSentiment.value} (${stockSentiment.classification})`,
          fearGreedValue: stockSentiment.value,
          classification: stockSentiment.classification,
          metadata: {
            change24h: stockSentiment.change24h,
            change7d: stockSentiment.change7d
          },
          source: "Fear & Greed Index",
          timestamp: new Date()
        });
      }

      console.log(`✅ Fear & Greed: Found ${signals.length} sentiment signals`);
      return signals;

    } catch (error) {
      console.error('❌ Failed to detect sentiment shifts:', error);
      return [];
    }
  }

  private countSustainedExtreme(data: FearGreedData[], isExtremeFear: boolean): number {
    let count = 0;
    for (const point of data) {
      if (isExtremeFear && point.value <= 20) {
        count++;
      } else if (!isExtremeFear && point.value >= 80) {
        count++;
      } else {
        break;
      }
    }
    return count;
  }

  async getMarketRegimeSignals(): Promise<MarketSentimentSignal[]> {
    try {
      console.log('😱 Analyzing market regime...');
      
      const signals: MarketSentimentSignal[] = [];
      const cryptoData = await this.getCryptoFearGreed(30);
      
      if (cryptoData.length >= 30) {
        // Calculate moving averages
        const recent7 = cryptoData.slice(0, 7).reduce((sum, d) => sum + d.value, 0) / 7;
        const recent30 = cryptoData.reduce((sum, d) => sum + d.value, 0) / 30;
        
        // Detect regime changes
        const regimeDifference = recent7 - recent30;
        
        if (Math.abs(regimeDifference) >= 10) {
          const isShiftToGreed = regimeDifference > 0;
          
          signals.push({
            ticker: "MARKET",
            type: "Market",
            signalType: "market_sentiment",
            confidence: 75,
            summary: `Market regime shifting toward ${isShiftToGreed ? 'greed' : 'fear'} (7d avg: ${recent7.toFixed(0)}, 30d avg: ${recent30.toFixed(0)})`,
            fearGreedValue: recent7,
            classification: this.classifyFearGreed(recent7),
            metadata: {
              recent7DayAvg: recent7,
              recent30DayAvg: recent30,
              regimeDifference,
              trendDirection: isShiftToGreed ? 'bullish' : 'bearish'
            },
            source: "Fear & Greed Index",
            timestamp: new Date()
          });
        }
      }

      return signals;

    } catch (error) {
      console.error('❌ Failed to analyze market regime:', error);
      return [];
    }
  }

  getLatestCryptoFearGreed(): FearGreedData | null {
    return this.lastCryptoData;
  }

  async getAllSentimentSignals(): Promise<MarketSentimentSignal[]> {
    try {
      console.log('😱 Getting all sentiment signals...');
      
      const [sentimentShifts, regimeSignals] = await Promise.all([
        this.detectSentimentShifts(),
        this.getMarketRegimeSignals()
      ]);

      const allSignals = [...sentimentShifts, ...regimeSignals];
      
      // Sort by confidence
      allSignals.sort((a, b) => b.confidence - a.confidence);

      console.log(`✅ Fear & Greed: Generated ${allSignals.length} total sentiment signals`);
      return allSignals;

    } catch (error) {
      console.error('❌ Failed to get all sentiment signals:', error);
      return [];
    }
  }

  // Utility method to interpret current market state
  interpretMarketState(fearGreedValue: number): {
    state: string;
    recommendation: string;
    explanation: string;
  } {
    const classification = this.classifyFearGreed(fearGreedValue);
    
    let state: string;
    let recommendation: string;
    let explanation: string;

    switch (classification) {
      case "Extreme Fear":
        state = "Oversold";
        recommendation = "Contrarian Buy";
        explanation = "Extreme fear often marks market bottoms. Consider buying quality assets.";
        break;
      case "Fear":
        state = "Cautious";
        recommendation = "Selective Buy";
        explanation = "Market fear creates opportunities. Look for strong fundamentals.";
        break;
      case "Neutral":
        state = "Balanced";
        recommendation = "Wait & Watch";
        explanation = "Market is balanced. Wait for clearer directional signals.";
        break;
      case "Greed":
        state = "Elevated";
        recommendation = "Take Profits";
        explanation = "Greed building up. Consider reducing risk and taking profits.";
        break;
      case "Extreme Greed":
        state = "Overbought";
        recommendation = "Sell/Hedge";
        explanation = "Extreme greed often precedes corrections. Consider defensive positioning.";
        break;
    }

    return { state, recommendation, explanation };
  }
}

export const fearGreedService = new FearGreedService();