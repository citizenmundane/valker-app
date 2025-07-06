import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  Zap,
  TrendingUp,
  Eye,
  Brain,
  BarChart3
} from 'lucide-react';

interface DataSourceStatus {
  name: string;
  status: 'idle' | 'running' | 'success' | 'error';
  lastRun?: Date;
  nextRun?: Date;
  signalsFound?: number;
  error?: string;
}

interface ScanningStats {
  totalSources: number;
  activeSources: number;
  totalSignals: number;
  highConfidenceSignals: number;
  lastFullScan?: Date;
  apiCallsRemaining?: {
    alphaVantage: number;
    total: number;
  };
}

interface ScanningStatusWidgetProps {
  isScanning?: boolean;
  onTriggerScan?: () => void;
  className?: string;
}

export const ScanningStatusWidget: React.FC<ScanningStatusWidgetProps> = ({
  isScanning = false,
  onTriggerScan,
  className = ""
}) => {
  const [sources, setSources] = useState<DataSourceStatus[]>([
    {
      name: 'Reddit Enhanced',
      status: 'idle',
      lastRun: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      signalsFound: 12
    },
    {
      name: 'SEC EDGAR',
      status: 'success',
      lastRun: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      signalsFound: 3
    },
    {
      name: 'Alpha Vantage',
      status: 'idle',
      lastRun: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
      signalsFound: 8
    },
    {
      name: 'Fear & Greed',
      status: 'success',
      lastRun: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
      signalsFound: 2
    },
    {
      name: 'Google Trends Enhanced',
      status: 'idle',
      lastRun: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
      signalsFound: 5
    },
    {
      name: 'CoinGecko',
      status: 'success',
      lastRun: new Date(Date.now() - 20 * 60 * 1000), // 20 minutes ago
      signalsFound: 7
    }
  ]);

  const [stats, setStats] = useState<ScanningStats>({
    totalSources: sources.length,
    activeSources: sources.filter(s => s.status !== 'error').length,
    totalSignals: sources.reduce((sum, s) => sum + (s.signalsFound || 0), 0),
    highConfidenceSignals: 15,
    lastFullScan: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
    apiCallsRemaining: {
      alphaVantage: 18,
      total: 45
    }
  });

  const getSourceIcon = (sourceName: string) => {
    if (sourceName.includes('Reddit')) return '🔍';
    if (sourceName.includes('SEC')) return '📋';
    if (sourceName.includes('Alpha')) return '📊';
    if (sourceName.includes('Fear')) return '😱';
    if (sourceName.includes('Google')) return '📈';
    if (sourceName.includes('CoinGecko')) return '🚀';
    return '📡';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <RefreshCw className="w-3 h-3 animate-spin text-cyan-400" />;
      case 'success': return <CheckCircle className="w-3 h-3 text-green-400" />;
      case 'error': return <AlertCircle className="w-3 h-3 text-red-400" />;
      default: return <Clock className="w-3 h-3 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'border-cyan-400/30 bg-cyan-400/10';
      case 'success': return 'border-green-400/30 bg-green-400/10';
      case 'error': return 'border-red-400/30 bg-red-400/10';
      default: return 'border-gray-400/30 bg-gray-400/10';
    }
  };

  const formatTimeAgo = (date: Date) => {
    const minutes = Math.floor((Date.now() - date.getTime()) / (1000 * 60));
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  useEffect(() => {
    // Simulate real-time updates
    const interval = setInterval(() => {
      if (isScanning) {
        setSources(prev => prev.map(source => ({
          ...source,
          status: Math.random() > 0.7 ? 'running' : source.status
        })));
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isScanning]);

  return (
    <div className={`bg-gray-800/30 border border-gray-700/50 rounded-lg p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white flex items-center space-x-2">
          <Zap className="w-5 h-5 text-cyan-400" />
          <span>Scanning Status</span>
        </h3>
        
        {onTriggerScan && (
          <button
            onClick={onTriggerScan}
            disabled={isScanning}
            className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-cyan-700 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1 text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Scanning...' : 'Scan Now'}</span>
          </button>
        )}
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div className="text-center p-2 bg-gray-700/30 rounded">
          <div className="text-lg font-bold text-cyan-400">{stats.totalSignals}</div>
          <div className="text-xs text-gray-400">Total Signals</div>
        </div>
        <div className="text-center p-2 bg-gray-700/30 rounded">
          <div className="text-lg font-bold text-green-400">{stats.highConfidenceSignals}</div>
          <div className="text-xs text-gray-400">High Confidence</div>
        </div>
        <div className="text-center p-2 bg-gray-700/30 rounded">
          <div className="text-lg font-bold text-white">{stats.activeSources}/{stats.totalSources}</div>
          <div className="text-xs text-gray-400">Sources Active</div>
        </div>
        <div className="text-center p-2 bg-gray-700/30 rounded">
          <div className="text-lg font-bold text-orange-400">{stats.apiCallsRemaining?.alphaVantage || 0}</div>
          <div className="text-xs text-gray-400">API Calls Left</div>
        </div>
      </div>

      {/* Source Status List */}
      <div className="space-y-2">
        <div className="text-sm font-medium text-gray-300 mb-2">Data Sources</div>
        {sources.map((source, index) => (
          <div
            key={index}
            className={`flex items-center justify-between p-2 rounded border ${getStatusColor(source.status)}`}
          >
            <div className="flex items-center space-x-2">
              <span className="text-sm">{getSourceIcon(source.name)}</span>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-white">{source.name}</span>
                <span className="text-xs text-gray-400">
                  {source.lastRun ? formatTimeAgo(source.lastRun) : 'Never'}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {source.signalsFound !== undefined && (
                <span className="text-xs text-cyan-400 bg-cyan-400/20 px-2 py-1 rounded">
                  {source.signalsFound} signals
                </span>
              )}
              {getStatusIcon(source.status)}
            </div>
          </div>
        ))}
      </div>

      {/* Last Full Scan */}
      {stats.lastFullScan && (
        <div className="mt-4 pt-3 border-t border-gray-700/50">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Last full scan:</span>
            <span className="text-cyan-400">{formatTimeAgo(stats.lastFullScan)}</span>
          </div>
        </div>
      )}

      {/* API Usage Warning */}
      {stats.apiCallsRemaining && stats.apiCallsRemaining.alphaVantage < 5 && (
        <div className="mt-3 p-2 bg-orange-500/10 border border-orange-500/30 rounded">
          <div className="flex items-center space-x-2 text-orange-400 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>Low API calls remaining: {stats.apiCallsRemaining.alphaVantage}/25</span>
          </div>
        </div>
      )}
    </div>
  );
};