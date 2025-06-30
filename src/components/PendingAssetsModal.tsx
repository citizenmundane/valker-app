import React, { useState } from "react";
import {
  X,
  CheckCircle,
  XCircle,
  Clock,
  Globe,
  AlertCircle,
} from "lucide-react";
import { PendingAsset } from "../types/Asset";
import { assetDB } from "../data/database";
import { getRecommendationColor } from "../utils/scoring";

interface PendingAssetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export const PendingAssetsModal: React.FC<PendingAssetsModalProps> = ({
  isOpen,
  onClose,
  onUpdate,
}) => {
  const [pendingAssets, setPendingAssets] = useState<PendingAsset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<PendingAsset | null>(null);
  const [politicalScore, setPoliticalScore] = useState(0);
  const [earningsScore, setEarningsScore] = useState(0);
  const [customSummary, setCustomSummary] = useState("");

  React.useEffect(() => {
    if (isOpen) {
      setPendingAssets(assetDB.getPendingAssets());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleApprove = (asset: PendingAsset) => {
    setSelectedAsset(asset);
    setPoliticalScore(0);
    setEarningsScore(0);
    setCustomSummary(asset.gptSummary);
  };

  const handleReject = (assetId: string) => {
    assetDB.rejectPendingAsset(assetId);
    setPendingAssets(assetDB.getPendingAssets());
    onUpdate();
  };

  const handleConfirmApproval = () => {
    if (!selectedAsset) return;

    assetDB.approvePendingAsset(selectedAsset.id, {
      politicalScore,
      earningsScore,
      gptSummary: customSummary,
    });

    setSelectedAsset(null);
    setPendingAssets(assetDB.getPendingAssets());
    onUpdate();
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case "Reddit":
        return "🔥";
      case "CoinGecko":
        return "🚀";
      case "StockTwits":
        return "📈";
      default:
        return "🔍";
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "text-green-400";
    if (confidence >= 60) return "text-yellow-400";
    return "text-red-400";
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="bg-orange-500 rounded-xl p-2">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Pending Assets</h2>
              <p className="text-gray-400 text-sm">
                Review AI-discovered trending assets
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
          {pendingAssets.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-300 mb-2">
                No Pending Assets
              </h3>
              <p className="text-gray-500">
                The AI hasn't discovered any new trending assets yet.
              </p>
            </div>
          ) : (
            <div className="p-6 space-y-4">
              {pendingAssets.map((asset) => (
                <div
                  key={asset.id}
                  className="bg-gray-800/50 border border-gray-700 rounded-xl p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
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

                    <div className="flex items-center space-x-2">
                      <div
                        className={`text-sm font-medium ${getConfidenceColor(asset.confidence)}`}
                      >
                        {asset.confidence.toFixed(0)}% confidence
                      </div>
                    </div>
                  </div>

                  {/* Sources */}
                  <div className="flex items-center space-x-2 mb-3">
                    <Globe className="w-4 h-4 text-gray-400" />
                    <div className="flex space-x-2">
                      {asset.sources.map((source, index) => (
                        <span
                          key={index}
                          className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded-full"
                        >
                          {getSourceIcon(source)} {source}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Scores */}
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className="text-center">
                      <div className="text-xs text-gray-400">Meme</div>
                      <div className="text-lg font-bold text-cyan-400">
                        {asset.memeScore}/4
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-400">Political</div>
                      <div className="text-lg font-bold text-gray-500">-/3</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-400">Earnings</div>
                      <div className="text-lg font-bold text-gray-500">-/2</div>
                    </div>
                  </div>

                  {/* Summary */}
                  <p className="text-gray-300 text-sm mb-4 leading-relaxed">
                    {asset.gptSummary}
                  </p>

                  {/* Discovery info */}
                  <div className="text-xs text-gray-500 mb-4">
                    Discovered: {asset.discoveredAt.toLocaleDateString()} at{" "}
                    {asset.discoveredAt.toLocaleTimeString()}
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-3">
                    <button
                      onClick={() => handleApprove(asset)}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => handleReject(asset.id)}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Approval Modal */}
      {selectedAsset && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-60 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h3 className="text-lg font-bold text-white">
                Approve {selectedAsset.ticker}
              </h3>
              <button
                onClick={() => setSelectedAsset(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Political Score (0-3)
                </label>
                <input
                  type="range"
                  min="0"
                  max="3"
                  value={politicalScore}
                  onChange={(e) => setPoliticalScore(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>0</span>
                  <span className="text-cyan-400 font-medium">
                    {politicalScore}
                  </span>
                  <span>3</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Earnings Score (0-2)
                </label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  value={earningsScore}
                  onChange={(e) => setEarningsScore(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>0</span>
                  <span className="text-cyan-400 font-medium">
                    {earningsScore}
                  </span>
                  <span>2</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Analysis (Optional)
                </label>
                <textarea
                  value={customSummary}
                  onChange={(e) => setCustomSummary(e.target.value)}
                  className="w-full bg-gray-800 text-white rounded-lg p-3 border border-gray-600 focus:border-cyan-500 focus:outline-none resize-none"
                  rows={3}
                  placeholder="Add your analysis..."
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setSelectedAsset(null)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmApproval}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
                >
                  Confirm Approval
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
