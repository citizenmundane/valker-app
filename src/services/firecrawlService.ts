import { assetDB } from '../data/database';

// Firecrawl MCP Configuration
const FIRECRAWL_API_KEY = import.meta.env.VITE_FIRECRAWL_API_KEY;
const FIRECRAWL_BASE_URL = 'https://api.firecrawl.dev';

export interface ScrapedData {
  url: string;
  title?: string;
  content?: string;
  text?: string;
  metadata?: {
    title?: string;
    description?: string;
    author?: string;
    publishedTime?: string;
    image?: string;
  };
  timestamp: Date;
}

export interface ScrapingResult {
  success: boolean;
  data?: ScrapedData;
  error?: string;
  source: string;
}

export interface NewsArticle {
  title: string;
  content: string;
  url: string;
  publishedAt: string;
  source: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  relevance: number; // 0-1 score
}

export interface SocialMention {
  platform: 'twitter' | 'reddit' | 'discord' | 'telegram' | 'other';
  content: string;
  url: string;
  author?: string;
  timestamp: Date;
  engagement?: {
    likes?: number;
    shares?: number;
    comments?: number;
  };
  sentiment: 'positive' | 'negative' | 'neutral';
}

export class FirecrawlService {
  private requestCount = 0;
  private lastRequest = 0;
  private readonly rateLimit = 50; // requests per minute
  private readonly rateLimitWindow = 60000; // 1 minute in ms

