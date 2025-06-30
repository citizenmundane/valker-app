// AI Prediction Service for Valker

// import { PredictionSignal, PredictionInput } from "../types/Prediction"; // TODO: adjust import if needed

import { taapiProvider } from './taapiProvider';
import { firecrawlService, NewsArticle, SocialMention } from './firecrawlService';

interface PredictionSignal {
  ticker: string;
  type: "Stock" | "Coin";
  confidence: number; // 0-100
  prediction: "Bullish" | "Bearish" | "Neutral";
  timeframe: "24h" | "7d" | "30d";
  reasoning: string[];
  riskLevel: "Low" | "Medium" | "High";
  expectedMove: number; // Expected percentage change
  signals: {
    socialMomentum: number;
    volumeSpike: number;
    sentimentShift: number;
    technicalScore: number;
  };
}

interface PredictionInput {
  ticker: string;
  type: "Stock" | "Coin";
  currentPrice?: number;
  volume24h?: number;
  socialMentions: number;
  sentimentScore: number;
  priceChange24h: number;
  priceChange7d: number;
  unusualVolume: boolean;
  memeScore: number;
  politicalScore: number;
  earningsScore: number;
}

// TODO: Set your Groq API key in a .env file as VITE_GROQ_API_KEY=your_key_here
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

export class PredictionService {
  private readonly confidenceThreshold = 70;
  private readonly riskThresholds = {
    low: 30,
    medium: 60,
    high: 100,
  };

  /**
   * Generate AI predictions based on current market data and trends
   */
  async generatePredictions(
    assets: PredictionInput[],
  ): Promise<PredictionSignal[]> {
    console.log("🧠 Generating AI predictions...");

    const predictions: PredictionSignal[] = [];

    for (const asset of assets) {
      try {
        console.log(`📊 Analyzing ${asset.ticker}...`);
        const prediction = await this.analyzeAsset(asset);

        // Always include predictions, but mark low confidence ones
        if (prediction.confidence >= this.confidenceThreshold) {
          console.log(
            `✅ High confidence prediction for ${asset.ticker}: ${prediction.confidence}%`,
          );
        } else {
          console.log(
            `⚠️ Low confidence prediction for ${asset.ticker}: ${prediction.confidence}%`,
          );
        }

        predictions.push(prediction);
      } catch (error) {
        console.warn(`⚠️ Failed to predict ${asset.ticker}:`, error);

        // Create a fallback prediction
        const fallbackPrediction: PredictionSignal = {
          ticker: asset.ticker,
          type: asset.type,
          confidence: 30,
          prediction: "Neutral",
          timeframe: "7d",
          reasoning: ["Prediction analysis failed - using fallback"],
          riskLevel: "High",
          expectedMove: 0,
          signals: {
            socialMomentum: 0,
            volumeSpike: 0,
            sentimentShift: 0,
            technicalScore: 0,
          },
        };

        predictions.push(fallbackPrediction);
      }
    }

    // Sort by confidence and expected move
    predictions.sort((a, b) => {
      const scoreA = a.confidence * Math.abs(a.expectedMove);
      const scoreB = b.confidence * Math.abs(b.expectedMove);
      return scoreB - scoreA;
    });

    console.log(`✅ Generated ${predictions.length} predictions`);
    return predictions;
  }

  /**
   * Analyze individual asset for prediction signals
   */
  private async analyzeAsset(
    asset: PredictionInput,
  ): Promise<PredictionSignal> {
    // Try Groq LLM first
    const groqPrediction = await this.callGroqLLM(asset);
    if (groqPrediction) return groqPrediction;
    // Fallback to old logic

    // Calculate various signal components
    const socialMomentum = this.calculateSocialMomentum(asset);
    const volumeSpike = this.calculateVolumeSpike(asset);
    const sentimentShift = this.calculateSentimentShift(asset);
    const technicalScore = await this.calculateTechnicalScore(asset);

    // Combine signals for overall prediction
    const combinedScore = this.combineSignals({
      socialMomentum,
      volumeSpike,
      sentimentShift,
      technicalScore,
    });

    // Determine prediction direction and confidence
    const prediction = this.determinePrediction(combinedScore);
    const confidence = this.calculateConfidence(combinedScore);
    const expectedMove = this.calculateExpectedMove(combinedScore, asset);
    const riskLevel = this.calculateRiskLevel(asset);

    // Generate reasoning
    const reasoning = this.generateReasoning(asset, {
      socialMomentum,
      volumeSpike,
      sentimentShift,
      technicalScore,
    });

    return {
      ticker: asset.ticker,
      type: asset.type,
      confidence,
      prediction: prediction.direction,
      timeframe: prediction.timeframe,
      reasoning,
      riskLevel,
      expectedMove,
      signals: {
        socialMomentum,
        volumeSpike,
        sentimentShift,
        technicalScore,
      },
    };
  }

