interface InsiderTrade {
  ticker: string;
  company: string;
  insider: string;
  title: string;
  transactionDate: Date;
  transactionType: 'P' | 'S' | 'A' | 'D'; // Purchase, Sale, Acquisition, Disposition
  sharesTraded: number;
  pricePerShare: number;
  totalValue: number;
  ownershipType: 'D' | 'I'; // Direct or Indirect
  filingDate: Date;
  formType: string;
  isOfficer: boolean;
  isDirector: boolean;
  isTenPercentOwner: boolean;
  confidence: number; // Signal quality 0-100
}

// interface _SECFilingData {
//   ticker: string;
//   cik: string;
//   filingDate: Date;
//   formType: string;
//   reportDate: Date;
//   acceptanceDateTime: string;
//   filingUrl: string;
//   company: string;
// }

interface InsiderSignal {
  ticker: string;
  type: "Stock";
  signalType: "insider_buying" | "insider_selling" | "unusual_activity";
  confidence: number;
  trades: InsiderTrade[];
  summary: string;
  totalValue: number;
  netBuying: number; // Net buying vs selling
  officerActivity: boolean;
  directorActivity: boolean;
  clusteredActivity: boolean; // Multiple insiders trading
  source: "SEC EDGAR";
}

export class SECEdgarService {
  private readonly baseUrl = 'https://data.sec.gov';
  private readonly requestDelay = 100; // SEC allows 10 requests per second
  private readonly userAgent = 'Valker Trading App contact@example.com'; // Required by SEC
  private lastRequest = 0;

