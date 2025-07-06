import React from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  DollarSign,
  Clock,
} from "lucide-react";
import { Asset } from "../types/Asset";
import { getRecommendationColor, shouldTriggerAlert } from "../utils/scoring";

interface AssetCardProps {
  asset: Asset;
  onClick: () => void;
  onPredict: (ticker: string) => void;
}

export const AssetCard: React.FC<AssetCardProps> = ({ asset, onClick }) => {
  const colorClass = getRecommendationColor(asset.recommendation);
  const needsAlert = shouldTriggerAlert(asset);

  const getScoreIcon = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 75)
      return <TrendingUp className="w-3 h-3 text-green-400" />;
    if (percentage >= 40) return <Minus className="w-3 h-3 text-yellow-400" />;
    return <TrendingDown className="w-3 h-3 text-red-400" />;
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
    <div
      onClick={onClick}
      className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-lg p-3 cursor-pointer 
                 transition-all duration-300 hover:bg-gray-700/50 hover:border-cyan-500/30 hover:shadow-lg hover:shadow-cyan-500/10
                 active:scale-[0.98] relative group"
    >
      {needsAlert && (
        <div className="absolute -top-1 -right-1 bg-orange-500 rounded-full p-1 animate-pulse">
          <AlertTriangle className="w-2.5 h-2.5 text-white" />
        </div>
      )}

      {/* Main Content Row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-3">
          <div className="flex flex-col">
            <span className="text-white font-bold text-base">
              {asset.ticker}
            </span>
            <span className="text-gray-400 text-xs">{asset.type}</span>
          </div>
          <div
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}
          >
            {asset.recommendation}
          </div>
        </div>

        <div className="text-right">
          <div className="text-xl font-bold text-cyan-400">
            {asset.totalScore}
          </div>
          <div className="text-xs text-gray-400">/ 9</div>
        </div>
      </div>

      {/* Price and Scores Row */}
      <div className="flex items-center justify-between">
        {/* Live Price */}
        {asset.livePrice !== undefined ? (
          <div className="flex items-center space-x-2">
            <DollarSign className="w-3 h-3 text-green-400" />
            <span className="text-white font-medium text-sm">
              {formatPrice(asset.livePrice)}
            </span>
            {asset.percentChange24h !== undefined && (
              <div
                className={`flex items-center space-x-1 text-xs ${getPriceChangeColor(asset.percentChange24h)}`}
              >
                {asset.percentChange24h > 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : asset.percentChange24h < 0 ? (
                  <TrendingDown className="w-3 h-3" />
                ) : (
                  <Minus className="w-3 h-3" />
                )}
                <span>
                  {asset.percentChange24h > 0 ? "+" : ""}
                  {asset.percentChange24h.toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-gray-500 text-xs">No price data</div>
        )}

        {/* Score Icons */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1">
            {getScoreIcon(asset.memeScore, 4)}
            <span className="text-xs text-gray-400">{asset.memeScore}</span>
          </div>
          <div className="flex items-center space-x-1">
            {getScoreIcon(asset.politicalScore, 3)}
            <span className="text-xs text-gray-400">
              {asset.politicalScore}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            {getScoreIcon(asset.earningsScore, 2)}
            <span className="text-xs text-gray-400">{asset.earningsScore}</span>
          </div>
        </div>
      </div>

      {/* Summary (truncated) */}
      {asset.gptSummary && (
        <div className="mt-2">
          <p className="text-gray-300 text-xs line-clamp-1 leading-relaxed">
            {asset.gptSummary}
          </p>
        </div>
      )}

      {/* Price update time (if stale) */}
      {asset.lastPriceUpdate && isPriceStale() && (
        <div className="flex items-center space-x-1 mt-1 text-xs text-orange-400">
          <Clock className="w-2.5 h-2.5" />
          <span>Stale data</span>
        </div>
      )}

      {/* Hover hint */}
      <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-xs text-gray-500">Click for details</span>
      </div>
    </div>
  );
};