  /**
   * Calculate social momentum based on mentions and sentiment
   */
  private calculateSocialMomentum(asset: PredictionInput): number {
    let score = 0;

    // High social mentions indicate momentum
    if (asset.socialMentions > 1000) score += 30;
    else if (asset.socialMentions > 500) score += 20;
    else if (asset.socialMentions > 100) score += 10;

    // Positive sentiment boosts momentum
    if (asset.sentimentScore > 0.7) score += 25;
    else if (asset.sentimentScore > 0.5) score += 15;
    else if (asset.sentimentScore < 0.3) score -= 10;

    // Meme score indicates viral potential
    score += asset.memeScore * 5;

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Calculate volume spike signals
   */
  private calculateVolumeSpike(asset: PredictionInput): number {
    let score = 0;

    // Unusual volume is a strong signal
    if (asset.unusualVolume) score += 40;

    // Recent price movement with volume
    if (Math.abs(asset.priceChange24h) > 5) score += 20;
    if (Math.abs(asset.priceChange7d) > 15) score += 15;

    // Political/earnings signals
    if (asset.politicalScore > 0) score += 10;
    if (asset.earningsScore > 0) score += 10;

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Calculate sentiment shift patterns
   */
  private calculateSentimentShift(asset: PredictionInput): number {
    let score = 0;

    // Strong positive sentiment
    if (asset.sentimentScore > 0.8) score += 35;
    else if (asset.sentimentScore > 0.6) score += 25;
    else if (asset.sentimentScore < 0.4) score -= 15;

    // Recent positive price movement
    if (asset.priceChange24h > 3) score += 20;
    if (asset.priceChange7d > 10) score += 15;

    // High meme score indicates viral potential
    if (asset.memeScore >= 3) score += 15;

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Calculate technical analysis score
   */
  private async calculateTechnicalScore(asset: PredictionInput): Promise<number> {
    // Enhanced technical score using taapi.io data
    let score = 50; // Base score

    // Try to get technical analysis data
    try {
      const analysis = await taapiProvider.fetchTechnicalAnalysis(asset.ticker);
      
      if (analysis) {
        // RSI analysis
        if (analysis.rsi) {
          if (analysis.rsi < 30) score += 20; // Oversold - bullish
          else if (analysis.rsi > 70) score -= 20; // Overbought - bearish
          else if (analysis.rsi > 50) score += 10; // Above midline - slightly bullish
        }

        // MACD analysis
        if (analysis.macd) {
          if (analysis.macd.macd > 0) score += 15; // MACD above zero
          if (analysis.macd.histogram > 0) score += 10; // Positive histogram
        }

        // Moving average analysis
        if (analysis.sma) {
          if (analysis.sma.sma20 > analysis.sma.sma50) score += 10; // Golden cross
          if (analysis.sma.sma50 > analysis.sma.sma200) score += 15; // Long-term uptrend
        }

        // Bollinger Bands analysis
        if (analysis.bollinger) {
          // Would need current price to compare with bands
          // For now, use basic momentum
          score += 5;
        }

        // Stochastic analysis
        if (analysis.stoch) {
          if (analysis.stoch.k < 20) score += 15; // Oversold
          else if (analysis.stoch.k > 80) score -= 15; // Overbought
        }
      }

      // Fallback to basic analysis if no technical data
      if (!analysis) {
        // Price momentum
        if (asset.priceChange24h > 5) score += 20;
        else if (asset.priceChange24h > 2) score += 10;
        else if (asset.priceChange24h < -5) score -= 20;
        else if (asset.priceChange24h < -2) score -= 10;

        // Volume analysis
        if (asset.unusualVolume) score += 15;

        // 7-day trend
        if (asset.priceChange7d > 10) score += 15;
        else if (asset.priceChange7d < -10) score -= 15;
      }

      return Math.min(100, Math.max(0, score));
    } catch (error) {
      console.warn(`⚠️ Technical analysis failed for ${asset.ticker}, using fallback:`, error);
      
      // Fallback to basic analysis
      let fallbackScore = 50;
      if (asset.priceChange24h > 5) fallbackScore += 20;
      else if (asset.priceChange24h > 2) fallbackScore += 10;
      else if (asset.priceChange24h < -5) fallbackScore -= 20;
      else if (asset.priceChange24h < -2) fallbackScore -= 10;

      if (asset.unusualVolume) fallbackScore += 15;
      if (asset.priceChange7d > 10) fallbackScore += 15;
      else if (asset.priceChange7d < -10) fallbackScore -= 15;

      return Math.min(100, Math.max(0, fallbackScore));
    }
  }

  /**
   * Combine all signals into overall prediction
   */
  private combineSignals(signals: {
    socialMomentum: number;
    volumeSpike: number;
    sentimentShift: number;
    technicalScore: number;
  }): number {
    // Weighted combination - social and volume are most important
    const weightedScore =
      signals.socialMomentum * 0.3 +
      signals.volumeSpike * 0.3 +
      signals.sentimentShift * 0.25 +
      signals.technicalScore * 0.15;

    return Math.min(100, Math.max(0, weightedScore));
  }

  /**
   * Determine prediction direction and timeframe
   */
  private determinePrediction(score: number): {
    direction: "Bullish" | "Bearish" | "Neutral";
    timeframe: "24h" | "7d" | "30d";
  } {
    if (score >= 75) {
      return { direction: "Bullish", timeframe: "24h" };
    } else if (score >= 60) {
      return { direction: "Bullish", timeframe: "7d" };
    } else if (score >= 45) {
      return { direction: "Bullish", timeframe: "30d" };
    } else if (score <= 25) {
      return { direction: "Bearish", timeframe: "24h" };
    } else {
      return { direction: "Neutral", timeframe: "7d" };
    }
  }

  /**
   * Calculate confidence level
   */
  private calculateConfidence(score: number): number {
    // More varied confidence calculation
    let confidence = 50; // Base confidence

    if (score >= 80)
      confidence = 85 + Math.random() * 10; // 85-95%
    else if (score >= 60)
      confidence = 70 + Math.random() * 10; // 70-80%
    else if (score >= 40)
      confidence = 55 + Math.random() * 10; // 55-65%
    else if (score >= 20)
      confidence = 40 + Math.random() * 10; // 40-50%
    else confidence = 30 + Math.random() * 10; // 30-40%

    return Math.min(100, Math.max(30, Math.round(confidence)));
  }

  /**
   * Calculate expected price movement
   */
  private calculateExpectedMove(score: number, asset: PredictionInput): number {
    let baseMove = 0;

    // More realistic expected moves based on score
    if (score >= 80)
      baseMove = 8 + Math.random() * 7; // 8-15%
    else if (score >= 60)
      baseMove = 4 + Math.random() * 4; // 4-8%
    else if (score >= 40)
      baseMove = 2 + Math.random() * 2; // 2-4%
    else if (score >= 20)
      baseMove = -2 + Math.random() * 2; // -2 to 0%
    else baseMove = -5 + Math.random() * 3; // -5 to -2%

    // Adjust based on asset type and volatility
    const volatilityMultiplier = asset.type === "Coin" ? 1.3 : 1.0;

    // Add some randomness to make predictions more varied
    const randomFactor = 0.8 + Math.random() * 0.4; // 0.8 to 1.2

    return Math.round(baseMove * volatilityMultiplier * randomFactor);
  }

  /**
   * Calculate risk level
   */
  private calculateRiskLevel(
    asset: PredictionInput,
  ): "Low" | "Medium" | "High" {
    let riskScore = 0;

    // High meme score = higher risk
    riskScore += asset.memeScore * 10;

    // High volatility = higher risk
    if (Math.abs(asset.priceChange24h) > 10) riskScore += 20;
    if (Math.abs(asset.priceChange7d) > 25) riskScore += 15;

    // Crypto is generally riskier
    if (asset.type === "Coin") riskScore += 15;

    if (riskScore <= this.riskThresholds.low) return "Low";
    if (riskScore <= this.riskThresholds.medium) return "Medium";
    return "High";
  }

  /**
   * Generate human-readable reasoning
   */
  private generateReasoning(
    asset: PredictionInput,
    signals: {
      socialMomentum: number;
      volumeSpike: number;
      sentimentShift: number;
      technicalScore: number;
    },
  ): string[] {
    const reasoning: string[] = [];

    if (signals.socialMomentum > 60) {
      reasoning.push(
        `Strong social momentum with ${asset.socialMentions} mentions`,
      );
    }

    if (signals.volumeSpike > 50) {
      reasoning.push("Unusual volume activity detected");
    }

    if (signals.sentimentShift > 60) {
      reasoning.push(
        `Positive sentiment trend (${Math.round(asset.sentimentScore * 100)}%)`,
      );
    }

    if (signals.technicalScore > 50) {
      reasoning.push(
        `Technical momentum: ${asset.priceChange24h > 0 ? "+" : ""}${asset.priceChange24h.toFixed(1)}% 24h`,
      );
    }

    if (asset.memeScore >= 3) {
      reasoning.push(
        "High meme potential indicates viral breakout possibility",
      );
    }

    if (asset.politicalScore > 0) {
      reasoning.push("Political trade activity detected");
    }

    if (asset.earningsScore > 0) {
      reasoning.push("Earnings-based catalyst identified");
    }

    return reasoning.length > 0
      ? reasoning
      : ["Limited data available for prediction"];
  }

  /**
   * Get prediction summary for dashboard
   */
  getPredictionSummary(predictions: PredictionSignal[]): {
    bullish: number;
    bearish: number;
    highConfidence: number;
    averageExpectedMove: number;
  } {
    const bullish = predictions.filter(
      (p) => p.prediction === "Bullish",
    ).length;
    const bearish = predictions.filter(
      (p) => p.prediction === "Bearish",
    ).length;
    const highConfidence = predictions.filter((p) => p.confidence >= 80).length;
    const averageExpectedMove =
      predictions.length > 0
        ? predictions.reduce((sum, p) => sum + Math.abs(p.expectedMove), 0) /
          predictions.length
        : 0;

    return {
      bullish,
      bearish,
      highConfidence,
      averageExpectedMove: Math.round(averageExpectedMove),
    };
  }

  /**
   * Test method to verify prediction service is working
   */
  async testPrediction(): Promise<PredictionSignal> {
    console.log("🧪 Testing prediction service...");

    const testAsset: PredictionInput = {
      ticker: "TEST",
      type: "Stock",
      currentPrice: 100,
      volume24h: 500000,
      socialMentions: 1500,
      sentimentScore: 0.75,
      priceChange24h: 5.2,
      priceChange7d: 12.8,
      unusualVolume: true,
      memeScore: 3,
      politicalScore: 2,
      earningsScore: 1,
    };

    const predictions = await this.generatePredictions([testAsset]);
    console.log("🧪 Test prediction result:", predictions[0]);

    return predictions[0];
  }

  /**
   * Call Groq LLM for AI prediction
   */
  private async callGroqLLM(asset: PredictionInput): Promise<PredictionSignal | null> {
    const prompt = `You are an expert financial AI. Given the following asset data, generate a prediction for the next 24h/7d/30d. Return JSON with: confidence (0-100), prediction (Bullish/Bearish/Neutral), timeframe (24h/7d/30d), reasoning (array of strings), riskLevel (Low/Medium/High), expectedMove (percent, integer), and signals (object with socialMomentum, volumeSpike, sentimentShift, technicalScore, all 0-100).\n\nAsset Data: ${JSON.stringify(asset)}`;
    try {
      const response = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "mixtral-8x7b-32768",
          messages: [
            { role: "system", content: "You are a financial prediction AI." },
            { role: "user", content: prompt },
          ],
          max_tokens: 512,
          temperature: 0.7,
        }),
      });
      if (!response.ok) throw new Error("Groq API error");
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error("No content from Groq");
      // Try to parse JSON from the LLM output
      const match = content.match(/\{[\s\S]*\}/);
      const json = match ? JSON.parse(match[0]) : JSON.parse(content);
      // Patch missing fields if needed
      return {
        ticker: asset.ticker,
        type: asset.type,
        confidence: json.confidence ?? 50,
        prediction: json.prediction ?? "Neutral",
        timeframe: json.timeframe ?? "7d",
        reasoning: json.reasoning ?? ["No reasoning provided"],
        riskLevel: json.riskLevel ?? "Medium",
        expectedMove: json.expectedMove ?? 0,
        signals: json.signals ?? {
          socialMomentum: 0,
          volumeSpike: 0,
          sentimentShift: 0,
          technicalScore: 0,
        },
      };
    } catch (err) {
      console.warn("Groq LLM prediction failed:", err);
      return null;
    }
  }

  /**
   * Collect enhanced data using Firecrawl for better predictions
   */
  async collectEnhancedData(ticker: string, type: "Stock" | "Coin"): Promise<{
    newsArticles: NewsArticle[];
    socialMentions: SocialMention[];
    enhancedSentiment: number;
    newsSentiment: number;
    socialSentiment: number;
    recentCatalysts: string[];
  }> {
    try {
      console.log(`🔍 Collecting enhanced data for ${ticker}...`);

      // Collect news articles
      const newsArticles = await firecrawlService.searchNews(ticker, 5);
      
      // Collect social mentions
      const socialMentions = await firecrawlService.searchSocialMentions(ticker, ['twitter', 'reddit']);

      // Calculate enhanced sentiment scores
      const newsSentiment = this.calculateNewsSentiment(newsArticles);
      const socialSentiment = this.calculateSocialSentiment(socialMentions);
      const enhancedSentiment = (newsSentiment + socialSentiment) / 2;

      // Extract recent catalysts
      const recentCatalysts = this.extractCatalysts(newsArticles, socialMentions);

      console.log(`✅ Enhanced data collected for ${ticker}:`, {
        newsCount: newsArticles.length,
        socialCount: socialMentions.length,
        enhancedSentiment: enhancedSentiment.toFixed(2)
      });

      return {
        newsArticles,
        socialMentions,
        enhancedSentiment,
        newsSentiment,
        socialSentiment,
        recentCatalysts
      };

    } catch (error) {
      console.warn(`⚠️ Enhanced data collection failed for ${ticker}:`, error);
      
      // Return fallback data
      return {
        newsArticles: [],
        socialMentions: [],
        enhancedSentiment: 0.5,
        newsSentiment: 0.5,
        socialSentiment: 0.5,
        recentCatalysts: []
      };
    }
  }

  /**
   * Calculate sentiment from news articles
   */
  private calculateNewsSentiment(articles: NewsArticle[]): number {
    if (articles.length === 0) return 0.5;

    const sentimentScores = articles.map(article => {
      switch (article.sentiment) {
        case 'positive': return 0.8;
        case 'negative': return 0.2;
        default: return 0.5;
      }
    });

    return sentimentScores.reduce((sum, score) => sum + score, 0) / sentimentScores.length;
  }

  /**
   * Calculate sentiment from social mentions
   */
  private calculateSocialSentiment(mentions: SocialMention[]): number {
    if (mentions.length === 0) return 0.5;

    const sentimentScores = mentions.map(mention => {
      switch (mention.sentiment) {
        case 'positive': return 0.8;
        case 'negative': return 0.2;
        default: return 0.5;
      }
    });

    return sentimentScores.reduce((sum, score) => sum + score, 0) / sentimentScores.length;
  }

  /**
   * Extract recent catalysts from news and social data
   */
  private extractCatalysts(articles: NewsArticle[], mentions: SocialMention[]): string[] {
    const catalysts: string[] = [];
    const catalystKeywords = [
      'earnings', 'partnership', 'merger', 'acquisition', 'product launch',
      'regulatory', 'approval', 'listing', 'delisting', 'upgrade', 'downgrade',
      'insider', 'buying', 'selling', 'short', 'squeeze', 'halving', 'fork'
    ];

    // Check news articles for catalysts
    for (const article of articles) {
      const text = `${article.title} ${article.content}`.toLowerCase();
      for (const keyword of catalystKeywords) {
        if (text.includes(keyword) && !catalysts.includes(keyword)) {
          catalysts.push(keyword);
        }
      }
    }

    // Check social mentions for catalysts
    for (const mention of mentions) {
      const text = mention.content.toLowerCase();
      for (const keyword of catalystKeywords) {
        if (text.includes(keyword) && !catalysts.includes(keyword)) {
          catalysts.push(keyword);
        }
      }
    }

    return catalysts.slice(0, 5); // Limit to top 5 catalysts
  }
}

export const predictionService = new PredictionService();
