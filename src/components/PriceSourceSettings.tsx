import React, { useState, useEffect } from "react";
import {
  X,
  Settings,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { pricingService } from "../services/pricingService";
import { PriceSourceStatus } from "../types/PriceData";

interface CacheEntry {
  symbol: string;
  source: string;
  price: number;
  age: number;
}

interface CacheStats {
  size: number;
  entries: CacheEntry[];
}

interface PriceSourceSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PriceSourceSettings: React.FC<PriceSourceSettingsProps> = ({
  isOpen,
  onClose,
}) => {
  const [providers, setProviders] = useState<PriceSourceStatus[]>([]);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadProviderData();
    }
  }, [isOpen]);

  const loadProviderData = () => {
    const providerStatuses = pricingService.getProviderStatus();
    setProviders(providerStatuses);

    const stats = pricingService.getCacheStats();
    setCacheStats(stats);
  };

  const handleClearCache = () => {
    pricingService.clearCache();
    loadProviderData();
  };

  if (!isOpen) return null;

  const getStatusIcon = (successRate: number, enabled: boolean) => {
    if (!enabled) return <XCircle className="w-5 h-5 text-gray-500" />;
    if (successRate >= 0.9)
      return <CheckCircle className="w-5 h-5 text-green-400" />;
    if (successRate >= 0.7)
      return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
    return <XCircle className="w-5 h-5 text-red-400" />;
  };

  const getStatusColor = (successRate: number, enabled: boolean) => {
    if (!enabled) return "text-gray-500";
    if (successRate >= 0.9) return "text-green-400";
    if (successRate >= 0.7) return "text-yellow-400";
    return "text-red-400";
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-500 rounded-xl p-2">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                Price Data Sources
              </h2>
              <p className="text-gray-400 text-sm">
                Manage and monitor price data providers
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
          <div className="p-6 space-y-6">
            {/* Provider Status */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">
                Provider Status
              </h3>
              <div className="grid gap-4">
                {providers.map((provider, index) => (
                  <div
                    key={index}
                    className="bg-gray-800/50 border border-gray-700 rounded-xl p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(provider.successRate, provider.enabled)}
                        <div>
                          <h4 className="text-white font-medium">
                            {provider.source}
                          </h4>
                          <p className="text-gray-400 text-sm">
                            Priority: {provider.priority}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <div
                          className={`text-lg font-bold ${getStatusColor(provider.successRate, provider.enabled)}`}
                        >
                          {provider.enabled
                            ? `${(provider.successRate * 100).toFixed(1)}%`
                            : "Disabled"}
                        </div>
                        <div className="text-xs text-gray-500">
                          Success Rate
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-gray-400">Avg Response</div>
                        <div className="text-white font-medium">
                          {provider.avgResponseTime}ms
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-400">Requests Today</div>
                        <div className="text-white font-medium">
                          {provider.requestsToday}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-400">Rate Limit</div>
                        <div className="text-white font-medium">
                          {provider.rateLimitRemaining}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-400">Last Used</div>
                        <div className="text-white font-medium">
                          {provider.lastUsed
                            ? provider.lastUsed.toLocaleTimeString()
                            : "Never"}
                        </div>
                      </div>
                    </div>

                    {!provider.enabled && (
                      <div className="mt-3 p-2 bg-gray-700/50 rounded-lg">
                        <p className="text-gray-400 text-xs">
                          This provider is disabled. Enable it in settings to
                          use as a data source.
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Cache Statistics */}
            {cacheStats && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">
                    Cache Statistics
                  </h3>
                  <button
                    onClick={handleClearCache}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                  >
                    Clear Cache
                  </button>
                </div>

                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-cyan-400">
                        {cacheStats.size}
                      </div>
                      <div className="text-xs text-gray-400">Cached Quotes</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-400">
                        {
                          cacheStats.entries.filter(
                            (e: CacheEntry) => e.age < 5 * 60 * 1000,
                          ).length
                        }
                      </div>
                      <div className="text-xs text-gray-400">
                        Fresh (&lt; 5min)
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-400">
                        {
                          cacheStats.entries.filter(
                            (e: CacheEntry) => e.age >= 5 * 60 * 1000,
                          ).length
                        }
                      </div>
                      <div className="text-xs text-gray-400">
                        Stale (&gt; 5min)
                      </div>
                    </div>
                  </div>

                  {cacheStats.entries.length > 0 && (
                    <div>
                      <h4 className="text-white font-medium mb-2">
                        Recent Cache Entries
                      </h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {cacheStats.entries
                          .slice(0, 10)
                          .map((entry: CacheEntry, index: number) => (
                            <div
                              key={index}
                              className="flex items-center justify-between text-sm"
                            >
                              <div className="flex items-center space-x-2">
                                <span className="text-white font-medium">
                                  {entry.symbol}
                                </span>
                                <span className="text-gray-400">
                                  ({entry.source})
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="text-green-400">
                                  ${entry.price.toFixed(2)}
                                </span>
                                <span className="text-gray-500">
                                  {Math.floor(entry.age / 1000)}s ago
                                </span>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Configuration Info */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">
                Configuration
              </h3>
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-400">Fallback Priority</div>
                    <div className="text-white">FMP → Twelve Data → Yahoo</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Cache Duration</div>
                    <div className="text-white">5 minutes</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Max Discrepancy Alert</div>
                    <div className="text-white">0.5%</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Request Timeout</div>
                    <div className="text-white">10 seconds</div>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-blue-900/20 border border-blue-700/50 rounded-lg">
                  <p className="text-blue-300 text-xs">
                    💡 To enable premium data sources, add your API keys to the
                    environment variables: VITE_FMP_API_KEY and
                    VITE_TWELVE_DATA_API_KEY
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
