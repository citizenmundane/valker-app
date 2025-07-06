import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, AlertCircle, Info } from 'lucide-react';

interface FearGreedData {
  value: number;
  classification: "Extreme Fear" | "Fear" | "Neutral" | "Greed" | "Extreme Greed";
  timestamp: Date;
  change24h?: number;
  change7d?: number;
}

interface FearGreedWidgetProps {
  cryptoData?: FearGreedData;
  stockData?: FearGreedData;
  className?: string;
}

export const FearGreedWidget: React.FC<FearGreedWidgetProps> = ({
  cryptoData,
  stockData,
  className = ""
}) => {
  const [selectedMarket, setSelectedMarket] = useState<'crypto' | 'stock'>('crypto');

  const currentData = selectedMarket === 'crypto' ? cryptoData : stockData;

  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case "Extreme Fear": return "text-red-500";
      case "Fear": return "text-orange-400";
      case "Neutral": return "text-gray-400";
      case "Greed": return "text-green-400";
      case "Extreme Greed": return "text-green-500";
      default: return "text-gray-400";
    }
  };

  const getGaugeColor = (value: number) => {
    if (value <= 20) return "#ef4444"; // red-500
    if (value <= 40) return "#f97316"; // orange-500
    if (value <= 60) return "#6b7280"; // gray-500
    if (value <= 80) return "#22c55e"; // green-500
    return "#16a34a"; // green-600
  };

  const getRecommendation = (value: number) => {
    if (value <= 20) return { text: "Strong Contrarian Buy", icon: TrendingUp, color: "text-green-500" };
    if (value <= 40) return { text: "Contrarian Opportunity", icon: TrendingUp, color: "text-green-400" };
    if (value <= 60) return { text: "Neutral - Wait & Watch", icon: AlertCircle, color: "text-gray-400" };
    if (value <= 80) return { text: "Take Profits", icon: TrendingDown, color: "text-orange-400" };
    return { text: "Strong Sell Signal", icon: TrendingDown, color: "text-red-500" };
  };

  const renderGauge = (value: number) => {
    const angle = (value / 100) * 180; // Half circle
    const color = getGaugeColor(value);
    
    return (
      <div className="relative w-32 h-16 mx-auto">
        {/* Background Arc */}
        <svg className="w-32 h-16" viewBox="0 0 128 64">
          <path
            d="M 8 56 A 48 48 0 0 1 120 56"
            fill="none"
            stroke="#374151"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Value Arc */}
          <path
            d="M 8 56 A 48 48 0 0 1 120 56"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${(angle / 180) * 75.4} 75.4`}
            style={{ transition: 'stroke-dasharray 0.5s ease-in-out' }}
          />
        </svg>
        
        {/* Center Value */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-xl font-bold text-white">{value}</div>
            <div className="text-xs text-gray-400">/ 100</div>
          </div>
        </div>
      </div>
    );
  };

  if (!currentData) {
    return (
      <div className={`bg-gray-800/30 border border-gray-700/50 rounded-lg p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-600 rounded w-3/4 mb-4"></div>
          <div className="w-32 h-16 bg-gray-600 rounded mx-auto mb-4"></div>
          <div className="h-3 bg-gray-600 rounded w-1/2 mx-auto"></div>
        </div>
      </div>
    );
  }

  const recommendation = getRecommendation(currentData.value);

  return (
    <div className={`bg-gray-800/30 border border-gray-700/50 rounded-lg p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white flex items-center space-x-2">
          <span>😱</span>
          <span>Fear & Greed</span>
        </h3>
        
        {/* Market Toggle */}
        <div className="flex bg-gray-700 rounded-lg p-1">
          <button
            onClick={() => setSelectedMarket('crypto')}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              selectedMarket === 'crypto'
                ? 'bg-cyan-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Crypto
          </button>
          <button
            onClick={() => setSelectedMarket('stock')}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              selectedMarket === 'stock'
                ? 'bg-cyan-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
            disabled={!stockData}
          >
            Stock
          </button>
        </div>
      </div>

      {/* Gauge */}
      {renderGauge(currentData.value)}

      {/* Classification */}
      <div className="text-center mb-4">
        <div className={`text-lg font-bold ${getClassificationColor(currentData.classification)}`}>
          {currentData.classification}
        </div>
        <div className="text-xs text-gray-400">
          Updated {currentData.timestamp.toLocaleDateString()}
        </div>
      </div>

      {/* Changes */}
      {(currentData.change24h !== undefined || currentData.change7d !== undefined) && (
        <div className="flex justify-center space-x-4 mb-4 text-sm">
          {currentData.change24h !== undefined && (
            <div className="flex items-center space-x-1">
              <span className="text-gray-400">24h:</span>
              <span className={currentData.change24h >= 0 ? 'text-green-400' : 'text-red-400'}>
                {currentData.change24h >= 0 ? '+' : ''}{currentData.change24h.toFixed(0)}
              </span>
            </div>
          )}
          {currentData.change7d !== undefined && (
            <div className="flex items-center space-x-1">
              <span className="text-gray-400">7d:</span>
              <span className={currentData.change7d >= 0 ? 'text-green-400' : 'text-red-400'}>
                {currentData.change7d >= 0 ? '+' : ''}{currentData.change7d.toFixed(0)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Recommendation */}
      <div className="bg-gray-700/50 rounded-lg p-3">
        <div className={`flex items-center space-x-2 mb-2 ${recommendation.color}`}>
          <recommendation.icon className="w-4 h-4" />
          <span className="font-medium text-sm">{recommendation.text}</span>
        </div>
        
        <div className="text-xs text-gray-400 leading-relaxed">
          {currentData.value <= 20 && "Extreme fear often marks market bottoms. Consider buying quality assets."}
          {currentData.value > 20 && currentData.value <= 40 && "Fear creates opportunities. Look for strong fundamentals."}
          {currentData.value > 40 && currentData.value <= 60 && "Market is balanced. Wait for clearer signals."}
          {currentData.value > 60 && currentData.value <= 80 && "Greed building up. Consider reducing risk and taking profits."}
          {currentData.value > 80 && "Extreme greed often precedes corrections. Consider defensive positioning."}
        </div>
      </div>

      {/* Scale Reference */}
      <div className="mt-3 flex justify-between text-xs text-gray-500">
        <span>0 - Extreme Fear</span>
        <span>50 - Neutral</span>
        <span>100 - Extreme Greed</span>
      </div>
    </div>
  );
};