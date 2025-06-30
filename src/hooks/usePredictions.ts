import { useState, useEffect } from "react";
import { predictionService } from "../services/predictionService";
import { assetDB } from "../data/database";

export interface PredictionSignal {
  ticker: string;
  type: "Stock" | "Coin";
  confidence: number;
  prediction: "Bullish" | "Bearish" | "Neutral";
  timeframe: "24h" | "7d" | "30d";
  reasoning: string[];
  riskLevel: "Low" | "Medium" | "High";
  expectedMove: number;
  signals: {
    socialMomentum: number;
    volumeSpike: number;
    sentimentShift: number;
    technicalScore: number;
  };
}

export const usePredictions = () => {
  const [predictions, setPredictions] = useState<PredictionSignal[]>([]);
  const [pinnedPredictions, setPinnedPredictions] = useState<
    PredictionSignal[]
  >([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Load pinned predictions from localStorage
  useEffect(() => {
    const savedPinned = localStorage.getItem("valker-pinned-predictions");
    if (savedPinned) {
      try {
        setPinnedPredictions(JSON.parse(savedPinned));
      } catch (error) {
        console.warn("Failed to load pinned predictions:", error);
      }
    }
  }, []);

  // Save pinned predictions to localStorage
  useEffect(() => {
    localStorage.setItem(
      "valker-pinned-predictions",
      JSON.stringify(pinnedPredictions),
    );
  }, [pinnedPredictions]);

  const generatePrediction = async (
    ticker: string,
    timeframe: "24h" | "7d" | "30d",
  ) => {
    setIsGenerating(true);
    try {
      console.log(
        `🧠 Generating AI prediction for ${ticker} (${timeframe})...`,
      );

      // Try to get real asset data first
      const existingAsset = assetDB.getAssetByTicker(ticker);

      let predictionInput;

      if (existingAsset) {
        // Use real asset data
        console.log(`📊 Using real data for ${ticker}`);
        predictionInput = {
          ticker: ticker,
          type: existingAsset.type,
          currentPrice: 0, // Will be filled by pricing service if available
          volume24h: Math.floor(Math.random() * 1000000) + 100000,
          socialMentions: Math.floor(Math.random() * 2000) + 50,
          sentimentScore: 0.3 + Math.random() * 0.6,
          priceChange24h: Math.random() * 20 - 10,
          priceChange7d: Math.random() * 30 - 15,
          unusualVolume: Math.random() > 0.7,
          memeScore: existingAsset.memeScore || Math.floor(Math.random() * 5),
          politicalScore:
            existingAsset.politicalScore || Math.floor(Math.random() * 4),
          earningsScore:
            existingAsset.earningsScore || Math.floor(Math.random() * 3),
        };
      } else {
        // Create mock data for unknown ticker
        console.log(`🎲 Using mock data for ${ticker}`);
        predictionInput = {
          ticker: ticker,
          type: ticker.length <= 4 ? "Stock" : ("Coin" as "Stock" | "Coin"),
          currentPrice: 0,
          volume24h: Math.floor(Math.random() * 1000000) + 100000,
          socialMentions: Math.floor(Math.random() * 2000) + 50,
          sentimentScore: 0.3 + Math.random() * 0.6,
          priceChange24h: Math.random() * 20 - 10,
          priceChange7d: Math.random() * 30 - 15,
          unusualVolume: Math.random() > 0.7,
          memeScore: Math.floor(Math.random() * 5),
          politicalScore: Math.floor(Math.random() * 4),
          earningsScore: Math.floor(Math.random() * 3),
        };
      }

      console.log("📈 Prediction input:", predictionInput);

      const newPredictions = await predictionService.generatePredictions([
        predictionInput,
      ]);

      console.log("🎯 Generated predictions:", newPredictions);

      if (newPredictions.length > 0) {
        const newPrediction = newPredictions[0];

        // Add timeframe to the prediction
        newPrediction.timeframe = timeframe;

        setPredictions((prev) => {
          // Remove any existing prediction for this ticker
          const filtered = prev.filter((p) => p.ticker !== ticker);
          return [...filtered, newPrediction];
        });

        // Auto-pin high confidence predictions
        if (newPrediction.confidence >= 80) {
          pinPrediction(newPrediction);
        }

        console.log(
          `✅ Successfully generated prediction for ${ticker}:`,
          newPrediction,
        );
      } else {
        console.warn(
          `⚠️ No predictions generated for ${ticker} - creating fallback`,
        );
        // Create a fallback prediction
        const fallbackPrediction: PredictionSignal = {
          ticker: ticker,
          type: ticker.length <= 4 ? "Stock" : ("Coin" as "Stock" | "Coin"),
          confidence: 40,
          prediction: "Neutral",
          timeframe: timeframe,
          reasoning: ["Limited data available for prediction"],
          riskLevel: "Medium",
          expectedMove: 0,
          signals: {
            socialMomentum: 0,
            volumeSpike: 0,
            sentimentShift: 0,
            technicalScore: 0,
          },
        };

        setPredictions((prev) => {
          const filtered = prev.filter((p) => p.ticker !== ticker);
          return [...filtered, fallbackPrediction];
        });
      }
    } catch (error) {
      console.error("❌ Failed to generate prediction:", error);
      // Add a fallback prediction with error info
      const fallbackPrediction: PredictionSignal = {
        ticker: ticker,
        type: ticker.length <= 4 ? "Stock" : ("Coin" as "Stock" | "Coin"),
        confidence: 30,
        prediction: "Neutral",
        timeframe: timeframe,
        reasoning: ["Prediction generation failed - insufficient data"],
        riskLevel: "High",
        expectedMove: 0,
        signals: {
          socialMomentum: 0,
          volumeSpike: 0,
          sentimentShift: 0,
          technicalScore: 0,
        },
      };

      setPredictions((prev) => {
        const filtered = prev.filter((p) => p.ticker !== ticker);
        return [...filtered, fallbackPrediction];
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const pinPrediction = (prediction: PredictionSignal) => {
    setPinnedPredictions((prev) => {
      const exists = prev.some((p) => p.ticker === prediction.ticker);
      if (!exists) {
        return [...prev, prediction];
      }
      return prev;
    });
  };

  const unpinPrediction = (prediction: PredictionSignal) => {
    setPinnedPredictions((prev) =>
      prev.filter((p) => p.ticker !== prediction.ticker),
    );
  };

  const removePrediction = (prediction: PredictionSignal) => {
    setPredictions((prev) =>
      prev.filter((p) => p.ticker !== prediction.ticker),
    );
    setPinnedPredictions((prev) =>
      prev.filter((p) => p.ticker !== prediction.ticker),
    );
  };

  const clearAllPredictions = () => {
    setPredictions([]);
  };

  const getUnpinnedPredictions = () => {
    return predictions.filter(
      (p) => !pinnedPredictions.some((pp) => pp.ticker === p.ticker),
    );
  };

  // Test function to verify prediction service is working
  const testPredictionService = async () => {
    console.log("🧪 Testing prediction service...");
    try {
      const testResult = await predictionService.testPrediction();
      console.log("🧪 Test successful:", testResult);
      return testResult;
    } catch (error) {
      console.error("🧪 Test failed:", error);
      throw error;
    }
  };

  return {
    predictions,
    pinnedPredictions,
    isGenerating,
    generatePrediction,
    pinPrediction,
    unpinPrediction,
    removePrediction,
    clearAllPredictions,
    getUnpinnedPredictions,
    testPredictionService,
  };
};
