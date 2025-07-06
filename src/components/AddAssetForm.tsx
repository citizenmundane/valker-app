import React, { useState } from "react";
import { X, Plus } from "lucide-react";
import { AssetFormData } from "../types/Asset";
import { assetDB } from "../data/database";
import { calculateTotalScore, getRecommendation } from "../utils/scoring";

interface AddAssetFormProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: () => void;
}

export const AddAssetForm: React.FC<AddAssetFormProps> = ({
  isOpen,
  onClose,
  onAdd,
}) => {
  const [formData, setFormData] = useState<AssetFormData>({
    ticker: "",
    type: "Stock",
    memeScore: 0,
    politicalScore: 0,
    earningsScore: 0,
    gptSummary: "",
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.ticker.trim()) return;

    try {
      assetDB.createAsset({
        ...formData,
        ticker: formData.ticker.toUpperCase(),
      });

      // Reset form
      setFormData({
        ticker: "",
        type: "Stock",
        memeScore: 0,
        politicalScore: 0,
        earningsScore: 0,
        gptSummary: "",
      });

      onAdd();
      onClose();
    } catch (error) {
      console.error("Failed to create asset:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to create asset. Please try again.";
      alert(errorMessage);
    }
  };

  const totalScore = calculateTotalScore(
    formData.memeScore,
    formData.politicalScore,
    formData.earningsScore,
  );
  const recommendation = getRecommendation(totalScore);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Add New Asset</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Ticker Symbol
            </label>
            <input
              type="text"
              value={formData.ticker}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, ticker: e.target.value }))
              }
              className="w-full bg-gray-800 text-white rounded-lg p-3 border border-gray-600 focus:border-cyan-500 focus:outline-none uppercase"
              placeholder="e.g. TSLA, BTC"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Asset Type
            </label>
            <select
              value={formData.type}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  type: e.target.value as "Stock" | "Coin",
                }))
              }
              className="w-full bg-gray-800 text-white rounded-lg p-3 border border-gray-600 focus:border-cyan-500 focus:outline-none"
            >
              <option value="Stock">Stock</option>
              <option value="Coin">Coin</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Meme Score (0-4)
            </label>
            <input
              type="range"
              min="0"
              max="4"
              value={formData.memeScore}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  memeScore: parseInt(e.target.value),
                }))
              }
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>0</span>
              <span className="text-cyan-400 font-medium">
                {formData.memeScore}
              </span>
              <span>4</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Political Score (0-3)
            </label>
            <input
              type="range"
              min="0"
              max="3"
              value={formData.politicalScore}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  politicalScore: parseInt(e.target.value),
                }))
              }
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>0</span>
              <span className="text-cyan-400 font-medium">
                {formData.politicalScore}
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
              value={formData.earningsScore}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  earningsScore: parseInt(e.target.value),
                }))
              }
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>0</span>
              <span className="text-cyan-400 font-medium">
                {formData.earningsScore}
              </span>
              <span>2</span>
            </div>
          </div>

          {/* Score Preview */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <div className="text-center">
              <div className="text-2xl font-bold text-cyan-400 mb-1">
                {totalScore}
              </div>
              <div className="text-xs text-gray-400 mb-2">Total Score / 9</div>
              <div className="text-sm text-white font-medium">
                {recommendation}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Alpha Analysis (Optional)
            </label>
            <textarea
              value={formData.gptSummary}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, gptSummary: e.target.value }))
              }
              className="w-full bg-gray-800 text-white rounded-lg p-3 border border-gray-600 focus:border-cyan-500 focus:outline-none resize-none"
              rows={3}
              placeholder="Enter your analysis of this asset's potential..."
            />
          </div>

          <button
            type="submit"
            disabled={!formData.ticker.trim()}
            className="w-full bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Add Asset</span>
          </button>
        </form>
      </div>
    </div>
  );
};
