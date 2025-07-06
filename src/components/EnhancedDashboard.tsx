import React, { useState, useEffect } from 'react';
import { X, TrendingUp, Shield, Zap, Brain } from 'lucide-react';
import { SignalDashboard } from './SignalDashboard';
import { FearGreedWidget } from './FearGreedWidget';
import { ScanningStatusWidget } from './ScanningStatusWidget';

interface EnhancedDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerScan?: () => void;
  isScanning?: boolean;
}

// Mock data - in real app, this would come from your services
const mockValidatedSignals = [
  {
    ticker: "TSLA",
    type: "Stock" as const,
    overallConfidence: 87,
    crossSourceScore: 85,
    sources: [
      { name: "Reddit Enhanced", confidence: 82, sentiment: 0.75, timestamp: new Date() },
      { name: "SEC EDGAR", confidence: 92, sentiment: 0.8, timestamp: new Date() },
      { name: "Alpha Vantage", confidence: 78, sentiment: 0.7, timestamp: new Date() }
    ],
    validationFlags: {
      multipleSourcesConfirm: true,
      sentimentAlignment: true,
      temporalAlignment: true,
      insiderActivity: true,
      volumeConfirmation: true,
      technicalConfirmation: false
    },
    riskLevel: "LOW" as const,
    recommendation: "STRONG_BUY" as const,
    summary: "Tesla showing strong insider buying activity with aligned social sentiment and unusual volume. High confidence cross-validated signal from 3 sources.",
    conflictingSignals: undefined
  },
  {
    ticker: "NVDA",
    type: "Stock" as const,
    overallConfidence: 78,
    crossSourceScore: 76,
    sources: [
      { name: "Google Trends Enhanced", confidence: 85, sentiment: 0.8, timestamp: new Date() },
      { name: "Alpha Vantage", confidence: 72, sentiment: 0.65, timestamp: new Date() }
    ],
    validationFlags: {
      multipleSourcesConfirm: true,
      sentimentAlignment: true,
      temporalAlignment: true,
      insiderActivity: false,
      volumeConfirmation: true,
      technicalConfirmation: true
    },
    riskLevel: "MEDIUM" as const,
    recommendation: "BUY" as const,
    summary: "NVIDIA trending spike detected with 120% search intensity and unusual volume confirmation. Technical breakout pattern identified.",
    conflictingSignals: undefined
  },
  {
    ticker: "BTC",
    type: "Coin" as const,
    overallConfidence: 65,
    crossSourceScore: 68,
    sources: [
      { name: "Fear & Greed Index", confidence: 75, sentiment: 0.3, timestamp: new Date() },
      { name: "Reddit Enhanced", confidence: 58, sentiment: 0.45, timestamp: new Date() }
    ],
    validationFlags: {
      multipleSourcesConfirm: true,
      sentimentAlignment: false,
      temporalAlignment: true,
      insiderActivity: false,
      volumeConfirmation: false,
      technicalConfirmation: false
    },
    riskLevel: "MEDIUM" as const,
    recommendation: "WATCH" as const,
    summary: "Bitcoin showing extreme fear in sentiment index (18/100) suggesting potential contrarian opportunity, but mixed social signals.",
    conflictingSignals: ["High confidence fear signal conflicts with neutral social sentiment"]
  }
];

const mockFearGreedData = {
  value: 23,
  classification: "Fear" as const,
  timestamp: new Date(),
  change24h: -8,
  change7d: -15
};

