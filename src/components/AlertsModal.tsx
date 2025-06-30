import React, { useState, useEffect } from "react";
import {
  X,
  AlertTriangle,
  CheckCircle,
  Eye,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
} from "lucide-react";
import { Asset } from "../types/Asset";
import { assetDB } from "../data/database";
import { getRecommendationColor } from "../utils/scoring";

interface AlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export const AlertsModal: React.FC<AlertsModalProps> = ({
  isOpen,
  onClose,
  onUpdate,
}) => {
  const [alertAssets, setAlertAssets] = useState<Asset[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [processingAssets, setProcessingAssets] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    if (isOpen) {
      loadAlertAssets();
    }
  }, [isOpen]);

  const loadAlertAssets = () => {
    const assets = assetDB.getHighScoreAssets(); // Assets with score >= 6 and !alertSent
    setAlertAssets(assets);
  };

  if (!isOpen) return null;

  const handleMarkAsRead = async (assetId: string) => {
    try {
      setProcessingAssets((prev) => new Set(prev).add(assetId));

      const success = assetDB.markAlertSent(assetId);
      if (success) {
        // Reload alerts from database to ensure consistency
        loadAlertAssets();
        // Call onUpdate to refresh the parent component's alert count
        onUpdate();
      } else {
        console.error("Failed to mark asset as read:", assetId);
      }
    } catch (error) {
      console.error("Error marking asset as read:", error);
    } finally {
      setProcessingAssets((prev) => {
        const newSet = new Set(prev);
        newSet.delete(assetId);
        return newSet;
      });
    }
  };

  const handleBatchMarkAsRead = async () => {
    try {
      setProcessingAssets(new Set(selectedAssets));

      const promises = Array.from(selectedAssets).map((assetId) =>
        assetDB.markAlertSent(assetId),
      );

      await Promise.all(promises);

      // Reload alerts from database to ensure consistency
      loadAlertAssets();
      setSelectedAssets(new Set());
      // Call onUpdate to refresh the parent component's alert count
      onUpdate();
    } catch (error) {
      console.error("Error in batch mark as read:", error);
    } finally {
      setProcessingAssets(new Set());
    }
  };

  const handleSelectAsset = (assetId: string) => {
    setSelectedAssets((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(assetId)) {
        newSet.delete(assetId);
      } else {
        newSet.add(assetId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedAssets.size === alertAssets.length) {
      setSelectedAssets(new Set());
    } else {
      setSelectedAssets(new Set(alertAssets.map((asset) => asset.id)));
    }
  };

  const getAlertReason = (asset: Asset): string => {
    const reasons = [];

    if (asset.totalScore >= 8) {
      reasons.push("Extremely high alpha score");
    } else if (asset.totalScore >= 7) {
      reasons.push("High alpha score");
    } else {
      reasons.push("Above alert threshold");
    }

    if (asset.memeScore >= 4) {
      reasons.push("viral meme potential");
    }

    if (asset.politicalScore >= 3) {
      reasons.push("strong political signals");
    }

    if (asset.earningsScore >= 2) {
      reasons.push("earnings momentum");
    }

    if (asset.unusualVolume) {
      reasons.push("unusual volume spike");
    }

    if (asset.isPoliticalTrade) {
      reasons.push("insider/political activity");
    }

    if (asset.percentChange24h && Math.abs(asset.percentChange24h) > 10) {
      reasons.push(
        `${asset.percentChange24h > 0 ? "+" : ""}${asset.percentChange24h.toFixed(1)}% price movement`,
      );
    }

    return reasons.join(", ");
  };

  const getScoreIcon = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 75)
      return <TrendingUp className="w-4 h-4 text-green-400" />;
    if (percentage >= 40) return <Minus className="w-4 h-4 text-yellow-400" />;
    return <TrendingDown className="w-4 h-4 text-red-400" />;
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

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="bg-orange-500 rounded-xl p-2">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                High-Priority Alerts
              </h2>
              <p className="text-gray-400 text-sm">
                Assets requiring immediate attention (Score ≥ 6)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {selectedAssets.size > 0 && (
              <button
                onClick={handleBatchMarkAsRead}
                disabled={processingAssets.size > 0}
                className="bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                {processingAssets.size > 0 ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Mark {selectedAssets.size} as Read</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
          {alertAssets.length === 0 ? (
            <div className="text-center py-12">
              <AlertTriangle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-300 mb-2">
                No Alerts Available
              </h3>
              <p className="text-gray-500 mb-4">
                All high-priority assets have been reviewed or there are
                currently no assets with scores ≥ 6.
              </p>
              <div className="text-sm text-gray-600">
                <p>Alerts are triggered when assets have:</p>
                <ul className="mt-2 space-y-1">
                  <li>• Total score of 6 or higher</li>
                  <li>• Haven't been marked as read yet</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="p-6">
              {/* Batch Actions */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={
                        selectedAssets.size === alertAssets.length &&
                        alertAssets.length > 0
                      }
                      onChange={handleSelectAll}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-300">
                      Select All ({alertAssets.length})
                    </span>
                  </label>

                  {selectedAssets.size > 0 && (
                    <span className="text-sm text-orange-400">
                      {selectedAssets.size} selected
                    </span>
                  )}
                </div>

                <div className="text-sm text-gray-500">
                  Showing {alertAssets.length} high-priority alert
                  {alertAssets.length !== 1 ? "s" : ""}
                </div>
              </div>

              {/* Alert List */}
              <div className="space-y-4">
                {alertAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className="bg-gray-800/50 border border-orange-500/30 rounded-xl p-4 relative"
                  >
                    {/* Alert Badge */}
                    <div className="absolute -top-2 -right-2 bg-orange-500 rounded-full p-1.5 animate-pulse">
                      <AlertTriangle className="w-3 h-3 text-white" />
                    </div>

                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={selectedAssets.has(asset.id)}
                          onChange={() => handleSelectAsset(asset.id)}
                          className="rounded"
                        />
                        <div className="flex flex-col">
                          <span className="text-white font-bold text-lg">
                            {asset.ticker}
                          </span>
                          <span className="text-gray-400 text-xs">
                            {asset.type}
                          </span>
                        </div>
                        <div
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRecommendationColor(asset.recommendation)}`}
                        >
                          {asset.recommendation}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-2xl font-bold text-orange-400">
                          {asset.totalScore}
                        </div>
                        <div className="text-xs text-gray-400">/ 9</div>
                      </div>
                    </div>

                    {/* Live Price Section */}
                    {asset.livePrice !== undefined && (
                      <div className="mb-4 p-3 bg-gray-900/30 rounded-lg border border-gray-700/30">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-white font-bold text-lg">
                              {formatPrice(asset.livePrice)}
                            </span>
                          </div>

                          {asset.percentChange24h !== undefined && (
                            <div
                              className={`flex items-center space-x-1 ${getPriceChangeColor(asset.percentChange24h)}`}
                            >
                              {asset.percentChange24h > 0 ? (
                                <TrendingUp className="w-4 h-4" />
                              ) : asset.percentChange24h < 0 ? (
                                <TrendingDown className="w-4 h-4" />
                              ) : (
                                <Minus className="w-4 h-4" />
                              )}
                              <span className="font-medium">
                                {asset.percentChange24h > 0 ? "+" : ""}
                                {asset.percentChange24h.toFixed(2)}%
                              </span>
                            </div>
                          )}
                        </div>

                        {asset.lastPriceUpdate && (
                          <div className="flex items-center space-x-1 mt-1 text-xs text-gray-500">
                            <Clock className="w-3 h-3" />
                            <span>
                              Updated:{" "}
                              {asset.lastPriceUpdate.toLocaleTimeString()}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Sources */}
                    {asset.sources && asset.sources.length > 0 && (
                      <div className="flex items-center space-x-2 mb-3">
                        <span className="text-xs text-gray-400">Sources:</span>
                        <div className="flex space-x-2">
                          {asset.sources.map((source, index) => (
                            <span
                              key={index}
                              className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded-full"
                            >
                              {source}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Score Breakdown */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="flex items-center space-x-2">
                        {getScoreIcon(asset.memeScore, 4)}
                        <div>
                          <div className="text-xs text-gray-400">Meme</div>
                          <div className="text-sm font-medium text-white">
                            {asset.memeScore}/4
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {getScoreIcon(asset.politicalScore, 3)}
                        <div>
                          <div className="text-xs text-gray-400">Political</div>
                          <div className="text-sm font-medium text-white">
                            {asset.politicalScore}/3
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {getScoreIcon(asset.earningsScore, 2)}
                        <div>
                          <div className="text-xs text-gray-400">Earnings</div>
                          <div className="text-sm font-medium text-white">
                            {asset.earningsScore}/2
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Alert Reason */}
                    <div className="mb-4 p-3 bg-orange-900/20 border border-orange-700/50 rounded-lg">
                      <div className="text-xs text-orange-300 font-medium mb-1">
                        Alert Reason:
                      </div>
                      <div className="text-sm text-orange-100">
                        {getAlertReason(asset)}
                      </div>
                    </div>

                    {/* Summary */}
                    {asset.gptSummary && (
                      <p className="text-gray-300 text-sm mb-4 leading-relaxed">
                        {asset.gptSummary}
                      </p>
                    )}

                    {/* Actions */}
                    <div className="flex space-x-3">
                      <button
                        onClick={() => handleMarkAsRead(asset.id)}
                        disabled={processingAssets.has(asset.id)}
                        className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                      >
                        {processingAssets.has(asset.id) ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Processing...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            <span>Read</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => {
                          // This would open the asset modal for detailed view
                          onClose();
                          // You could emit an event or call a callback to open the asset modal
                        }}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                      >
                        <Eye className="w-4 h-4" />
                        <span>View Details</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
