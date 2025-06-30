import React, { useState, useEffect } from "react";
import {
  X,
  CheckCircle,
  XCircle,
  RefreshCw,
  Clock,
  Eye,
  Globe,
  AlertCircle,
  Filter,
  Zap,
  Bug,
} from "lucide-react";
import { PendingAsset } from "../types/Asset";
import { assetDB } from "../data/database";
import { dataIngestionService } from "../services/dataIngestionService";
import { getRecommendationColor } from "../utils/scoring";

interface SignalReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

interface DataSourceStatus {
  name: string;
  enabled: boolean;
  lastRun: Date | null;
  nextRun: Date | null;
}

interface FilterState {
  source: string;
  scoreRange: [number, number];
  confidenceRange: [number, number];
  hideOnWatch: boolean;
}

export const SignalReviewModal: React.FC<SignalReviewModalProps> = ({
  isOpen,
  onClose,
  onUpdate,
}) => {
  const [pendingAssets, setPendingAssets] = useState<PendingAsset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<PendingAsset | null>(null);
  const [politicalScore, setPoliticalScore] = useState(0);
  const [earningsScore, setEarningsScore] = useState(0);
  const [customSummary, setCustomSummary] = useState("");
  const [activeTab, setActiveTab] = useState<"signals" | "sources" | "debug">(
    "signals",
  );
  const [dataSources, setDataSources] = useState<DataSourceStatus[]>([]);
  const [isRunningIngestion, setIsRunningIngestion] = useState(false);
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [redditDebugInfo, setRedditDebugInfo] = useState<any>(null);
  const [filters, setFilters] = useState<FilterState>({
    source: "All",
    scoreRange: [0, 9],
    confidenceRange: [0, 100],
    hideOnWatch: true,
  });

  useEffect(() => {
    if (isOpen) {
      loadData();
      loadDebugInfo();
    }
  }, [isOpen]);

  const loadData = () => {
    setPendingAssets(assetDB.getPendingAssets());
    setDataSources(dataIngestionService.getDataSourceStatus());
  };

  const loadDebugInfo = () => {
    const debugInfo = dataIngestionService.getRedditDebugInfo();
    setRedditDebugInfo(debugInfo);
    setDebugMode(debugInfo.debugMode);
  };

  if (!isOpen) return null;

  const handleApprove = (asset: PendingAsset) => {
    setSelectedAsset(asset);
    setPoliticalScore(0);
    setEarningsScore(0);
    setCustomSummary(asset.gptSummary);
  };

  const handleReject = (assetId: string) => {
    assetDB.rejectPendingAsset(assetId);
    setSelectedAssets((prev) => {
      const newSet = new Set(prev);
      newSet.delete(assetId);
      return newSet;
    });
    loadData();
    onUpdate();
  };

  const handleBatchApprove = () => {
    selectedAssets.forEach((assetId) => {
      assetDB.approvePendingAsset(assetId, {
        politicalScore: 0,
        earningsScore: 0,
      });
    });
    setSelectedAssets(new Set());
    loadData();
    onUpdate();
  };

  const handleBatchReject = () => {
    selectedAssets.forEach((assetId) => {
      assetDB.rejectPendingAsset(assetId);
    });
    setSelectedAssets(new Set());
    loadData();
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
    loadData();
    onUpdate();
  };

  const handleRunFullIngestion = async () => {
    setIsRunningIngestion(true);
    try {
      const results = await dataIngestionService.runDataIngestion(true);
      console.log(
        `✅ Manual ingestion complete: ${results.added} new signals from ${results.sources.join(", ")}`,
      );
      loadData();
      onUpdate();
    } catch (error) {
      console.error("❌ Manual ingestion failed:", error);
    } finally {
      setIsRunningIngestion(false);
    }
  };

  const handleRunSingleSource = async (sourceName: string) => {
    try {
      const signals = await dataIngestionService.forceRunSource(sourceName);
      console.log(
        `✅ ${sourceName} scan complete: ${signals.length} signals found`,
      );
      loadData();
      onUpdate();
    } catch (error) {
      console.error(`❌ ${sourceName} scan failed:`, error);
    }
  };

  const handleToggleSource = (sourceName: string, enabled: boolean) => {
    dataIngestionService.toggleDataSource(sourceName, enabled);
    setDataSources(dataIngestionService.getDataSourceStatus());
  };

  const handleToggleDebugMode = () => {
    const newDebugMode = !debugMode;
    setDebugMode(newDebugMode);
    dataIngestionService.setRedditDebugMode(newDebugMode);
    loadDebugInfo();
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

  const getSourceIcon = (source: string) => {
    const icons: Record<string, string> = {
      Reddit: "🔥",
      CoinGecko: "🚀",
      Twitter: "🐦",
      StockTwits: "📊",
      Finviz: "📈",
      QuiverQuant: "🏛️",
      Canadian_MP: "🍁",
      FMP_Earnings: "📅",
      GitHub: "💻",
    };
    return icons[source] || "🔍";
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "text-green-400";
    if (confidence >= 60) return "text-yellow-400";
    return "text-red-400";
  };

  // Apply filters
  const filteredAssets = pendingAssets.filter((asset) => {
    // Source filter
    if (filters.source !== "All" && !asset.sources.includes(filters.source)) {
      return false;
    }

    // Score range filter
    if (
      asset.totalScore < filters.scoreRange[0] ||
      asset.totalScore > filters.scoreRange[1]
    ) {
      return false;
    }

    // Confidence range filter
    if (
      asset.confidence < filters.confidenceRange[0] ||
      asset.confidence > filters.confidenceRange[1]
    ) {
      return false;
    }

    // Hide "On Watch" recommendation filter
    if (filters.hideOnWatch && asset.recommendation === "On Watch") {
      return false;
    }

    return true;
  });

  const uniqueSources = [
    "All",
    ...Array.from(new Set(pendingAssets.flatMap((asset) => asset.sources))),
  ];
  const lowConfidenceAssets = filteredAssets.filter(
    (asset) => asset.confidence < 70,
  );

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="bg-purple-500 rounded-xl p-2">
              <Eye className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                Signal Review Center
              </h2>
              <p className="text-gray-400 text-sm">
                Review and manage AI-discovered trading signals
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleRunFullIngestion}
              disabled={isRunningIngestion}
              className="bg-purple-500 hover:bg-purple-600 disabled:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
            >
              <RefreshCw
                className={`w-4 h-4 ${isRunningIngestion ? "animate-spin" : ""}`}
              />
              <span>
                {isRunningIngestion ? "Scanning..." : "Run Full Scan"}
              </span>
            </button>

            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab("signals")}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === "signals"
                ? "text-purple-400 border-b-2 border-purple-400"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Pending Signals ({filteredAssets.length})
          </button>
          <button
            onClick={() => setActiveTab("sources")}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === "sources"
                ? "text-purple-400 border-b-2 border-purple-400"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Data Sources ({dataSources.length})
          </button>
          <button
            onClick={() => setActiveTab("debug")}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === "debug"
                ? "text-purple-400 border-b-2 border-purple-400"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <div className="flex items-center space-x-2">
              <Bug className="w-4 h-4" />
              <span>Debug Tools</span>
            </div>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
          {activeTab === "signals" ? (
            <div className="p-6">
              {/* Filter Controls */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className="flex items-center space-x-2 bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-2 rounded-lg transition-colors"
                    >
                      <Filter className="w-4 h-4" />
                      <span>Filters</span>
                    </button>

                    {lowConfidenceAssets.length > 0 && (
                      <div className="flex items-center space-x-2 text-orange-400 bg-orange-900/20 px-3 py-2 rounded-lg">
                        <Zap className="w-4 h-4" />
                        <span className="text-sm">
                          {lowConfidenceAssets.length} low confidence signals
                        </span>
                      </div>
                    )}
                  </div>

                  {selectedAssets.size > 0 && (
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-400">
                        {selectedAssets.size} selected
                      </span>
                      <button
                        onClick={handleBatchApprove}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                      >
                        Batch Approve
                      </button>
                      <button
                        onClick={handleBatchReject}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                      >
                        Batch Reject
                      </button>
                    </div>
                  )}
                </div>

                {showFilters && (
                  <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Source Filter */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Source
                        </label>
                        <select
                          value={filters.source}
                          onChange={(e) =>
                            setFilters((prev) => ({
                              ...prev,
                              source: e.target.value,
                            }))
                          }
                          className="w-full bg-gray-700 text-white rounded-lg p-2 border border-gray-600 focus:border-purple-500 focus:outline-none"
                        >
                          {uniqueSources.map((source) => (
                            <option key={source} value={source}>
                              {source === "All" ? "All Sources" : source}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Score Range */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Score Range: {filters.scoreRange[0]}-
                          {filters.scoreRange[1]}
                        </label>
                        <div className="flex space-x-2">
                          <input
                            type="range"
                            min="0"
                            max="9"
                            value={filters.scoreRange[0]}
                            onChange={(e) =>
                              setFilters((prev) => ({
                                ...prev,
                                scoreRange: [
                                  parseInt(e.target.value),
                                  prev.scoreRange[1],
                                ],
                              }))
                            }
                            className="flex-1"
                          />
                          <input
                            type="range"
                            min="0"
                            max="9"
                            value={filters.scoreRange[1]}
                            onChange={(e) =>
                              setFilters((prev) => ({
                                ...prev,
                                scoreRange: [
                                  prev.scoreRange[0],
                                  parseInt(e.target.value),
                                ],
                              }))
                            }
                            className="flex-1"
                          />
                        </div>
                      </div>

                      {/* Confidence Range */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Confidence: {filters.confidenceRange[0]}%-
                          {filters.confidenceRange[1]}%
                        </label>
                        <div className="flex space-x-2">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={filters.confidenceRange[0]}
                            onChange={(e) =>
                              setFilters((prev) => ({
                                ...prev,
                                confidenceRange: [
                                  parseInt(e.target.value),
                                  prev.confidenceRange[1],
                                ],
                              }))
                            }
                            className="flex-1"
                          />
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={filters.confidenceRange[1]}
                            onChange={(e) =>
                              setFilters((prev) => ({
                                ...prev,
                                confidenceRange: [
                                  prev.confidenceRange[0],
                                  parseInt(e.target.value),
                                ],
                              }))
                            }
                            className="flex-1"
                          />
                        </div>
                      </div>

                      {/* Hide On Watch Toggle */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Options
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={filters.hideOnWatch}
                            onChange={(e) =>
                              setFilters((prev) => ({
                                ...prev,
                                hideOnWatch: e.target.checked,
                              }))
                            }
                            className="rounded"
                          />
                          <span className="text-sm text-gray-300">
                            Hide "On Watch" signals
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {filteredAssets.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-300 mb-2">
                    No Signals Match Filters
                  </h3>
                  <p className="text-gray-500">
                    Adjust your filters or run a new scan to discover trending
                    assets
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredAssets.map((asset) => (
                    <div
                      key={asset.id}
                      className="bg-gray-800/50 border border-gray-700 rounded-xl p-4"
                    >
                      <div className="flex items-start justify-between mb-3">
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
                          {asset.recommendation !== "On Watch" && (
                            <div
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRecommendationColor(asset.recommendation)}`}
                            >
                              {asset.recommendation}
                            </div>
                          )}
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
                          <div className="text-lg font-bold text-gray-500">
                            -/3
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-gray-400">Earnings</div>
                          <div className="text-lg font-bold text-gray-500">
                            -/2
                          </div>
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
          ) : activeTab === "sources" ? (
            <div className="p-6">
              <div className="grid gap-4">
                {dataSources.map((source) => (
                  <div
                    key={source.name}
                    className="bg-gray-800/50 border border-gray-700 rounded-xl p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">
                          {getSourceIcon(source.name)}
                        </span>
                        <div>
                          <h3 className="text-white font-medium">
                            {source.name}
                          </h3>
                          <p className="text-gray-400 text-sm">
                            {source.lastRun
                              ? `Last run: ${source.lastRun.toLocaleDateString()} at ${source.lastRun.toLocaleTimeString()}`
                              : "Never run"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => handleRunSingleSource(source.name)}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                        >
                          Run Now
                        </button>

                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={source.enabled}
                            onChange={(e) =>
                              handleToggleSource(source.name, e.target.checked)
                            }
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
                        </label>
                      </div>
                    </div>

                    {source.nextRun && (
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        <span>
                          Next scheduled run:{" "}
                          {source.nextRun.toLocaleDateString()} at{" "}
                          {source.nextRun.toLocaleTimeString()}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-6">
              <div className="space-y-6">
                {/* Debug Mode Toggle */}
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-white font-medium">
                        Reddit Debug Mode
                      </h3>
                      <p className="text-gray-400 text-sm">
                        Enable detailed logging of ticker extraction and
                        validation
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={debugMode}
                        onChange={handleToggleDebugMode}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                    </label>
                  </div>

                  {debugMode && (
                    <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-3">
                      <p className="text-green-300 text-sm">
                        🔍 Debug mode enabled. Check browser console for
                        detailed Reddit scan logs.
                      </p>
                    </div>
                  )}
                </div>

                {/* Ticker Validation Info */}
                {redditDebugInfo && (
                  <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                    <h3 className="text-white font-medium mb-4">
                      Ticker Validation Status
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-3">
                        <div className="text-blue-300 font-medium">
                          Stock Tickers
                        </div>
                        <div className="text-blue-100 text-2xl font-bold">
                          {redditDebugInfo.tickerValidation?.stockCount || 0}
                        </div>
                        <div className="text-blue-400 text-xs">
                          Valid US stock symbols
                        </div>
                      </div>
                      <div className="bg-purple-900/20 border border-purple-700/50 rounded-lg p-3">
                        <div className="text-purple-300 font-medium">
                          Crypto Tickers
                        </div>
                        <div className="text-purple-100 text-2xl font-bold">
                          {redditDebugInfo.tickerValidation?.cryptoCount || 0}
                        </div>
                        <div className="text-purple-400 text-xs">
                          Valid cryptocurrency symbols
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sample Valid Tickers */}
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                  <h3 className="text-white font-medium mb-4">
                    Sample Valid Tickers
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-blue-300 font-medium mb-2">
                        Stock Examples (require $TICKER format)
                      </div>
                      <div className="text-xs text-gray-400 space-x-2">
                        <span className="bg-blue-900/30 px-2 py-1 rounded">
                          $AAPL
                        </span>
                        <span className="bg-blue-900/30 px-2 py-1 rounded">
                          $TSLA
                        </span>
                        <span className="bg-blue-900/30 px-2 py-1 rounded">
                          $GME
                        </span>
                        <span className="bg-blue-900/30 px-2 py-1 rounded">
                          $NVDA
                        </span>
                        <span className="bg-blue-900/30 px-2 py-1 rounded">
                          $SPY
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="text-purple-300 font-medium mb-2">
                        Crypto Examples (crypto subreddits only)
                      </div>
                      <div className="text-xs text-gray-400 space-x-2">
                        <span className="bg-purple-900/30 px-2 py-1 rounded">
                          BTC
                        </span>
                        <span className="bg-purple-900/30 px-2 py-1 rounded">
                          ETH
                        </span>
                        <span className="bg-purple-900/30 px-2 py-1 rounded">
                          DOGE
                        </span>
                        <span className="bg-purple-900/30 px-2 py-1 rounded">
                          PEPE
                        </span>
                        <span className="bg-purple-900/30 px-2 py-1 rounded">
                          SHIB
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Validation Rules */}
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                  <h3 className="text-white font-medium mb-4">
                    Validation Rules
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                      <div>
                        <div className="text-green-300 font-medium">
                          Stock Ticker Extraction
                        </div>
                        <div className="text-gray-400">
                          Only extracts tickers in $TICKER format (e.g., $AAPL,
                          $TSLA)
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-purple-400 rounded-full mt-2"></div>
                      <div>
                        <div className="text-purple-300 font-medium">
                          Crypto Ticker Extraction
                        </div>
                        <div className="text-gray-400">
                          Only from crypto subreddits, filtered against common
                          English words
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                      <div>
                        <div className="text-blue-300 font-medium">
                          Whitelist Validation
                        </div>
                        <div className="text-gray-400">
                          Cross-checked against 1000+ valid stock tickers and
                          500+ crypto symbols
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-orange-400 rounded-full mt-2"></div>
                      <div>
                        <div className="text-orange-300 font-medium">
                          Quality Thresholds
                        </div>
                        <div className="text-gray-400">
                          Minimum 10 mentions for stocks, 5 for crypto
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
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