export const EnhancedDashboard: React.FC<EnhancedDashboardProps> = ({
  isOpen,
  onClose,
  onTriggerScan,
  isScanning = false
}) => {
  const [activeTab, setActiveTab] = useState<'signals' | 'sentiment' | 'scanning'>('signals');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-cyan-500 to-blue-600 p-2 rounded-lg">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Signal Intelligence Dashboard</h2>
              <p className="text-gray-400">Advanced market analysis and cross-source validation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-700 px-6">
          <button
            onClick={() => setActiveTab('signals')}
            className={`flex items-center space-x-2 px-4 py-3 font-medium transition-colors border-b-2 ${
              activeTab === 'signals'
                ? 'text-cyan-400 border-cyan-400'
                : 'text-gray-400 border-transparent hover:text-white'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Validated Signals</span>
          </button>
          <button
            onClick={() => setActiveTab('sentiment')}
            className={`flex items-center space-x-2 px-4 py-3 font-medium transition-colors border-b-2 ${
              activeTab === 'sentiment'
                ? 'text-cyan-400 border-cyan-400'
                : 'text-gray-400 border-transparent hover:text-white'
            }`}
          >
            <span>😱</span>
            <span>Market Sentiment</span>
          </button>
          <button
            onClick={() => setActiveTab('scanning')}
            className={`flex items-center space-x-2 px-4 py-3 font-medium transition-colors border-b-2 ${
              activeTab === 'scanning'
                ? 'text-cyan-400 border-cyan-400'
                : 'text-gray-400 border-transparent hover:text-white'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>Scanning Status</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'signals' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-cyan-500/10 to-blue-600/10 border border-cyan-500/20 rounded-lg p-4">
                <h3 className="text-lg font-bold text-white mb-2 flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-cyan-400" />
                  <span>Cross-Source Validated Signals</span>
                </h3>
                <p className="text-gray-300 text-sm">
                  Signals verified across multiple data sources with confidence scoring and risk assessment.
                  Only high-quality, validated signals are shown below.
                </p>
              </div>
              
              <SignalDashboard 
                signals={mockValidatedSignals} 
                isLoading={isScanning}
              />
            </div>
          )}

          {activeTab === 'sentiment' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <FearGreedWidget 
                  cryptoData={mockFearGreedData}
                  className="h-fit"
                />
                
                <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-4">
                  <h3 className="text-lg font-bold text-white mb-4">Market Overview</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Crypto Sentiment:</span>
                      <span className="text-orange-400 font-medium">Fear (23/100)</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Stock Sentiment:</span>
                      <span className="text-gray-400 font-medium">Neutral (52/100)</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">VIX Level:</span>
                      <span className="text-yellow-400 font-medium">18.5 (Moderate)</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Market Regime:</span>
                      <span className="text-cyan-400 font-medium">Risk-On</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 p-3 bg-gray-700/50 rounded">
                    <h4 className="text-sm font-medium text-white mb-2">Key Insights</h4>
                    <ul className="text-xs text-gray-300 space-y-1">
                      <li>• Crypto fear at 23/100 suggests contrarian buying opportunity</li>
                      <li>• Stock market showing neutral sentiment with low volatility</li>
                      <li>• Institutional flows remain positive despite retail fear</li>
                      <li>• Technical indicators suggest potential reversal zone</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'scanning' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-purple-500/10 to-pink-600/10 border border-purple-500/20 rounded-lg p-4">
                <h3 className="text-lg font-bold text-white mb-2 flex items-center space-x-2">
                  <Zap className="w-5 h-5 text-purple-400" />
                  <span>Real-Time Data Ingestion</span>
                </h3>
                <p className="text-gray-300 text-sm">
                  Monitor live scanning status across all enhanced data sources. All services use free APIs
                  to maximize signal coverage while minimizing costs.
                </p>
              </div>

              <ScanningStatusWidget 
                isScanning={isScanning}
                onTriggerScan={onTriggerScan}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-4">
                  <h4 className="text-lg font-bold text-white mb-3">Source Performance</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Reddit Enhanced:</span>
                      <span className="text-green-400">98% uptime</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">SEC EDGAR:</span>
                      <span className="text-green-400">100% uptime</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Alpha Vantage:</span>
                      <span className="text-yellow-400">18/25 calls left</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Fear & Greed:</span>
                      <span className="text-green-400">100% uptime</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-4">
                  <h4 className="text-lg font-bold text-white mb-3">Signal Quality</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Cross-Validated:</span>
                      <span className="text-cyan-400">15/37 signals</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">High Confidence:</span>
                      <span className="text-green-400">8 signals (&gt;80%)</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Conflicting:</span>
                      <span className="text-red-400">1 signal flagged</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Accuracy (7d):</span>
                      <span className="text-green-400">73% success rate</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};