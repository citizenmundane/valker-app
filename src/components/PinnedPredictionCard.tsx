import React from "react";
import { TrendingUp, Pin, Trash2, Brain } from "lucide-react";

interface PredictionSignal {
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

interface PinnedPredictionCardProps {
  prediction: PredictionSignal;
  onUnpin: (id: string) => void;
  onGeneratePrediction: (
    ticker: string,
    timeframe: "24h" | "7d" | "30d",
  ) => void;
}

const PinnedPredictionCard: React.FC<PinnedPredictionCardProps> = ({
  prediction,
  onUnpin,
  onGeneratePrediction,
}) => {
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "text-green-400";
    if (confidence >= 60) return "text-yellow-400";
    return "text-red-400";
  };

  const getRiskColor = (risk: string) => {
    switch (risk.toLowerCase()) {
      case "low":
        return "text-green-400";
      case "medium":
        return "text-yellow-400";
      case "high":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  const getPredictionColor = (prediction: string) => {
    switch (prediction) {
      case "Bullish":
        return "text-green-400";
      case "Bearish":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  const timeframes: ("24h" | "7d" | "30d")[] = ["24h", "7d", "30d"];

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-lg p-3 relative group">
      {/* AI Prediction Badge */}
      <div className="absolute -top-1 -left-1 bg-purple-600 text-white px-2 py-0.5 rounded-full text-xs font-medium flex items-center space-x-1">
        <Brain className="w-2.5 h-2.5" />
        <span>AI</span>
      </div>

      {/* Main Content Row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-3">
          <div className="flex flex-col">
            <span className="text-white font-bold text-base">
              {prediction.ticker}
            </span>
            <span className="text-gray-400 text-xs">{prediction.type}</span>
          </div>
          <div
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getPredictionColor(prediction.prediction)}`}
          >
            {prediction.prediction}
          </div>
        </div>

        <div className="text-right">
          <div
            className={`text-xl font-bold ${getConfidenceColor(prediction.confidence)}`}
          >
            {prediction.confidence}%
          </div>
          <div className="text-xs text-gray-400">confidence</div>
        </div>
      </div>

      {/* Prediction Details Row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <TrendingUp className="w-3 h-3 text-cyan-400" />
          <span className="text-gray-400 text-xs">Expected:</span>
          <span
            className={`font-medium text-sm ${prediction.expectedMove > 0 ? "text-green-400" : "text-red-400"}`}
          >
            {prediction.expectedMove > 0 ? "+" : ""}
            {prediction.expectedMove.toFixed(1)}%
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-gray-400 text-xs">Risk:</span>
          <span
            className={`font-medium text-sm ${getRiskColor(prediction.riskLevel)}`}
          >
            {prediction.riskLevel}
          </span>
        </div>
      </div>

      {/* Timeframe and Actions Row */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-1">
          {timeframes.map((timeframe) => (
            <button
              key={timeframe}
              onClick={() => onGeneratePrediction(prediction.ticker, timeframe)}
              className="px-2 py-1 text-xs bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 rounded transition-colors"
            >
              {timeframe}
            </button>
          ))}
        </div>
        <div className="flex space-x-1">
          <button
            onClick={() => onUnpin(prediction.ticker)}
            className="p-1 text-gray-400 hover:text-red-400 transition-colors"
            title="Unpin prediction"
          >
            <Pin className="w-3 h-3" />
          </button>
          <button
            onClick={() => onUnpin(prediction.ticker)}
            className="p-1 text-gray-400 hover:text-red-400 transition-colors"
            title="Remove prediction"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Hover hint */}
      <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-xs text-gray-500">AI Prediction</span>
      </div>
    </div>
  );
};

export default PinnedPredictionCard;
