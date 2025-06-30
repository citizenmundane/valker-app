import React, { useState, useEffect } from "react";
import { X, Brain, Search, Loader2, Pin, Trash2 } from "lucide-react";
import { PredictionCard } from "./PredictionCard";

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

interface PredictionModalProps {
  isOpen: boolean;
  onClose: () => void;
  predictions: PredictionSignal[];
  onGeneratePrediction: (
    ticker: string,
    timeframe: "24h" | "7d" | "30d",
  ) => Promise<void>;
  onPinPrediction: (prediction: PredictionSignal) => void;
  onRemovePrediction: (prediction: PredictionSignal) => void;
  isGenerating: boolean;
  knownTickers: string[];
}

export const PredictionModal: React.FC<PredictionModalProps> = ({
  isOpen,
  onClose,
  predictions,
  onGeneratePrediction,
  onPinPrediction,
  onRemovePrediction,
  isGenerating,
  knownTickers,
}) => {
  const [tickerInput, setTickerInput] = useState("");
  const [filteredTickers, setFilteredTickers] = useState<string[]>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);

  useEffect(() => {
    if (tickerInput.trim()) {
      const filtered = knownTickers
        .filter((ticker) =>
          ticker.toLowerCase().includes(tickerInput.toLowerCase()),
        )
        .slice(0, 10);
      setFilteredTickers(filtered);
      setShowAutocomplete(filtered.length > 0);
    } else {
      setFilteredTickers([]);
      setShowAutocomplete(false);
    }
  }, [tickerInput, knownTickers]);

  const handleTickerSelect = (ticker: string) => {
    setTickerInput(ticker.toUpperCase());
    setShowAutocomplete(false);
  };

  const handleGeneratePrediction = async () => {
    if (tickerInput.trim()) {
      await onGeneratePrediction(tickerInput.trim().toUpperCase(), "24h");
      setTickerInput("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleGeneratePrediction();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <Brain className="w-6 h-6 text-purple-400" />
            <h2 className="text-xl font-bold text-white">AI Predictions</h2>
            <span className="text-sm text-gray-400">
              ({predictions.length} predictions)
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 border-b border-gray-700 bg-gray-800/30">
          <h3 className="text-lg font-semibold text-white mb-4">
            Generate New Prediction
          </h3>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={tickerInput}
                  onChange={(e) => setTickerInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter ticker symbol (e.g., AAPL, BTC)"
                  className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              {showAutocomplete && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                  {filteredTickers.map((ticker) => (
                    <button
                      key={ticker}
                      onClick={() => handleTickerSelect(ticker)}
                      className="w-full px-4 py-2 text-left text-white hover:bg-gray-700 transition-colors flex items-center space-x-2"
                    >
                      <span className="font-medium">{ticker}</span>
                      <span className="text-gray-400 text-sm">
                        • Known ticker
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleGeneratePrediction}
              disabled={!tickerInput.trim() || isGenerating}
              className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:from-gray-600 disabled:to-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-all flex items-center justify-center space-x-2 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4" />
                  <span>Run Prediction</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {predictions.length === 0 ? (
            <div className="text-center py-12">
              <Brain className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-400 mb-2">
                No Predictions Yet
              </h3>
              <p className="text-gray-500">
                Generate your first AI prediction using the form above.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {predictions.map((prediction, index) => (
                <div key={`${prediction.ticker}-${index}`} className="relative">
                  <PredictionCard
                    prediction={prediction}
                    onClick={() => {}}
                    onGenerateTimeframe={onGeneratePrediction}
                    isGenerating={isGenerating}
                  />

                  <div className="absolute top-3 right-3 flex space-x-1">
                    <button
                      onClick={() => onPinPrediction(prediction)}
                      className="bg-purple-600/80 hover:bg-purple-700/90 text-white p-1.5 rounded-full transition-colors shadow-lg backdrop-blur-sm"
                      title="Pin to Dashboard"
                    >
                      <Pin className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onRemovePrediction(prediction)}
                      className="bg-red-600/80 hover:bg-red-700/90 text-white p-1.5 rounded-full transition-colors shadow-lg backdrop-blur-sm"
                      title="Remove Prediction"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