  constructor() {
    console.log('📋 SEC EDGAR Service initialized');
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async makeRequest(endpoint: string): Promise<Response> {
    // Rate limiting for SEC API
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequest;
    if (timeSinceLastRequest < this.requestDelay) {
      await this.delay(this.requestDelay - timeSinceLastRequest);
    }
    this.lastRequest = Date.now();

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        'User-Agent': this.userAgent,
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Host': 'data.sec.gov'
      }
    });

    if (!response.ok) {
      throw new Error(`SEC API error: ${response.status} ${response.statusText}`);
    }

    return response;
  }

  private parseForm4Data(_filingData: unknown): InsiderTrade[] {
    // Parse Form 4 insider trading data
    // This would require XML parsing of actual filing data
    // For now, returning mock structure - would need full implementation
    const trades: InsiderTrade[] = [];
    
    // TODO: Implement actual Form 4 XML parsing
    // This requires parsing EDGAR SGML/XML format
    
    return trades;
  }

  private calculateSignalConfidence(trades: InsiderTrade[]): number {
    let confidence = 50; // Base confidence

    // Boost confidence for officer/director trades
    const officerTrades = trades.filter(t => t.isOfficer || t.isDirector);
    if (officerTrades.length > 0) {
      confidence += 20;
    }

    // Boost for large trades
    const largeTrades = trades.filter(t => t.totalValue > 100000);
    if (largeTrades.length > 0) {
      confidence += 15;
    }

    // Boost for clustered activity (multiple insiders)
    const uniqueInsiders = new Set(trades.map(t => t.insider)).size;
    if (uniqueInsiders > 1) {
      confidence += 10;
    }

    // Boost for recent trades
    const recentTrades = trades.filter(t => {
      const daysSince = (Date.now() - t.transactionDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince <= 5;
    });
    if (recentTrades.length > 0) {
      confidence += 15;
    }

    return Math.min(100, confidence);
  }

  private generateTradeSummary(trades: InsiderTrade[]): string {
    const buyTrades = trades.filter(t => t.transactionType === 'P' || t.transactionType === 'A');
    const sellTrades = trades.filter(t => t.transactionType === 'S' || t.transactionType === 'D');
    
    const totalBuyValue = buyTrades.reduce((sum, t) => sum + t.totalValue, 0);
    const totalSellValue = sellTrades.reduce((sum, t) => sum + t.totalValue, 0);
    const netBuying = totalBuyValue - totalSellValue;

    const officers = trades.filter(t => t.isOfficer);
    const directors = trades.filter(t => t.isDirector);

    let summary = `SEC insider activity detected: `;
    
    if (netBuying > 0) {
      summary += `Net buying of $${(netBuying / 1000000).toFixed(1)}M. `;
    } else {
      summary += `Net selling of $${(Math.abs(netBuying) / 1000000).toFixed(1)}M. `;
    }

    if (officers.length > 0) {
      summary += `${officers.length} officer${officers.length > 1 ? 's' : ''} involved. `;
    }
    
    if (directors.length > 0) {
      summary += `${directors.length} director${directors.length > 1 ? 's' : ''} involved. `;
    }

    const recentTradesCount = trades.filter(t => {
      const daysSince = (Date.now() - t.transactionDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince <= 7;
    }).length;

    if (recentTradesCount > 0) {
      summary += `${recentTradesCount} trade${recentTradesCount > 1 ? 's' : ''} in past week.`;
    }

    return summary;
  }

  async getRecentInsiderTrading(daysBack: number = 7): Promise<InsiderSignal[]> {
    try {
      console.log(`📋 Scanning SEC filings for insider trading (${daysBack} days)...`);

      // Get recent Form 4 filings
      await this.makeRequest('/api/xbrl/companyfacts');
      
      // Note: This is a simplified example. The actual SEC API structure 
      // requires different endpoints and data parsing
      const signals: InsiderSignal[] = [];
      
      // TODO: Implement actual Form 4 scanning
      // This would involve:
      // 1. Getting recent Form 4 filings from /submissions endpoint
      // 2. Parsing XML/SGML filing data  
      // 3. Extracting insider transaction details
      // 4. Grouping by ticker and analyzing patterns

      console.log(`✅ SEC EDGAR: Found ${signals.length} insider trading signals`);
      return signals;

    } catch (error) {
      console.error('❌ SEC EDGAR scan failed:', error);
      return [];
    }
  }

  async getTickerInsiderActivity(ticker: string, _daysBack: number = 30): Promise<InsiderSignal | null> {
    try {
      console.log(`📋 Getting insider activity for ${ticker}...`);

      // Get company CIK for the ticker
      const cikResponse = await this.makeRequest('/files/company_tickers.json');
      const companyData = await cikResponse.json() as Record<string, { cik_str: string; ticker: string; title: string }>;
      
      // Find CIK for ticker
      const company = Object.values(companyData).find(c => 
        c.ticker.toUpperCase() === ticker.toUpperCase()
      );

      if (!company) {
        console.log(`ℹ️ No CIK found for ${ticker}`);
        return null;
      }

      const cik = company.cik_str.padStart(10, '0');
      
      // Get recent submissions for this company
      const submissionsResponse = await this.makeRequest(`/submissions/CIK${cik}.json`);
      const submissions = await submissionsResponse.json() as {
        filings: {
          recent: {
            form: string[];
            filingDate: string[];
            accessionNumber: string[];
            reportDate: string[];
          };
        };
      };

      // Filter for Form 4 (insider trading) filings
      const form4Indices = submissions.filings.recent.form
        .map((form, index) => ({ form, index }))
        .filter(item => item.form === '4')
        .slice(0, 10); // Get last 10 Form 4 filings

      if (form4Indices.length === 0) {
        return null;
      }

      // TODO: Parse actual Form 4 data
      // For now, return a mock signal structure
      const mockSignal: InsiderSignal = {
        ticker,
        type: "Stock",
        signalType: "insider_buying",
        confidence: 75,
        trades: [],
        summary: `Recent insider activity detected for ${ticker}`,
        totalValue: 0,
        netBuying: 0,
        officerActivity: false,
        directorActivity: false,
        clusteredActivity: false,
        source: "SEC EDGAR"
      };

      return mockSignal;

    } catch (error) {
      console.error(`❌ Failed to get insider activity for ${ticker}:`, error);
      return null;
    }
  }

  async getUnusualInsiderActivity(): Promise<InsiderSignal[]> {
    // Scan for unusual patterns in insider trading
    const signals: InsiderSignal[] = [];
    
    try {
      // Look for:
      // 1. Multiple insiders buying/selling same stock
      // 2. Large transactions by officers/directors
      // 3. Unusual timing (before earnings, etc.)
      // 4. Pattern changes (insider who usually holds starts selling)

      console.log('📋 Scanning for unusual insider trading patterns...');
      
      // TODO: Implement pattern detection logic
      
      return signals;
    } catch (error) {
      console.error('❌ Unusual insider activity scan failed:', error);
      return [];
    }
  }

  // Helper method to get company info by ticker
  async getCompanyInfo(ticker: string): Promise<{ cik: string; name: string } | null> {
    try {
      const response = await this.makeRequest('/files/company_tickers.json');
      const companies = await response.json() as Record<string, { cik_str: string; ticker: string; title: string }>;
      
      const company = Object.values(companies).find(c => 
        c.ticker.toUpperCase() === ticker.toUpperCase()
      );

      if (company) {
        return {
          cik: company.cik_str,
          name: company.title
        };
      }

      return null;
    } catch (error) {
      console.error(`❌ Failed to get company info for ${ticker}:`, error);
      return null;
    }
  }

  // Get trending tickers based on recent insider activity
  async getTrendingInsiderTickers(daysBack: number = 7): Promise<string[]> {
    try {
      console.log(`📋 Finding trending tickers with insider activity (${daysBack} days)...`);
      
      const signals = await this.getRecentInsiderTrading(daysBack);
      
      // Count activity by ticker
      const tickerActivity = new Map<string, number>();
      signals.forEach(signal => {
        const current = tickerActivity.get(signal.ticker) || 0;
        tickerActivity.set(signal.ticker, current + signal.confidence);
      });

      // Return top tickers by activity score
      return Array.from(tickerActivity.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 20)
        .map(([ticker]) => ticker);

    } catch (error) {
      console.error('❌ Failed to get trending insider tickers:', error);
      return [];
    }
  }
}

export const secEdgarService = new SECEdgarService();