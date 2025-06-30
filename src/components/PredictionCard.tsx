import React from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  Target,
  RefreshCw,
} from "lucide-react";

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

interface PredictionCardProps {
  prediction: PredictionSignal;
  onClick?: () => void;
  onGenerateTimeframe?: (
    ticker: string,
    timeframe: "24h" | "7d" | "30d",
  ) => Promise<void>;
  isGenerating?: boolean;
}

export const PredictionCard: React.FC<PredictionCardProps> = ({
  prediction,
  onClick,
  onGenerateTimeframe,
  isGenerating,
}) => {
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

  const getPredictionIcon = (prediction: string) => {
    switch (prediction) {
      case "Bullish":
        return <TrendingUp className="w-4 h-4" />;
      case "Bearish":
        return <TrendingDown className="w-4 h-4" />;
      default:
        return <Minus className="w-4 h-4" />;
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "Low":
        return "text-green-400";
      case "Medium":
        return "text-yellow-400";
      case "High":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "text-green-400";
    if (confidence >= 60) return "text-yellow-400";
    return "text-red-400";
  };

  return (
    <div
      onClick={onClick}
      className={`bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-lg p-4 cursor-pointer 
                 transition-all duration-300 hover:bg-gray-700/50 hover:border-cyan-500/30 hover:shadow-lg hover:shadow-cyan-500/10
                 active:scale-[0.98] relative group`}
    >
      {/* Header */}
      <div className="mb-3">
        {/* Top row: Ticker and prediction */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-3">
            <div className="flex flex-col">
              <span className="text-white font-bold text-lg">
                {prediction.ticker}
              </span>
              <span className="text-gray-400 text-xs">{prediction.type}</span>
            </div>
            <div
              className={`flex items-center space-x-1 px-2 py-1 rounded-full text-sm font-medium ${getPredictionColor(prediction.prediction)}`}
            >
              {getPredictionIcon(prediction.prediction)}
              <span>{prediction.prediction}</span>
            </div>
          </div>
        </div>

        {/* Middle row: Confidence score centered */}
        <div className="flex justify-center mb-2">
          <div className="text-center">
            <div
              className={`text-2xl font-bold ${getConfidenceColor(prediction.confidence)}`}
            >
              {prediction.confidence}%
            </div>
            <div className="text-xs text-gray-400">Confidence</div>
          </div>
        </div>
      </div>

      {/* Prediction Details */}
      <div className="space-y-2 mb-3">
        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-sm">Expected Move:</span>
          <span
            className={`font-medium ${prediction.expectedMove > 0 ? "text-green-400" : "text-red-400"}`}
          >
            {prediction.expectedMove > 0 ? "+" : ""}
            {prediction.expectedMove}%
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-sm">Timeframe:</span>
          <div className="flex items-center space-x-1 text-sm">
            <Clock className="w-3 h-3" />
            <span className="text-white">{prediction.timeframe}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-sm">Risk Level:</span>
          <span
            className={`text-sm font-medium ${getRiskColor(prediction.riskLevel)}`}
          >
            {prediction.riskLevel}
          </span>
        </div>
      </div>

      {/* Signal Scores */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-gray-700/30 rounded p-2">
          <div className="text-xs text-gray-400">Social</div>
          <div className="text-sm font-medium text-white">
            {prediction.signals.socialMomentum}
          </div>
        </div>
        <div className="bg-gray-700/30 rounded p-2">
          <div className="text-xs text-gray-400">Volume</div>
          <div className="text-sm font-medium text-white">
            {prediction.signals.volumeSpike}
          </div>
        </div>
        <div className="bg-gray-700/30 rounded p-2">
          <div className="text-xs text-gray-400">Sentiment</div>
          <div className="text-sm font-medium text-white">
            {prediction.signals.sentimentShift}
          </div>
        </div>
        <div className="bg-gray-700/30 rounded p-2">
          <div className="text-xs text-gray-400">Technical</div>
          <div className="text-sm font-medium text-white">
            {prediction.signals.technicalScore}
          </div>
        </div>
      </div>

      {/* Reasoning */}
      <div className="space-y-1">
        <div className="flex items-center space-x-1 text-xs text-gray-400">
          <Target className="w-3 h-3" />
          <span>AI Reasoning:</span>
        </div>
        <div className="text-xs text-gray-300 leading-relaxed">
          {prediction.reasoning.slice(0, 2).map((reason, index) => (
            <div key={index} className="flex items-start space-x-1">
              <span className="text-cyan-400">•</span>
              <span>{reason}</span>
            </div>
          ))}
          {prediction.reasoning.length > 2 && (
            <div className="text-cyan-400 text-xs mt-1">
              +{prediction.reasoning.length - 2} more signals
            </div>
          )}
        </div>
      </div>

      {/* Timeframe Selection Buttons */}
      {onGenerateTimeframe && (
        <div className="mt-4 pt-3 border-t border-gray-700/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">Generate for:</span>
            {isGenerating && (
              <div className="flex items-center space-x-1 text-xs text-purple-400">
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>Generating...</span>
              </div>
            )}
          </div>
          <div className="flex gap-1">
            {(["24h", "7d", "30d"] as const).map((timeframe) => (
              <button
                key={timeframe}
                onClick={(e) => {
                  e.stopPropagation();
                  onGenerateTimeframe(prediction.ticker, timeframe);
                }}
                disabled={isGenerating}
                className={`flex-1 py-2 px-2 rounded text-xs font-medium transition-colors ${
                  prediction.timeframe === timeframe
                    ? "bg-purple-600 text-white"
                    : "bg-gray-700/50 text-gray-300 hover:bg-gray-600/50"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {timeframe}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Hover hint */}
      <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-xs text-gray-500">AI Prediction</span>
      </div>
    </div>
  );
};
