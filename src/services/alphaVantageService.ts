interface AlphaVantageQuote {
  symbol: string;
  price: number;
  changePercent: number;
  volume: number;
  previousClose: number;
  timestamp: Date;
}

interface EarningsData {
  symbol: string;
  reportDate: Date;
  estimate: number;
  actual?: number;
  surprise?: number;
  surprisePercent?: number;
}

interface EconomicIndicator {
  name: string;
  value: number;
  date: Date;
  unit: string;
}

interface AlphaVantageSignal {
  ticker: string;
  type: "Stock" | "Coin";
  signalType: "earnings_surprise" | "economic_indicator" | "unusual_volume" | "technical_breakout";
  confidence: number;
  summary: string;
  metadata: Record<string, unknown>;
  source: "Alpha Vantage";
  timestamp: Date;
}

export class AlphaVantageService {
  private readonly apiKey: string | undefined;
  private readonly baseUrl = 'https://www.alphavantage.co/query';
  private readonly requestDelay = 12000; // 5 calls per minute = 12 second delay
  private readonly maxDailyCalls = 25; // Free tier limit
  private lastRequest = 0;
  private dailyCallCount = 0;
  private lastResetDate = new Date().toDateString();

  constructor() {
    this.apiKey = import.meta.env.VITE_ALPHA_VANTAGE_API_KEY;
    
    if (!this.apiKey) {
      console.log('ℹ️ Alpha Vantage API key not configured - using free demo endpoints only');
    } else {
      console.log('📊 Alpha Vantage service initialized with API key');
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private resetDailyCountIfNeeded(): void {
    const today = new Date().toDateString();
    if (today !== this.lastResetDate) {
      this.dailyCallCount = 0;
      this.lastResetDate = today;
      console.log('🔄 Alpha Vantage daily call count reset');
    }
  }

  private async makeRequest(params: Record<string, string>): Promise<Response> {
    this.resetDailyCountIfNeeded();

    if (this.dailyCallCount >= this.maxDailyCalls) {
      throw new Error('Alpha Vantage daily API limit reached (25 calls)');
    }

    // Rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequest;
    if (timeSinceLastRequest < this.requestDelay) {
      await this.delay(this.requestDelay - timeSinceLastRequest);
    }

    const url = new URL(this.baseUrl);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    if (this.apiKey) {
      url.searchParams.append('apikey', this.apiKey);
    } else {
      url.searchParams.append('apikey', 'demo'); // Use demo key for basic testing
    }

    const response = await fetch(url.toString());
    this.lastRequest = Date.now();
    this.dailyCallCount++;

    if (!response.ok) {
      throw new Error(`Alpha Vantage API error: ${response.status} ${response.statusText}`);
    }

    return response;
  }

  async getQuote(symbol: string): Promise<AlphaVantageQuote | null> {
    try {
      console.log(`📊 Getting Alpha Vantage quote for ${symbol}...`);

      const response = await this.makeRequest({
        function: 'GLOBAL_QUOTE',
        symbol: symbol
      });

      const data = await response.json() as {
        'Global Quote': {
          '01. symbol': string;
          '05. price': string;
          '09. change': string;
          '10. change percent': string;
          '06. volume': string;
          '08. previous close': string;
          '07. latest trading day': string;
        };
      };

      const quote = data['Global Quote'];
      if (!quote || !quote['01. symbol']) {
        console.log(`⚠️ No quote data for ${symbol}`);
        return null;
      }

      return {
        symbol: quote['01. symbol'],
        price: parseFloat(quote['05. price']),
        changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
        volume: parseInt(quote['06. volume']),
        previousClose: parseFloat(quote['08. previous close']),
        timestamp: new Date(quote['07. latest trading day'])
      };

    } catch (error) {
      console.error(`❌ Failed to get quote for ${symbol}:`, error);
      return null;
    }
  }

  async getEarningsCalendar(): Promise<EarningsData[]> {
    try {
      console.log('📊 Getting earnings calendar from Alpha Vantage...');

      const response = await this.makeRequest({
        function: 'EARNINGS_CALENDAR'
      });

      // Alpha Vantage returns CSV for earnings calendar
      const csvText = await response.text();
      const lines = csvText.split('\n');
      const earnings: EarningsData[] = [];

      // Parse CSV (skip header)
      for (let i = 1; i < lines.length && i < 50; i++) { // Limit to 50 entries
        const fields = lines[i].split(',');
        if (fields.length >= 4) {
          const [symbol, , reportDate, , estimate] = fields;
          
          if (symbol && reportDate && estimate) {
            earnings.push({
              symbol: symbol.trim(),
              reportDate: new Date(reportDate.trim()),
              estimate: parseFloat(estimate) || 0
            });
          }
        }
      }

      console.log(`✅ Alpha Vantage: Found ${earnings.length} upcoming earnings`);
      return earnings.slice(0, 20); // Return top 20

    } catch (error) {
      console.error('❌ Failed to get earnings calendar:', error);
      return [];
    }
  }

  async getEconomicIndicators(): Promise<EconomicIndicator[]> {
    try {
      console.log('📊 Getting economic indicators from Alpha Vantage...');

      const indicators: EconomicIndicator[] = [];

      // Get key economic indicators
      const indicatorParams = [
        { function: 'REAL_GDP', name: 'Real GDP' },
        { function: 'CPI', name: 'Consumer Price Index' },
        { function: 'INFLATION', name: 'Inflation Rate' },
        { function: 'UNEMPLOYMENT', name: 'Unemployment Rate' }
      ];

      for (const indicator of indicatorParams.slice(0, 2)) { // Limit to 2 to save API calls
        try {
          const response = await this.makeRequest({
            function: indicator.function,
            interval: 'monthly'
          });

          const data = await response.json() as {
            data: Array<{
              date: string;
              value: string;
            }>;
          };

          if (data.data && data.data.length > 0) {
            const latest = data.data[0];
            indicators.push({
              name: indicator.name,
              value: parseFloat(latest.value),
              date: new Date(latest.date),
              unit: indicator.function === 'CPI' ? 'Index' : '%'
            });
          }

        } catch (error) {
          console.warn(`⚠️ Failed to get ${indicator.name}:`, error);
        }
      }

      return indicators;

    } catch (error) {
      console.error('❌ Failed to get economic indicators:', error);
      return [];
    }
  }

  async getTechnicalIndicators(symbol: string): Promise<{
    rsi: number;
    sma20: number;
    sma50: number;
    macdSignal: string;
  } | null> {
    try {
      console.log(`📊 Getting technical indicators for ${symbol}...`);

      // Get RSI
      const rsiResponse = await this.makeRequest({
        function: 'RSI',
        symbol: symbol,
        interval: 'daily',
        time_period: '14',
        series_type: 'close'
      });

      const rsiData = await rsiResponse.json() as {
        'Technical Analysis: RSI': Record<string, { RSI: string }>;
      };

      let rsi = 50; // Default neutral
      if (rsiData['Technical Analysis: RSI']) {
        const rsiEntries = Object.entries(rsiData['Technical Analysis: RSI']);
        if (rsiEntries.length > 0) {
          rsi = parseFloat(rsiEntries[0][1].RSI);
        }
      }

      // Simple moving averages would require additional API calls
      // For now, return basic RSI analysis
      return {
        rsi,
        sma20: 0, // Would need additional call
        sma50: 0, // Would need additional call
        macdSignal: rsi > 70 ? 'SELL' : rsi < 30 ? 'BUY' : 'NEUTRAL'
      };

    } catch (error) {
      console.error(`❌ Failed to get technical indicators for ${symbol}:`, error);
      return null;
    }
  }

  async detectUnusualActivity(): Promise<AlphaVantageSignal[]> {
    try {
      console.log('📊 Detecting unusual market activity...');

      const signals: AlphaVantageSignal[] = [];

      // Get top gainers/losers (this endpoint is available without API key)
      const response = await this.makeRequest({
        function: 'TOP_GAINERS_LOSERS'
      });

      const data = await response.json() as {
        top_gainers: Array<{
          ticker: string;
          price: string;
          change_amount: string;
          change_percentage: string;
          volume: string;
        }>;
        top_losers: Array<{
          ticker: string;
          price: string;
          change_amount: string;
          change_percentage: string;
          volume: string;
        }>;
        most_actively_traded: Array<{
          ticker: string;
          price: string;
          change_amount: string;
          change_percentage: string;
          volume: string;
        }>;
      };

      // Process top gainers (unusual upward movement)
      if (data.top_gainers) {
        data.top_gainers.slice(0, 5).forEach(stock => {
          const changePercent = parseFloat(stock.change_percentage.replace('%', ''));
          if (changePercent > 10) { // Significant gain
            signals.push({
              ticker: stock.ticker,
              type: "Stock",
              signalType: "unusual_volume",
              confidence: Math.min(90, 60 + changePercent),
              summary: `${stock.ticker} up ${changePercent.toFixed(1)}% with high volume`,
              metadata: {
                changePercent,
                volume: parseInt(stock.volume),
                price: parseFloat(stock.price)
              },
              source: "Alpha Vantage",
              timestamp: new Date()
            });
          }
        });
      }

      // Process most actively traded (volume spikes)
      if (data.most_actively_traded) {
        data.most_actively_traded.slice(0, 3).forEach(stock => {
          const volume = parseInt(stock.volume);
          if (volume > 10000000) { // High volume threshold
            signals.push({
              ticker: stock.ticker,
              type: "Stock",
              signalType: "unusual_volume",
              confidence: 70,
              summary: `${stock.ticker} showing unusual volume: ${(volume / 1000000).toFixed(1)}M shares`,
              metadata: {
                volume,
                changePercent: parseFloat(stock.change_percentage.replace('%', '')),
                price: parseFloat(stock.price)
              },
              source: "Alpha Vantage",
              timestamp: new Date()
            });
          }
        });
      }

      console.log(`✅ Alpha Vantage: Found ${signals.length} unusual activity signals`);
      return signals;

    } catch (error) {
      console.error('❌ Failed to detect unusual activity:', error);
      return [];
    }
  }

  async getEarningsSignals(): Promise<AlphaVantageSignal[]> {
    try {
      const earnings = await this.getEarningsCalendar();
      const signals: AlphaVantageSignal[] = [];

      // Look for earnings in next 7 days
      const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      
      earnings.forEach(earning => {
        if (earning.reportDate <= sevenDaysFromNow) {
          const daysUntil = Math.ceil((earning.reportDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          
          signals.push({
            ticker: earning.symbol,
            type: "Stock",
            signalType: "earnings_surprise",
            confidence: 60 + (7 - daysUntil) * 5, // Higher confidence for sooner earnings
            summary: `${earning.symbol} reports earnings in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`,
            metadata: {
              reportDate: earning.reportDate,
              estimate: earning.estimate,
              daysUntil
            },
            source: "Alpha Vantage",
            timestamp: new Date()
          });
        }
      });

      console.log(`✅ Alpha Vantage: Found ${signals.length} upcoming earnings signals`);
      return signals;

    } catch (error) {
      console.error('❌ Failed to get earnings signals:', error);
      return [];
    }
  }

  getRemainingCalls(): number {
    this.resetDailyCountIfNeeded();
    return Math.max(0, this.maxDailyCalls - this.dailyCallCount);
  }

  getUsageStats(): {
    dailyCallsUsed: number;
    dailyCallsRemaining: number;
    lastResetDate: string;
    hasApiKey: boolean;
  } {
    this.resetDailyCountIfNeeded();
    
    return {
      dailyCallsUsed: this.dailyCallCount,
      dailyCallsRemaining: this.getRemainingCalls(),
      lastResetDate: this.lastResetDate,
      hasApiKey: !!this.apiKey
    };
  }
}

export const alphaVantageService = new AlphaVantageService();