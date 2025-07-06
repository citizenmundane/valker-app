import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Shield,
  AlertTriangle,
  CheckCircle,
  Eye,
  Brain,
  Zap,
  Target,
  Activity
} from 'lucide-react';

interface SignalSource {
  name: string;
  confidence: number;
  sentiment: number;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

interface ValidatedSignal {
  ticker: string;
  type: "Stock" | "Coin";
  overallConfidence: number;
  crossSourceScore: number;
  sources: SignalSource[];
  validationFlags: {
    multipleSourcesConfirm: boolean;
    sentimentAlignment: boolean;
    temporalAlignment: boolean;
    volumeConfirmation?: boolean;
    insiderActivity?: boolean;
    technicalConfirmation?: boolean;
  };
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  recommendation: "STRONG_BUY" | "BUY" | "WATCH" | "AVOID";
  summary: string;
  conflictingSignals?: string[];
}

interface SignalDashboardProps {
  signals: ValidatedSignal[];
  isLoading?: boolean;
}

export const SignalDashboard: React.FC<SignalDashboardProps> = ({ 
  signals, 
  isLoading = false 
}) => {
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<"ALL" | "LOW" | "MEDIUM" | "HIGH">("ALL");
  const [selectedRecommendation, setSelectedRecommendation] = useState<"ALL" | "STRONG_BUY" | "BUY" | "WATCH" | "AVOID">("ALL");

  const filteredSignals = signals.filter(signal => {
    if (selectedRiskLevel !== "ALL" && signal.riskLevel !== selectedRiskLevel) return false;
    if (selectedRecommendation !== "ALL" && signal.recommendation !== selectedRecommendation) return false;
    return true;
  });

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case "LOW": return "text-green-400 bg-green-400/10 border-green-400/20";
      case "MEDIUM": return "text-yellow-400 bg-yellow-400/10 border-yellow-400/20";
      case "HIGH": return "text-red-400 bg-red-400/10 border-red-400/20";
      default: return "text-gray-400 bg-gray-400/10 border-gray-400/20";
    }
  };

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case "STRONG_BUY": return "text-green-500 bg-green-500/10";
      case "BUY": return "text-green-400 bg-green-400/10";
      case "WATCH": return "text-yellow-400 bg-yellow-400/10";
      case "AVOID": return "text-red-400 bg-red-400/10";
      default: return "text-gray-400 bg-gray-400/10";
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "text-green-400";
    if (confidence >= 60) return "text-yellow-400";
    return "text-red-400";
  };

  const renderValidationFlags = (flags: ValidatedSignal['validationFlags']) => {
    const flagItems = [
      { key: 'multipleSourcesConfirm', label: 'Multi-Source', icon: CheckCircle },
      { key: 'sentimentAlignment', label: 'Sentiment Aligned', icon: Target },
      { key: 'temporalAlignment', label: 'Time Aligned', icon: Activity },
      { key: 'insiderActivity', label: 'Insider Activity', icon: Eye },
      { key: 'volumeConfirmation', label: 'Volume Spike', icon: TrendingUp },
      { key: 'technicalConfirmation', label: 'Technical', icon: Brain },
    ];

    return (
      <div className="flex flex-wrap gap-1 mt-2">
        {flagItems.map(({ key, label, icon: Icon }) => {
          const isActive = flags[key as keyof typeof flags];
          return (
            <div
              key={key}
              className={`flex items-center space-x-1 px-2 py-1 rounded text-xs border ${
                isActive 
                  ? 'text-green-400 bg-green-400/10 border-green-400/30' 
                  : 'text-gray-500 bg-gray-500/10 border-gray-500/20'
              }`}
              title={label}
            >
              <Icon className="w-3 h-3" />
              <span className="hidden sm:inline">{label}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const stats = {
    total: signals.length,
    highConfidence: signals.filter(s => s.overallConfidence >= 80).length,
    lowRisk: signals.filter(s => s.riskLevel === "LOW").length,
    strongBuy: signals.filter(s => s.recommendation === "STRONG_BUY").length,
  };

  if (isLoading) {
    return (
      <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-600 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Header */}
      <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-4">
        <h2 className="text-lg font-bold text-white mb-3 flex items-center space-x-2">
          <Zap className="w-5 h-5 text-cyan-400" />
          <span>Signal Intelligence Dashboard</span>
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-cyan-400">{stats.total}</div>
            <div className="text-xs text-gray-400">Total Signals</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">{stats.highConfidence}</div>
            <div className="text-xs text-gray-400">High Confidence</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">{stats.lowRisk}</div>
            <div className="text-xs text-gray-400">Low Risk</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-500">{stats.strongBuy}</div>
            <div className="text-xs text-gray-400">Strong Buy</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <select
            value={selectedRiskLevel}
            onChange={(e) => setSelectedRiskLevel(e.target.value as any)}
            className="bg-gray-700 text-white rounded px-3 py-1 text-sm border border-gray-600"
          >
            <option value="ALL">All Risk Levels</option>
            <option value="LOW">Low Risk</option>
            <option value="MEDIUM">Medium Risk</option>
            <option value="HIGH">High Risk</option>
          </select>
          
          <select
            value={selectedRecommendation}
            onChange={(e) => setSelectedRecommendation(e.target.value as any)}
            className="bg-gray-700 text-white rounded px-3 py-1 text-sm border border-gray-600"
          >
            <option value="ALL">All Recommendations</option>
            <option value="STRONG_BUY">Strong Buy</option>
            <option value="BUY">Buy</option>
            <option value="WATCH">Watch</option>
            <option value="AVOID">Avoid</option>
          </select>
        </div>
      </div>

      {/* Signal List */}
      <div className="space-y-3">
        {filteredSignals.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
            <p>No signals match your filters</p>
          </div>
        ) : (
          filteredSignals.map((signal, index) => (
            <div
              key={`${signal.ticker}-${index}`}
              className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 hover:bg-gray-700/50 transition-colors"
            >
              {/* Header Row */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="flex flex-col">
                    <span className="text-lg font-bold text-white">{signal.ticker}</span>
                    <span className="text-xs text-gray-400">{signal.type}</span>
                  </div>
                  
                  {/* Risk Level Badge */}
                  <div className={`px-2 py-1 rounded border text-xs font-medium ${getRiskColor(signal.riskLevel)}`}>
                    <Shield className="w-3 h-3 inline mr-1" />
                    {signal.riskLevel}
                  </div>
                  
                  {/* Recommendation Badge */}
                  <div className={`px-2 py-1 rounded text-xs font-medium ${getRecommendationColor(signal.recommendation)}`}>
                    {signal.recommendation}
                  </div>
                </div>

                {/* Confidence Score */}
                <div className="text-right">
                  <div className={`text-xl font-bold ${getConfidenceColor(signal.overallConfidence)}`}>
                    {signal.overallConfidence.toFixed(0)}%
                  </div>
                  <div className="text-xs text-gray-400">Confidence</div>
                </div>
              </div>

              {/* Sources Row */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-300">Sources:</span>
                  <div className="flex space-x-1">
                    {signal.sources.slice(0, 3).map((source, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded text-xs"
                        title={source.name}
                      >
                        {source.name.split(' ')[0]}
                      </span>
                    ))}
                    {signal.sources.length > 3 && (
                      <span className="px-2 py-1 bg-gray-500/20 text-gray-400 rounded text-xs">
                        +{signal.sources.length - 3}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-sm text-gray-400">
                  Cross-Score: <span className="text-cyan-400">{signal.crossSourceScore.toFixed(0)}</span>
                </div>
              </div>

              {/* Summary */}
              <p className="text-sm text-gray-300 mb-3">{signal.summary}</p>

              {/* Validation Flags */}
              {renderValidationFlags(signal.validationFlags)}

              {/* Conflicting Signals Warning */}
              {signal.conflictingSignals && signal.conflictingSignals.length > 0 && (
                <div className="mt-3 p-2 bg-red-500/10 border border-red-500/30 rounded">
                  <div className="flex items-center space-x-2 text-red-400 text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Conflicting Signals Detected:</span>
                  </div>
                  <ul className="text-xs text-red-300 mt-1 ml-6">
                    {signal.conflictingSignals.map((conflict, i) => (
                      <li key={i}>• {conflict}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};