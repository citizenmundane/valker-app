import { TechnicalAnalysis, TechnicalIndicator, TechnicalAnalysisProvider } from './priceProviders/types';

interface TaapiResponse {
  value?: number;
  result?: number;
  error?: string;
  signal?: string;
}

const TAAPI_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjbHVlIjoiNjg2MzA0OWI4MDZmZjE2NTFlYTIxYzYxIiwiaWF0IjoxNzUxMzE5NzQ5LCJleHAiOjMzMjU1NzgzNzQ5fQ.ZpD8Kb5HSsACNE8IX_zxVxykZQLXXEpPvrhFzTGX0eo';
const TAAPI_BASE_URL = 'https://api.taapi.io';

export class TaapiProvider implements TechnicalAnalysisProvider {
  private requestCount = 0;
  private lastRequest = 0;
  private readonly rateLimit = 100; // requests per minute
  private readonly rateLimitWindow = 60000; // 1 minute in ms

  private async makeRequest(endpoint: string, params: Record<string, unknown> = {}): Promise<TaapiResponse> {
    // Rate limiting
    const now = Date.now();
    if (now - this.lastRequest < this.rateLimitWindow / this.rateLimit) {
      const delay = (this.rateLimitWindow / this.rateLimit) - (now - this.lastRequest);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    const url = new URL(`${TAAPI_BASE_URL}${endpoint}`);
    url.searchParams.append('secret', TAAPI_API_KEY);
    
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value.toString());
    });

    try {
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`taapi.io API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      this.requestCount++;
      this.lastRequest = Date.now();

      return data;
    } catch (error) {
      console.error(`❌ taapi.io API request failed:`, error);
      throw error;
    }
  }

  async fetchIndicator(symbol: string, indicator: string, params: Record<string, unknown> = {}): Promise<TechnicalIndicator | null> {
    try {
      const data = await this.makeRequest(`/${indicator}`, {
        symbol: symbol,
        exchange: 'binance', // Default to crypto exchange
        interval: '1h',
        ...params
      });

      if (!data || data.error) {
        console.warn(`⚠️ taapi.io indicator ${indicator} failed for ${symbol}:`, data?.error);
        return null;
      }

      return {
        symbol: symbol,
        indicator: indicator,
        value: data.value || data.result || 0,
        signal: this.interpretSignal(data),
        timestamp: new Date()
      };
    } catch (error) {
      console.error(`❌ Failed to fetch ${indicator} for ${symbol}:`, error);
      return null;
    }
  }

  async fetchTechnicalAnalysis(symbol: string): Promise<TechnicalAnalysis | null> {
    try {
      console.log(`📊 Fetching technical analysis for ${symbol}...`);

      // Fetch multiple indicators in parallel
      const [
        rsiData,
        macdData,
        sma20Data,
        sma50Data,
        sma200Data,
        ema12Data,
        ema26Data,
        bbData,
        stochData
      ] = await Promise.allSettled([
        this.fetchIndicator(symbol, 'rsi', { period: 14 }),
        this.fetchIndicator(symbol, 'macd', { fast: 12, slow: 26, signal: 9 }),
        this.fetchIndicator(symbol, 'sma', { period: 20 }),
        this.fetchIndicator(symbol, 'sma', { period: 50 }),
        this.fetchIndicator(symbol, 'sma', { period: 200 }),
        this.fetchIndicator(symbol, 'ema', { period: 12 }),
        this.fetchIndicator(symbol, 'ema', { period: 26 }),
        this.fetchIndicator(symbol, 'bbands', { period: 20 }),
        this.fetchIndicator(symbol, 'stoch', { k: 14, d: 3 })
      ]);

      const analysis: TechnicalAnalysis = {
        symbol: symbol,
        timestamp: new Date()
      };

      // Process RSI
      if (rsiData.status === 'fulfilled' && rsiData.value) {
        analysis.rsi = rsiData.value.value;
      }

      // Process MACD
      if (macdData.status === 'fulfilled' && macdData.value) {
        const macdResult = macdData.value;
        analysis.macd = {
          macd: macdResult.value || 0,
          signal: 0,
          histogram: 0
        };
      }

      // Process SMAs
      if (sma20Data.status === 'fulfilled' && sma20Data.value) {
        analysis.sma = {
          sma20: sma20Data.value.value,
          sma50: sma50Data.status === 'fulfilled' ? sma50Data.value?.value || 0 : 0,
          sma200: sma200Data.status === 'fulfilled' ? sma200Data.value?.value || 0 : 0
        };
      }

      // Process EMAs
      if (ema12Data.status === 'fulfilled' && ema12Data.value) {
        analysis.ema = {
          ema12: ema12Data.value.value,
          ema26: ema26Data.status === 'fulfilled' ? ema26Data.value?.value || 0 : 0
        };
      }

      // Process Bollinger Bands
      if (bbData.status === 'fulfilled' && bbData.value) {
        const bbResult = bbData.value;
        analysis.bollinger = {
          upper: bbResult.value || 0,
          middle: 0,
          lower: 0
        };
      }

      // Process Stochastic
      if (stochData.status === 'fulfilled' && stochData.value) {
        const stochResult = stochData.value;
        // Stochastic returns separate K and D values
        analysis.stoch = {
          k: stochResult.value || 0,
          d: 0 // Would need separate API call for %D line
        };
      }

      console.log(`✅ Technical analysis completed for ${symbol}`);
      return analysis;

    } catch (error) {
      console.error(`❌ Failed to fetch technical analysis for ${symbol}:`, error);
      return null;
    }
  }

  private interpretSignal(data: TaapiResponse): 'buy' | 'sell' | 'neutral' {
    // Basic signal interpretation based on indicator values
    if (data.signal) {
      return data.signal.toLowerCase() as 'buy' | 'sell' | 'neutral';
    }

    // RSI interpretation
    if (data.value !== undefined) {
      if (data.value > 70) return 'sell';
      if (data.value < 30) return 'buy';
    }

    return 'neutral';
  }

  getStatus() {
    return {
      name: 'taapi.io',
      enabled: true,
      hasApiKey: !!TAAPI_API_KEY,
      successRate: 0.95, // Placeholder
      avgResponseTime: 500, // Placeholder
      requestsToday: this.requestCount,
      rateLimitRemaining: this.rateLimit - (this.requestCount % this.rateLimit),
      lastUsed: this.lastRequest ? new Date(this.lastRequest) : null
    };
  }

  /**
   * Test the taapi.io API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('🧪 Testing taapi.io API connection...');
      
      // Test with a simple RSI request for BTC
      const testResult = await this.fetchIndicator('BTC', 'rsi', { period: 14 });
      
      if (testResult && testResult.value !== undefined) {
        console.log('✅ taapi.io API test successful:', testResult);
        return true;
      } else {
        console.warn('⚠️ taapi.io API test returned no data');
        return false;
      }
    } catch (error) {
      console.error('❌ taapi.io API test failed:', error);
      return false;
    }
  }
}

export const taapiProvider = new TaapiProvider();