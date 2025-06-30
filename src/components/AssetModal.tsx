import React, { useState, useEffect } from "react";
import {
  X,
  AlertTriangle,
  CheckCircle,
  Edit3,
  Save,
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  Clock,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Asset } from "../types/Asset";
import { PredictionSignal } from "../hooks/usePredictions";
import { getRecommendationColor, shouldTriggerAlert } from "../utils/scoring";
import { assetDB } from "../data/database";
import { pricingService } from "../services/pricingService";

interface AssetModalProps {
  asset: Asset;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  onPredict: (ticker: string, timeframe: '24h' | '7d' | '30d') => void;
  predictions: PredictionSignal[];
}

export const AssetModal: React.FC<AssetModalProps> = ({
  asset,
  isOpen,
  onClose,
  onUpdate,
  onPredict,
  predictions,
}) => {
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [summaryText, setSummaryText] = useState(asset.gptSummary);
  const [isRefreshingPrice, setIsRefreshingPrice] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const needsAlert = shouldTriggerAlert(asset);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'24h' | '7d' | '30d'>('24h');

  useEffect(() => {
    if (isOpen) setSelectedTimeframe('24h');
  }, [asset, isOpen]);

  useEffect(() => {
    if (
      isOpen &&
      asset &&
      !predictions.some(p => p.ticker === asset.ticker && p.timeframe === selectedTimeframe)
    ) {
      onPredict(asset.ticker, selectedTimeframe);
    }
  }, [isOpen, asset, predictions, onPredict, selectedTimeframe]);

  if (!isOpen) return null;

  const handleMarkAlertSent = () => {
    assetDB.markAlertSent(asset.id);
    onUpdate();
  };

  const handleSaveSummary = () => {
    assetDB.updateAsset(asset.id, { gptSummary: summaryText });
    setIsEditingSummary(false);
    onUpdate();
  };

  const handleRefreshPrice = async () => {
    setIsRefreshingPrice(true);
    try {
      const priceData = await pricingService.updateAllPrices([
        {
          ticker: asset.ticker,
          type: asset.type,
        },
      ]);

      if (priceData.length > 0) {
        const price = priceData[0];
        assetDB.updateAssetPricing(asset.ticker, {
          livePrice: price.price,
          priceChange24h: price.change24h,
          percentChange24h: price.percentChange24h,
          lastPriceUpdate: price.lastUpdated,
        });
        onUpdate();
      }
    } catch (error) {
      console.error("Failed to refresh price:", error);
    } finally {
      setIsRefreshingPrice(false);
    }
  };

  const handleDeleteAsset = async () => {
    setIsDeleting(true);
    try {
      const success = assetDB.deleteAsset(asset.id);
      if (success) {
        console.log(`✅ Asset ${asset.ticker} deleted successfully`);
        onUpdate();
        onClose();
      } else {
        console.error("❌ Failed to delete asset");
      }
    } catch (error) {
      console.error("❌ Error deleting asset:", error);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 75) return "text-green-400";
    if (percentage >= 40) return "text-yellow-400";
    return "text-red-400";
  };

  const getScoreIcon = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 75)
      return <TrendingUp className="w-5 h-5 text-green-400" />;
    if (percentage >= 40) return <Minus className="w-5 h-5 text-yellow-400" />;
    return <TrendingDown className="w-5 h-5 text-red-400" />;
  };

  const formatPrice = (price: number) => {
    if (price < 0.01) return `$${price.toFixed(6)}`;
    if (price < 1) return `$${price.toFixed(4)}`;
    if (price < 100) return `$${price.toFixed(2)}`;
    return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getPriceChangeColor = (change: number) => {
    if (change > 0) return "text-green-400";
    if (change < 0) return "text-red-400";
    return "text-gray-400";
  };

  const isPriceStale = () => {
    if (!asset.lastPriceUpdate) return true;
    const now = new Date();
    const updateTime = new Date(asset.lastPriceUpdate);
    const diffMinutes = (now.getTime() - updateTime.getTime()) / (1000 * 60);
    return diffMinutes > 10;
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div>
              <h2 className="text-xl font-bold text-white">{asset.ticker}</h2>
              <p className="text-gray-400 text-sm">{asset.type}</p>
            </div>
            {needsAlert && (
              <div className="bg-orange-500 rounded-full p-2 animate-pulse">
                <AlertTriangle className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-red-400 hover:text-red-300 transition-colors p-1"
              title="Delete asset"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Live Price Section */}
        {asset.livePrice !== undefined && (
          <div className="p-6 border-b border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-white">Live Price</h3>
              <button
                onClick={handleRefreshPrice}
                disabled={isRefreshingPrice}
                className="text-cyan-400 hover:text-cyan-300 disabled:text-gray-500 transition-colors"
                title="Refresh price"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isRefreshingPrice ? "animate-spin" : ""}`}
                />
              </button>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-5 h-5 text-green-400" />
                  <span className="text-white font-bold text-2xl">
                    {formatPrice(asset.livePrice)}
                  </span>
                </div>

                {asset.percentChange24h !== undefined && (
                  <div
                    className={`flex items-center space-x-1 ${getPriceChangeColor(asset.percentChange24h)}`}
                  >
                    {asset.percentChange24h > 0 ? (
                      <TrendingUp className="w-5 h-5" />
                    ) : asset.percentChange24h < 0 ? (
                      <TrendingDown className="w-5 h-5" />
                    ) : (
                      <Minus className="w-5 h-5" />
                    )}
                    <span className="font-bold text-lg">
                      {asset.percentChange24h > 0 ? "+" : ""}
                      {asset.percentChange24h.toFixed(2)}%
                    </span>
                  </div>
                )}
              </div>

              {asset.priceChange24h !== undefined && (
                <div className="text-sm text-gray-400 mb-2">
                  24h Change: {asset.priceChange24h > 0 ? "+" : ""}
                  {formatPrice(Math.abs(asset.priceChange24h))}
                </div>
              )}

              {asset.lastPriceUpdate && (
                <div
                  className={`flex items-center space-x-1 text-xs ${isPriceStale() ? "text-orange-400" : "text-gray-500"}`}
                >
                  <Clock className="w-3 h-3" />
                  <span>
                    {isPriceStale() ? "Stale: " : "Updated: "}
                    {asset.lastPriceUpdate.toLocaleDateString()} at{" "}
                    {asset.lastPriceUpdate.toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Score Overview */}
        <div className="p-4 border-b border-gray-700">
          <div className="text-center mb-2">
            <div className="text-2xl font-bold text-cyan-400 mb-1">
              {asset.totalScore}
            </div>
            <div className="text-gray-400 text-xs mb-1">
              Alpha Score / 9
            </div>
            <div
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRecommendationColor(asset.recommendation)}`}
            >
              {asset.recommendation}
            </div>
          </div>

          {/* Individual Scores - compact */}
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-gray-800/50 rounded-lg">
              <div className="flex items-center space-x-2">
                {getScoreIcon(asset.memeScore, 4)}
                <div>
                  <div className="text-white text-xs font-medium">Meme</div>
                  <div className="text-gray-400 text-xs">Social & Hype</div>
                </div>
              </div>
              <div
                className={`text-base font-bold ${getScoreColor(asset.memeScore, 4)}`}
              >
                {asset.memeScore}/4
              </div>
            </div>

            <div className="flex items-center justify-between p-2 bg-gray-800/50 rounded-lg">
              <div className="flex items-center space-x-2">
                {getScoreIcon(asset.politicalScore, 3)}
                <div>
                  <div className="text-white text-xs font-medium">Political</div>
                  <div className="text-gray-400 text-xs">Regulatory</div>
                </div>
              </div>
              <div
                className={`text-base font-bold ${getScoreColor(asset.politicalScore, 3)}`}
              >
                {asset.politicalScore}/3
              </div>
            </div>

            <div className="flex items-center justify-between p-2 bg-gray-800/50 rounded-lg">
              <div className="flex items-center space-x-2">
                {getScoreIcon(asset.earningsScore, 2)}
                <div>
                  <div className="text-white text-xs font-medium">Earnings</div>
                  <div className="text-gray-400 text-xs">Financials</div>
                </div>
              </div>
              <div
                className={`text-base font-bold ${getScoreColor(asset.earningsScore, 2)}`}
              >
                {asset.earningsScore}/2
              </div>
            </div>
          </div>
        </div>

        {/* GPT Summary */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-white">Alpha Analysis</h3>
            {!isEditingSummary ? (
              <button
                onClick={() => setIsEditingSummary(true)}
                className="text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSaveSummary}
                className="text-green-400 hover:text-green-300 transition-colors"
              >
                <Save className="w-4 h-4" />
              </button>
            )}
          </div>

          {isEditingSummary ? (
            <textarea
              value={summaryText}
              onChange={(e) => setSummaryText(e.target.value)}
              className="w-full bg-gray-800 text-white rounded-lg p-3 border border-gray-600 focus:border-cyan-500 focus:outline-none resize-none"
              rows={4}
              placeholder="Enter your alpha analysis..."
            />
          ) : (
            <p className="text-gray-300 leading-relaxed">
              {asset.gptSummary ||
                "No analysis available. Click edit to add one."}
            </p>
          )}
        </div>

        {/* Prediction Details (inline, after score overview) */}
        {predictions && predictions.some(p => p.ticker === asset.ticker && p.timeframe === selectedTimeframe) && (() => {
          const prediction = predictions.find(p => p.ticker === asset.ticker && p.timeframe === selectedTimeframe);
          if (!prediction) return null;
          return (
            <div className="p-6 border-t border-gray-700">
              <div className="mb-2 flex items-center space-x-2">
                <span className="text-lg font-bold text-purple-400">AI Prediction</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${prediction.prediction === 'Bullish' ? 'bg-green-700/40 text-green-300' : prediction.prediction === 'Bearish' ? 'bg-red-700/40 text-red-300' : 'bg-gray-700/40 text-gray-300'}`}>{prediction.prediction}</span>
                <span className="text-xs text-gray-400">{prediction.timeframe}</span>
              </div>
              <div className="flex gap-1 mb-3">
                {(['24h', '7d', '30d'] as const).map(tf => (
                  <button
                    key={tf}
                    onClick={() => setSelectedTimeframe(tf)}
                    className={`flex-1 py-1 px-2 rounded text-xs font-medium transition-colors ${selectedTimeframe === tf ? 'bg-purple-600 text-white' : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'}`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
              <div className="flex items-center space-x-4 mb-2">
                <div>
                  <div className="text-xs text-gray-400">Confidence</div>
                  <div className="text-xl font-bold text-cyan-400">{prediction.confidence}%</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Expected Move</div>
                  <div className={`text-xl font-bold ${prediction.expectedMove > 0 ? 'text-green-400' : prediction.expectedMove < 0 ? 'text-red-400' : 'text-gray-400'}`}>{prediction.expectedMove > 0 ? '+' : ''}{prediction.expectedMove}%</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Risk</div>
                  <div className="text-sm font-medium text-yellow-300">{prediction.riskLevel}</div>
                </div>
              </div>
              <div className="mt-2">
                <div className="text-xs text-gray-400 mb-1">AI Reasoning:</div>
                <ul className="list-disc list-inside text-xs text-gray-300 space-y-1">
                  {prediction.reasoning.map((reason, i) => <li key={i}>{reason}</li>)}
                </ul>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-60 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-red-700/50 rounded-2xl w-full max-w-sm">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-red-500/20 rounded-full p-2">
                  <Trash2 className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Delete Asset</h3>
                  <p className="text-gray-400 text-sm">
                    This action cannot be undone
                  </p>
                </div>
              </div>

              <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4 mb-6">
                <p className="text-red-300 text-sm">
                  Are you sure you want to delete{" "}
                  <span className="font-bold">{asset.ticker}</span>? This will
                  permanently remove the asset and all its data including
                  pricing history and analysis.
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAsset}
                  disabled={isDeleting}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-700 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Delete</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