  private async makeRequest(endpoint: string, params: Record<string, any> = {}): Promise<any> {
    // Rate limiting
    const now = Date.now();
    if (now - this.lastRequest < this.rateLimitWindow / this.rateLimit) {
      const delay = (this.rateLimitWindow / this.rateLimit) - (now - this.lastRequest);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    const url = new URL(`${FIRECRAWL_BASE_URL}${endpoint}`);
    
    const requestBody = {
      apiKey: FIRECRAWL_API_KEY,
      ...params
    };

    try {
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        throw new Error(`Firecrawl API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      this.requestCount++;
      this.lastRequest = Date.now();

      return data;
    } catch (error) {
      console.error(`❌ Firecrawl API request failed:`, error);
      throw error;
    }
  }

  /**
   * Scrape a single URL for content
   */
  async scrapeUrl(url: string, options: {
    includeHtml?: boolean;
    includeImages?: boolean;
    includeLinks?: boolean;
  } = {}): Promise<ScrapingResult> {
    try {
      console.log(`🌐 Scraping URL: ${url}`);

      const data = await this.makeRequest('/scrape', {
        url: url,
        includeHtml: options.includeHtml || false,
        includeImages: options.includeImages || false,
        includeLinks: options.includeLinks || false,
        waitFor: 2000, // Wait for dynamic content
        screenshot: false,
        pdf: false
      });

      if (!data || data.error) {
        return {
          success: false,
          error: data?.error || 'Unknown error',
          source: url
        };
      }

      return {
        success: true,
        data: {
          url: url,
          title: data.data?.title,
          content: data.data?.content,
          text: data.data?.text,
          metadata: data.data?.metadata,
          timestamp: new Date()
        },
        source: url
      };

    } catch (error) {
      console.error(`❌ Failed to scrape ${url}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        source: url
      };
    }
  }

  /**
   * Search for news articles about a specific ticker
   */
  async searchNews(ticker: string, limit: number = 10): Promise<NewsArticle[]> {
    try {
      console.log(`📰 Searching news for ${ticker}...`);

      // Search multiple news sources
      const searchQueries = [
        `${ticker} stock news`,
        `${ticker} cryptocurrency news`,
        `${ticker} price analysis`,
        `${ticker} market update`
      ];

      const newsArticles: NewsArticle[] = [];

      for (const query of searchQueries.slice(0, 2)) { // Limit to avoid rate limits
        try {
          const data = await this.makeRequest('/search', {
            query: query,
            numResults: Math.ceil(limit / 2),
            includeDomains: [
              'reuters.com',
              'bloomberg.com',
              'cnbc.com',
              'marketwatch.com',
              'yahoo.com',
              'coindesk.com',
              'cointelegraph.com',
              'decrypt.co'
            ],
            excludeDomains: [
              'youtube.com',
              'facebook.com',
              'twitter.com'
            ]
          });

          if (data && data.results) {
            for (const result of data.results) {
              // Scrape the actual article content
              const scrapedData = await this.scrapeUrl(result.url);
              
              if (scrapedData.success && scrapedData.data) {
                const sentiment = this.analyzeSentiment(scrapedData.data.text || '');
                const relevance = this.calculateRelevance(ticker, scrapedData.data.text || '');

                newsArticles.push({
                  title: scrapedData.data.title || result.title || 'No Title',
                  content: scrapedData.data.text || scrapedData.data.content || '',
                  url: result.url,
                  publishedAt: scrapedData.data.metadata?.publishedTime || new Date().toISOString(),
                  source: new URL(result.url).hostname,
                  sentiment,
                  relevance
                });
              }
            }
          }
        } catch (error) {
          console.warn(`⚠️ News search failed for query "${query}":`, error);
        }
      }

      // Sort by relevance and recency
      newsArticles.sort((a, b) => {
        const relevanceDiff = b.relevance - a.relevance;
        if (Math.abs(relevanceDiff) > 0.1) return relevanceDiff;
        
        const dateA = new Date(a.publishedAt);
        const dateB = new Date(b.publishedAt);
        return dateB.getTime() - dateA.getTime();
      });

      console.log(`✅ Found ${newsArticles.length} news articles for ${ticker}`);
      return newsArticles.slice(0, limit);

    } catch (error) {
      console.error(`❌ News search failed for ${ticker}:`, error);
      return [];
    }
  }

  /**
   * Search for social media mentions
   */
  async searchSocialMentions(ticker: string, platforms: string[] = ['twitter', 'reddit']): Promise<SocialMention[]> {
    try {
      console.log(`📱 Searching social mentions for ${ticker}...`);

      const mentions: SocialMention[] = [];

      for (const platform of platforms) {
        try {
          const query = `${ticker} ${platform === 'twitter' ? 'crypto' : 'stock'}`;
          
          const data = await this.makeRequest('/search', {
            query: query,
            numResults: 5,
            includeDomains: this.getPlatformDomains(platform)
          });

          if (data && data.results) {
            for (const result of data.results) {
              const scrapedData = await this.scrapeUrl(result.url);
              
              if (scrapedData.success && scrapedData.data) {
                const sentiment = this.analyzeSentiment(scrapedData.data.text || '');
                
                mentions.push({
                  platform: platform as any,
                  content: scrapedData.data.text || scrapedData.data.content || '',
                  url: result.url,
                  author: this.extractAuthor(result.url, platform),
                  timestamp: new Date(),
                  sentiment
                });
              }
            }
          }
        } catch (error) {
          console.warn(`⚠️ Social search failed for ${platform}:`, error);
        }
      }

      console.log(`✅ Found ${mentions.length} social mentions for ${ticker}`);
      return mentions;

    } catch (error) {
      console.error(`❌ Social mentions search failed for ${ticker}:`, error);
      return [];
    }
  }

  /**
   * Analyze sentiment of text content
   */
  private analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' {
    const positiveWords = [
      'bullish', 'moon', 'pump', 'surge', 'rally', 'gain', 'profit', 'buy', 'long',
      'positive', 'good', 'great', 'excellent', 'strong', 'up', 'rise', 'growth'
    ];
    
    const negativeWords = [
      'bearish', 'dump', 'crash', 'drop', 'fall', 'loss', 'sell', 'short',
      'negative', 'bad', 'terrible', 'weak', 'down', 'decline', 'bear'
    ];

    const words = text.toLowerCase().split(/\s+/);
    let positiveCount = 0;
    let negativeCount = 0;

    for (const word of words) {
      if (positiveWords.includes(word)) positiveCount++;
      if (negativeWords.includes(word)) negativeCount++;
    }

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  /**
   * Calculate relevance score for a ticker in text
   */
  private calculateRelevance(ticker: string, text: string): number {
    const tickerRegex = new RegExp(`\\b${ticker}\\b`, 'gi');
    const matches = text.match(tickerRegex);
    
    if (!matches) return 0;
    
    // Base relevance on frequency and text length
    const frequency = matches.length / text.split(/\s+/).length;
    const lengthFactor = Math.min(text.length / 1000, 1); // Normalize by text length
    
    return Math.min(frequency * 10 + lengthFactor * 0.5, 1);
  }

  /**
   * Get domain list for specific platforms
   */
  private getPlatformDomains(platform: string): string[] {
    switch (platform) {
      case 'twitter':
        return ['twitter.com', 'x.com'];
      case 'reddit':
        return ['reddit.com'];
      case 'discord':
        return ['discord.com', 'discord.gg'];
      case 'telegram':
        return ['t.me', 'telegram.org'];
      default:
        return [];
    }
  }

  /**
   * Extract author from URL
   */
  private extractAuthor(url: string, platform: string): string | undefined {
    try {
      const urlObj = new URL(url);
      switch (platform) {
        case 'twitter':
          return urlObj.pathname.split('/')[1];
        case 'reddit':
          return urlObj.pathname.split('/')[2];
        default:
          return undefined;
      }
    } catch {
      return undefined;
    }
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      name: 'Firecrawl MCP',
      enabled: true,
      hasApiKey: !!FIRECRAWL_API_KEY,
      successRate: 0.90, // Placeholder
      avgResponseTime: 2000, // Placeholder
      requestsToday: this.requestCount,
      rateLimitRemaining: this.rateLimit - (this.requestCount % this.rateLimit),
      lastUsed: this.lastRequest ? new Date(this.lastRequest) : null
    };
  }

  /**
   * Test the Firecrawl API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('🧪 Testing Firecrawl API connection...');
      
      // Test with a simple scrape of a known page
      const testResult = await this.scrapeUrl('https://example.com');
      
      if (testResult.success && testResult.data) {
        console.log('✅ Firecrawl API test successful:', testResult.data);
        return true;
      } else {
        console.warn('⚠️ Firecrawl API test returned no data');
        return false;
      }
    } catch (error) {
      console.error('❌ Firecrawl API test failed:', error);
      return false;
    }
  }
}

export const firecrawlService = new FirecrawlService(); 