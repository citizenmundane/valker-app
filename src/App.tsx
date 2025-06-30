import React, { useState, useEffect } from "react";
import {
  Activity,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Brain,
} from "lucide-react";
import { Header } from "./components/Header";
import { AssetCard } from "./components/AssetCard";
import { AssetModal } from "./components/AssetModal";
import { AddAssetForm } from "./components/AddAssetForm";
import { PendingAssetsModal } from "./components/PendingAssetsModal";
import { SignalReviewModal } from "./components/SignalReviewModal";
import { AlertsModal } from "./components/AlertsModal";
import { SettingsModal } from "./components/SettingsModal";
import { PredictionCard } from "./components/PredictionCard";
import PinnedPredictionCard from "./components/PinnedPredictionCard";
import { PredictionModal } from "./components/PredictionModal";
import { Asset } from "./types/Asset";
import { assetDB } from "./data/database";
import { useAssetDiscovery } from "./hooks/useAssetDiscovery";
import { usePricing } from "./hooks/usePricing";
import { usePredictions } from "./hooks/usePredictions";

function App() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
  const [isPendingModalOpen, setIsPendingModalOpen] = useState(false);
  const [isSignalReviewOpen, setIsSignalReviewOpen] = useState(false);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [alertCount, setAlertCount] = useState(0);
  const [showSourcesDetail, setShowSourcesDetail] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "stocks" | "crypto">(
    "all",
  );
  const [hasInitialScan, setHasInitialScan] = useState(false);
  const [isPredictionModalOpen, setIsPredictionModalOpen] = useState(false);

  // Initialize legacy asset discovery (keeping for backward compatibility)
  const { isScanning, triggerManualScan } = useAssetDiscovery();

  // Initialize pricing system
  const { isUpdating: isPriceUpdating } = usePricing();

  // Initialize predictions system
  const {
    predictions,
    pinnedPredictions,
    isGenerating: isGeneratingPredictions,
    generatePrediction,
    pinPrediction,
    unpinPrediction,
    removePrediction,
    clearAllPredictions,
    getUnpinnedPredictions,
  } = usePredictions();

  const loadAssets = () => {
    const allAssets = assetDB.getAllAssets();
    const pendingAssets = assetDB.getPendingAssets();
    const highScoreAssets = assetDB.getHighScoreAssets();

    setAssets(allAssets);
    setPendingCount(pendingAssets.length);
    setAlertCount(highScoreAssets.length);
  };

  useEffect(() => {
    loadAssets();

    // Add some sample assets for testing if none exist
    if (assetDB.getAllAssets().length === 0) {
      console.log("📝 Adding sample assets for testing...");
      const sampleAssets = [
        {
          ticker: "TSLA",
          type: "Stock" as const,
          memeScore: 4,
          politicalScore: 2,
          earningsScore: 1,
          gptSummary:
            "Tesla continues to dominate the EV market with strong delivery numbers and innovative technology.",
        },
        {
          ticker: "BTC",
          type: "Coin" as const,
          memeScore: 4,
          politicalScore: 1,
          earningsScore: 0,
          gptSummary:
            "Bitcoin remains the leading cryptocurrency with strong institutional adoption.",
        },
        {
          ticker: "NVDA",
          type: "Stock" as const,
          memeScore: 3,
          politicalScore: 1,
          earningsScore: 2,
          gptSummary:
            "NVIDIA leads in AI chip technology with strong demand for GPUs.",
        },
        {
          ticker: "ETH",
          type: "Coin" as const,
          memeScore: 3,
          politicalScore: 0,
          earningsScore: 0,
          gptSummary:
            "Ethereum continues to evolve with layer 2 solutions and DeFi growth.",
        },
      ];

      sampleAssets.forEach((asset) => {
        assetDB.createAsset(asset);
      });

      loadAssets();
    }
  }, []);

  // Run initial scan only once on app startup
  useEffect(() => {
    if (!hasInitialScan) {
      console.log("🚀 Running initial scan on app startup...");
      triggerManualScan();
      setHasInitialScan(true);
    }
  }, [hasInitialScan, triggerManualScan]);

  const handleAssetClick = (asset: Asset) => {
    setSelectedAsset(asset);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedAsset(null);
  };

  const handleAssetUpdate = () => {
    loadAssets();
    if (selectedAsset) {
      setSelectedAsset(assetDB.getAssetById(selectedAsset.id) || null);
    }
  };

  const generatePredictionForTicker = async (
    ticker: string,
    timeframe: "24h" | "7d" | "30d",
  ) => {
    await generatePrediction(ticker, timeframe);
  };

  // Determine which scanning system is active
  const isAnyScanning = isScanning || isPriceUpdating;

  // Helper function to get filtered assets based on active tab
  const getFilteredAssets = () => {
    switch (activeTab) {
      case "stocks":
        return assets.filter((asset) => asset.type === "Stock");
      case "crypto":
        return assets.filter((asset) => asset.type === "Coin");
      default:
        return assets;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <Header
        alertCount={alertCount}
        pendingCount={pendingCount}
        onAddAsset={() => setIsAddAssetOpen(true)}
        onViewPending={() => setIsPendingModalOpen(true)}
        onViewAlerts={() => setIsAlertsOpen(true)}
        onGeneratePredictions={() => setIsPredictionModalOpen(true)}
      />

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Streamlined Valker Scan Status */}
        <div className="mb-6">
          <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-4">
            {/* Main Status Row */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium text-white">
                  Valker Scan
                </span>
                {isAnyScanning ? (
                  <span className="text-xs text-cyan-400 flex items-center space-x-1">
                    <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse"></div>
                    <span>Running</span>
                  </span>
                ) : (
                  <span className="text-xs text-green-400">Ready</span>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {/* Rescan Button */}
                <button
                  onClick={triggerManualScan}
                  disabled={isAnyScanning}
                  className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-cyan-700 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1 text-xs"
                  title="Refresh Scan"
                >
                  <RefreshCw
                    className={`w-3 h-3 ${isAnyScanning ? "animate-spin" : ""}`}
                  />
                  <span>Rescan</span>
                </button>

                <button
                  onClick={() => setShowSourcesDetail(!showSourcesDetail)}
                  className="text-cyan-400 hover:text-cyan-300 transition-colors text-xs flex items-center space-x-1"
                >
                  <span>Details</span>
                  {showSourcesDetail ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </button>
              </div>
            </div>

            {/* Stats Row - Show when not scanning */}
            {!isAnyScanning && (
              <div className="flex items-center space-x-4 text-xs text-gray-400 mb-2">
                <span>{assets.length} total tracked</span>
                <span>•</span>
                <span>Ready to scan</span>
              </div>
            )}

            {/* Expandable Details */}
            {showSourcesDetail && (
              <div className="pt-3 border-t border-gray-700/50">
                <div className="text-xs text-gray-500 mb-2">
                  <span className="font-medium text-gray-400">
                    Data Sources:
                  </span>
                </div>
                <div className="text-xs text-gray-500 leading-relaxed">
                  Reddit • CoinGecko • Twitter • StockTwits • Congress Trades •
                  Earnings • GitHub • Finviz • Google Trends
                </div>
              </div>
            )}
          </div>
        </div>

        {assets.length === 0 ? (
          <div className="text-center py-12">
            <Activity className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-300 mb-2">
              No Assets Yet
            </h2>
            <p className="text-gray-500 mb-6">
              Start tracking stocks and coins to detect alpha opportunities
            </p>
            <div className="space-y-3">
              <button
                onClick={() => setIsAddAssetOpen(true)}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-105"
              >
                Add Your First Asset
              </button>
              <button
                onClick={triggerManualScan}
                className="w-full bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium py-3 px-6 rounded-xl transition-colors"
              >
                Scan for Trending Assets
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Tab Navigation */}
            <div className="mb-6">
              <div className="flex space-x-1 bg-gray-800/50 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab("all")}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    activeTab === "all"
                      ? "bg-cyan-600 text-white"
                      : "text-gray-400 hover:text-white hover:bg-gray-700/50"
                  }`}
                >
                  All ({assets.length})
                </button>
                <button
                  onClick={() => setActiveTab("stocks")}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    activeTab === "stocks"
                      ? "bg-cyan-600 text-white"
                      : "text-gray-400 hover:text-white hover:bg-gray-700/50"
                  }`}
                >
                  Stocks ({assets.filter((a) => a.type === "Stock").length})
                </button>
                <button
                  onClick={() => setActiveTab("crypto")}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    activeTab === "crypto"
                      ? "bg-cyan-600 text-white"
                      : "text-gray-400 hover:text-white hover:bg-gray-700/50"
                  }`}
                >
                  Crypto ({assets.filter((a) => a.type === "Coin").length})
                </button>
              </div>
            </div>

            {/* Assets Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {getFilteredAssets().map((asset) => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  onClick={() => handleAssetClick(asset)}
                  onPredict={() => setIsPredictionModalOpen(true)}
                />
              ))}

              {/* Pinned Predictions */}
              {pinnedPredictions.map((prediction, index) => (
                <PinnedPredictionCard
                  key={`pinned-${prediction.ticker}-${index}`}
                  prediction={prediction}
                  onUnpin={() => unpinPrediction(prediction)}
                  onGeneratePrediction={generatePredictionForTicker}
                />
              ))}
            </div>

            {/* AI Predictions Section - Only show if there are unpinned predictions */}
            {getUnpinnedPredictions().length > 0 && (
              <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                    <Brain className="w-5 h-5 text-purple-400" />
                    <span>Recent AI Predictions</span>
                    <span className="text-sm text-gray-400">
                      ({getUnpinnedPredictions().length} unpinned)
                    </span>
                  </h2>
                  <button
                    onClick={() => clearAllPredictions()}
                    className="text-gray-400 hover:text-white text-sm"
                  >
                    Clear All
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {getUnpinnedPredictions().map((prediction, index) => (
                    <PredictionCard
                      key={`${prediction.ticker}-${index}`}
                      prediction={prediction}
                      onClick={() => {
                        const asset = assets.find(
                          (a) => a.ticker === prediction.ticker,
                        );
                        if (asset) handleAssetClick(asset);
                      }}
                      onGenerateTimeframe={generatePredictionForTicker}
                      isGenerating={isGeneratingPredictions}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {isModalOpen && selectedAsset && (
        <AssetModal
          asset={selectedAsset}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onUpdate={handleAssetUpdate}
          onPredict={generatePredictionForTicker}
          predictions={predictions}
        />
      )}

      {isAddAssetOpen && (
        <AddAssetForm
          isOpen={isAddAssetOpen}
          onClose={() => setIsAddAssetOpen(false)}
          onAdd={() => {
            setIsAddAssetOpen(false);
            loadAssets();
          }}
        />
      )}

      {isPendingModalOpen && (
        <PendingAssetsModal
          isOpen={isPendingModalOpen}
          onClose={() => setIsPendingModalOpen(false)}
          onUpdate={() => {
            setIsPendingModalOpen(false);
            loadAssets();
          }}
        />
      )}

      {isSignalReviewOpen && (
        <SignalReviewModal
          isOpen={isSignalReviewOpen}
          onClose={() => setIsSignalReviewOpen(false)}
          onUpdate={() => {
            setIsSignalReviewOpen(false);
            loadAssets();
          }}
        />
      )}

      {isAlertsOpen && (
        <AlertsModal
          isOpen={isAlertsOpen}
          onClose={() => setIsAlertsOpen(false)}
          onUpdate={() => {
            setIsAlertsOpen(false);
            loadAssets();
          }}
        />
      )}

      {isSettingsOpen && (
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      {isPredictionModalOpen && (
        <PredictionModal
          isOpen={isPredictionModalOpen}
          onClose={() => setIsPredictionModalOpen(false)}
          predictions={predictions}
          onGeneratePrediction={generatePredictionForTicker}
          onPinPrediction={pinPrediction}
          onRemovePrediction={removePrediction}
          isGenerating={isGeneratingPredictions}
          knownTickers={assets.map((a) => a.ticker)}
        />
      )}
    </div>
  );
}

export default App;
