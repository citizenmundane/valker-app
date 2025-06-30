import React from "react";
import { AlertTriangle, Eye, Brain, Plus } from "lucide-react";

interface HeaderProps {
  alertCount: number;
  pendingCount: number;
  onAddAsset: () => void;
  onViewPending: () => void;
  onViewAlerts: () => void;
  onGeneratePredictions: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  alertCount,
  pendingCount,
  onAddAsset,
  onViewPending,
  onViewAlerts,
  onGeneratePredictions,
}) => {
  return (
    <header className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700/50 sticky top-0 z-40">
      <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo and Title */}
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-r from-cyan-500 to-blue-600 p-2 rounded-lg">
            {/* TrendingUp SVG for logo */}
            <svg width="24" height="24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Valker</h1>
            <p className="text-xs text-gray-400">AI Alpha Tracker</p>
          </div>
        </div>
        {/* Top Menu Icons */}
        <div className="flex items-center space-x-2">
          {/* Alerts */}
          <button
            onClick={onViewAlerts}
            className="relative bg-orange-500 hover:bg-orange-600 text-white p-2 rounded-lg transition-colors"
            title="View Alerts"
          >
            <AlertTriangle className="w-5 h-5" />
            {alertCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {alertCount}
              </span>
            )}
          </button>
          {/* Pending */}
          <button
            onClick={onViewPending}
            className="relative bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg transition-colors"
            title="View Pending"
          >
            <Eye className="w-5 h-5" />
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-cyan-400 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </button>
          {/* AI Predictions */}
          <button
            onClick={onGeneratePredictions}
            className="bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-lg transition-colors"
            title="AI Predictions"
          >
            <Brain className="w-5 h-5" />
          </button>
          {/* Add Asset */}
          <button
            onClick={onAddAsset}
            className="bg-cyan-600 hover:bg-cyan-700 text-white p-2 rounded-lg transition-colors"
            title="Add Asset"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};
