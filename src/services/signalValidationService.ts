interface SignalSource {
  name: string;
  ticker: string;
  type: "Stock" | "Coin";
  confidence: number;
  sentiment: number;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

interface ValidatedSignal {
  ticker: string;
  type: "Stock" | "Coin";
  overallConfidence: number;
  crossSourceScore: number;
  sources: SignalSource[];
  validationFlags: {
    multipleSourcesConfirm: boolean;
    sentimentAlignment: boolean;
    temporalAlignment: boolean;
    volumeConfirmation?: boolean;
    insiderActivity?: boolean;
    technicalConfirmation?: boolean;
  };
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  recommendation: "STRONG_BUY" | "BUY" | "WATCH" | "AVOID";
  summary: string;
  conflictingSignals?: string[];
}

interface SourceWeights {
  [sourceName: string]: {
    baseWeight: number;
    reliability: number;
    timeDecay: number; // How quickly signals from this source decay
  };
}

export class SignalValidationService {
  private readonly sourceWeights: SourceWeights = {
    'Reddit Enhanced': {
      baseWeight: 0.8,
      reliability: 0.7,
      timeDecay: 0.9 // Reddit signals decay quickly
    },
    'SEC EDGAR': {
      baseWeight: 1.0,
      reliability: 0.95,
      timeDecay: 0.3 // Insider trading signals persist longer
    },
    'CoinGecko': {
      baseWeight: 0.9,
      reliability: 0.85,
      timeDecay: 0.7
    },
    'Google Trends': {
      baseWeight: 0.7,
      reliability: 0.75,
      timeDecay: 0.8
    },
    'Alpha Vantage': {
      baseWeight: 0.85,
      reliability: 0.8,
      timeDecay: 0.6
    },
    'Fear & Greed Index': {
      baseWeight: 0.6,
      reliability: 0.7,
      timeDecay: 0.5
    }
  };

  private signals: SignalSource[] = [];
  private validationHistory: Map<string, ValidatedSignal[]> = new Map();

  constructor() {
    console.log('🔍 Signal Validation Service initialized');
  }

  addSignal(signal: SignalSource): void {
    // Add timestamp if not present
    if (!signal.timestamp) {
      signal.timestamp = new Date();
    }

    this.signals.push(signal);
    
    // Keep only recent signals (last 7 days)
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    this.signals = this.signals.filter(s => s.timestamp > cutoff);
    
    console.log(`📊 Added signal: ${signal.ticker} from ${signal.name} (confidence: ${signal.confidence})`);
  }

  addSignals(signals: SignalSource[]): void {
    signals.forEach(signal => this.addSignal(signal));
  }

  private calculateTimeWeight(timestamp: Date, sourceName: string): number {
    const ageHours = (Date.now() - timestamp.getTime()) / (1000 * 60 * 60);
    const timeDecay = this.sourceWeights[sourceName]?.timeDecay || 0.8;
    
    // Exponential decay based on source characteristics
    return Math.exp(-ageHours * timeDecay / 24);
  }

  private calculateSourceWeight(sourceName: string, confidence: number): number {
    const weights = this.sourceWeights[sourceName];
    if (!weights) {
      console.warn(`⚠️ Unknown source: ${sourceName}, using default weight`);
      return 0.5;
    }

    return weights.baseWeight * weights.reliability * (confidence / 100);
  }

  private checkSentimentAlignment(signals: SignalSource[]): boolean {
    if (signals.length < 2) return true;

    const avgSentiment = signals.reduce((sum, s) => sum + s.sentiment, 0) / signals.length;
    const sentimentVariance = signals.reduce((sum, s) => sum + Math.pow(s.sentiment - avgSentiment, 2), 0) / signals.length;
    
    // Low variance means good alignment
    return sentimentVariance < 0.25; // Threshold for sentiment alignment
  }

  private checkTemporalAlignment(signals: SignalSource[]): boolean {
    if (signals.length < 2) return true;

    // Check if signals occurred within reasonable time window
    const timestamps = signals.map(s => s.timestamp.getTime());
    const timeSpread = Math.max(...timestamps) - Math.min(...timestamps);
    const maxSpread = 48 * 60 * 60 * 1000; // 48 hours

    return timeSpread <= maxSpread;
  }

  private detectConflictingSignals(signals: SignalSource[]): string[] {
    const conflicts: string[] = [];

    // Check for high confidence but opposite sentiments
    const bullishSignals = signals.filter(s => s.sentiment > 0.6 && s.confidence > 70);
    const bearishSignals = signals.filter(s => s.sentiment < 0.4 && s.confidence > 70);

    if (bullishSignals.length > 0 && bearishSignals.length > 0) {
      conflicts.push('High-confidence bullish and bearish signals detected');
    }

    // Check for unusual source combinations
    const redditSignals = signals.filter(s => s.name.includes('Reddit'));
    const fundamentalSignals = signals.filter(s => s.name.includes('SEC EDGAR') || s.name.includes('Alpha Vantage'));

    if (redditSignals.length > 0 && fundamentalSignals.length > 0) {
      const redditSentiment = redditSignals.reduce((sum, s) => sum + s.sentiment, 0) / redditSignals.length;
      const fundamentalSentiment = fundamentalSignals.reduce((sum, s) => sum + s.sentiment, 0) / fundamentalSignals.length;
      
      if (Math.abs(redditSentiment - fundamentalSentiment) > 0.4) {
        conflicts.push('Social sentiment conflicts with fundamental signals');
      }
    }

    return conflicts;
  }

  private calculateRiskLevel(
    crossSourceScore: number, 
    sourceCount: number, 
    conflicts: string[]
  ): "LOW" | "MEDIUM" | "HIGH" {
    if (conflicts.length > 0) return "HIGH";
    if (sourceCount === 1) return "HIGH";
    if (crossSourceScore < 60) return "HIGH";
    if (crossSourceScore > 80 && sourceCount >= 3) return "LOW";
    return "MEDIUM";
  }

  private generateRecommendation(
    crossSourceScore: number,
    riskLevel: "LOW" | "MEDIUM" | "HIGH",
    sentimentAlignment: boolean
  ): "STRONG_BUY" | "BUY" | "WATCH" | "AVOID" {
    if (riskLevel === "HIGH") return "AVOID";
    if (!sentimentAlignment) return "WATCH";
    
    if (crossSourceScore >= 85 && riskLevel === "LOW") return "STRONG_BUY";
    if (crossSourceScore >= 70) return "BUY";
    return "WATCH";
  }

  private generateSummary(validatedSignal: ValidatedSignal): string {
    const { ticker, sources, crossSourceScore, validationFlags } = validatedSignal;
    const sourceNames = [...new Set(sources.map(s => s.name))];
    
    let summary = `${ticker}: ${crossSourceScore.toFixed(0)}% confidence signal from ${sourceNames.length} source${sourceNames.length > 1 ? 's' : ''} (${sourceNames.join(', ')}). `;

    if (validationFlags.multipleSourcesConfirm) {
      summary += 'Multiple sources confirm signal. ';
    }

    if (validationFlags.sentimentAlignment) {
      summary += 'Sentiment aligned across sources. ';
    } else {
      summary += 'Mixed sentiment signals. ';
    }

    if (validationFlags.insiderActivity) {
      summary += 'Insider trading activity detected. ';
    }

    if (validationFlags.temporalAlignment) {
      summary += 'Recent coordinated activity. ';
    }

    const avgSentiment = sources.reduce((sum, s) => sum + s.sentiment, 0) / sources.length;
    if (avgSentiment > 0.6) {
      summary += 'Overall bullish sentiment.';
    } else if (avgSentiment < 0.4) {
      summary += 'Overall bearish sentiment.';
    } else {
      summary += 'Neutral sentiment.';
    }

    return summary;
  }

  validateSignal(ticker: string): ValidatedSignal | null {
    // Get all signals for this ticker
    const tickerSignals = this.signals.filter(s => 
      s.ticker.toUpperCase() === ticker.toUpperCase()
    );

    if (tickerSignals.length === 0) {
      return null;
    }

    // Sort by timestamp (most recent first)
    tickerSignals.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Calculate weighted confidence score
    let totalWeightedScore = 0;
    let totalWeight = 0;

    tickerSignals.forEach(signal => {
      const sourceWeight = this.calculateSourceWeight(signal.name, signal.confidence);
      const timeWeight = this.calculateTimeWeight(signal.timestamp, signal.name);
      const combinedWeight = sourceWeight * timeWeight;

      totalWeightedScore += signal.confidence * combinedWeight;
      totalWeight += combinedWeight;
    });

    const crossSourceScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;

    // Validation flags
    const validationFlags = {
      multipleSourcesConfirm: tickerSignals.length >= 2,
      sentimentAlignment: this.checkSentimentAlignment(tickerSignals),
      temporalAlignment: this.checkTemporalAlignment(tickerSignals),
      insiderActivity: tickerSignals.some(s => s.name === 'SEC EDGAR'),
      volumeConfirmation: tickerSignals.some(s => s.metadata?.volumeSpike === true),
      technicalConfirmation: tickerSignals.some(s => s.name.includes('Technical'))
    };

    // Detect conflicts
    const conflictingSignals = this.detectConflictingSignals(tickerSignals);

    // Calculate risk and recommendation
    const riskLevel = this.calculateRiskLevel(crossSourceScore, tickerSignals.length, conflictingSignals);
    const recommendation = this.generateRecommendation(crossSourceScore, riskLevel, validationFlags.sentimentAlignment);

    const validatedSignal: ValidatedSignal = {
      ticker,
      type: tickerSignals[0].type,
      overallConfidence: crossSourceScore,
      crossSourceScore,
      sources: tickerSignals,
      validationFlags,
      riskLevel,
      recommendation,
      summary: '', // Will be generated
      conflictingSignals: conflictingSignals.length > 0 ? conflictingSignals : undefined
    };

    // Generate summary
    validatedSignal.summary = this.generateSummary(validatedSignal);

    // Store in history
    const history = this.validationHistory.get(ticker) || [];
    history.unshift(validatedSignal);
    this.validationHistory.set(ticker, history.slice(0, 10)); // Keep last 10 validations

    console.log(`✅ Validated ${ticker}: ${crossSourceScore.toFixed(1)}% confidence, ${recommendation} recommendation`);

    return validatedSignal;
  }

  validateAllSignals(): ValidatedSignal[] {
    // Get unique tickers
    const uniqueTickers = [...new Set(this.signals.map(s => s.ticker.toUpperCase()))];
    
    const validatedSignals: ValidatedSignal[] = [];
    
    uniqueTickers.forEach(ticker => {
      const validated = this.validateSignal(ticker);
      if (validated) {
        validatedSignals.push(validated);
      }
    });

    // Sort by confidence score
    validatedSignals.sort((a, b) => b.overallConfidence - a.overallConfidence);

    console.log(`🔍 Validated ${validatedSignals.length} signals from ${uniqueTickers.length} tickers`);

    return validatedSignals;
  }

  getHighConfidenceSignals(minConfidence: number = 75): ValidatedSignal[] {
    const allValidated = this.validateAllSignals();
    return allValidated.filter(signal => 
      signal.overallConfidence >= minConfidence && 
      signal.riskLevel !== "HIGH"
    );
  }

  getSignalHistory(ticker: string): ValidatedSignal[] {
    return this.validationHistory.get(ticker.toUpperCase()) || [];
  }

  clearOldSignals(hoursOld: number = 168): void { // Default 7 days
    const cutoff = new Date(Date.now() - hoursOld * 60 * 60 * 1000);
    this.signals = this.signals.filter(s => s.timestamp > cutoff);
    
    console.log(`🧹 Cleared signals older than ${hoursOld} hours`);
  }

  getStats(): {
    totalSignals: number;
    uniqueTickers: number;
    sourceDistribution: Record<string, number>;
    averageConfidence: number;
    highConfidenceCount: number;
  } {
    const uniqueTickers = new Set(this.signals.map(s => s.ticker)).size;
    const sourceDistribution: Record<string, number> = {};
    
    this.signals.forEach(signal => {
      sourceDistribution[signal.name] = (sourceDistribution[signal.name] || 0) + 1;
    });

    const averageConfidence = this.signals.length > 0 
      ? this.signals.reduce((sum, s) => sum + s.confidence, 0) / this.signals.length 
      : 0;

    const highConfidenceCount = this.signals.filter(s => s.confidence >= 75).length;

    return {
      totalSignals: this.signals.length,
      uniqueTickers,
      sourceDistribution,
      averageConfidence,
      highConfidenceCount
    };
  }
}

export const signalValidationService = new SignalValidationService();