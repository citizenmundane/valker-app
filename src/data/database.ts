import {
  Asset,
  AssetFormData,
  PendingAsset,
  TrendingData,
} from "../types/Asset";
import { calculateTotalScore, getRecommendation } from "../utils/scoring";

const STORAGE_KEY = "alpha_machine_assets";
const PENDING_STORAGE_KEY = "alpha_machine_pending_assets";

class AssetDatabase {
  private assets: Asset[] = [];
  private pendingAssets: PendingAsset[] = [];

  constructor() {
    this.loadFromStorage();
    if (this.assets.length === 0) {
      this.seedData();
    }
    // Run cleanup on initialization
    this.runOnWatchAssetCleanup();
  }

  private loadFromStorage(): void {
    // Load confirmed assets
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        this.assets = JSON.parse(stored).map((asset: any) => ({
          ...asset,
          createdAt: new Date(asset.createdAt),
          updatedAt: new Date(asset.updatedAt),
          lastPriceUpdate: asset.lastPriceUpdate
            ? new Date(asset.lastPriceUpdate)
            : undefined,
          // Ensure numeric fields are properly handled
          livePrice:
            typeof asset.livePrice === "number" ? asset.livePrice : undefined,
          priceChange24h:
            typeof asset.priceChange24h === "number"
              ? asset.priceChange24h
              : undefined,
          percentChange24h:
            typeof asset.percentChange24h === "number"
              ? asset.percentChange24h
              : undefined,
          // Ensure new fields have defaults
          sources: asset.sources || [],
          unusualVolume: asset.unusualVolume || false,
          isPoliticalTrade: asset.isPoliticalTrade || false,
          isEarningsBased: asset.isEarningsBased || false,
          visibility: asset.visibility || "visible",
        }));
      } catch (error) {
        console.error("Failed to load assets from storage:", error);
        this.assets = [];
      }
    }

    // Load pending assets
    const pendingStored = localStorage.getItem(PENDING_STORAGE_KEY);
    if (pendingStored) {
      try {
        this.pendingAssets = JSON.parse(pendingStored).map((asset: any) => ({
          ...asset,
          discoveredAt: new Date(asset.discoveredAt),
          // Ensure new fields have defaults
          unusualVolume: asset.unusualVolume || false,
          isPoliticalTrade: asset.isPoliticalTrade || false,
          isEarningsBased: asset.isEarningsBased || false,
          visibility: asset.visibility || "visible",
        }));
      } catch (error) {
        console.error("Failed to load pending assets from storage:", error);
        this.pendingAssets = [];
      }
    }
  }

  private saveToStorage(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.assets));
    localStorage.setItem(
      PENDING_STORAGE_KEY,
      JSON.stringify(this.pendingAssets),
    );
  }

  private seedData(): void {
    const seedAssets: AssetFormData[] = [
      {
        ticker: "TSLA",
        type: "Stock",
        memeScore: 4,
        politicalScore: 2,
        earningsScore: 2,
        gptSummary:
          "Tesla showing strong momentum with Elon's political influence and solid earnings. High meme potential with retail investor buzz.",
        sources: ["Reddit", "Financial Modeling Prep"],
        isPoliticalTrade: true,
      },
      {
        ticker: "DOGE",
        type: "Coin",
        memeScore: 4,
        politicalScore: 3,
        earningsScore: 0,
        gptSummary:
          "Dogecoin riding high on political endorsements and social media buzz. Pure meme play with strong community backing.",
        sources: ["Reddit", "CoinGecko"],
        isPoliticalTrade: true,
      },
      {
        ticker: "NVDA",
        type: "Stock",
        memeScore: 2,
        politicalScore: 1,
        earningsScore: 2,
        gptSummary:
          "NVIDIA benefiting from AI hype but earnings momentum slowing. Moderate meme status in tech circles.",
        sources: ["Financial Modeling Prep"],
        isEarningsBased: true,
      },
      {
        ticker: "BTC",
        type: "Coin",
        memeScore: 3,
        politicalScore: 2,
        earningsScore: 1,
        gptSummary:
          "Bitcoin maintaining institutional interest with political tailwinds. Store of value narrative strong but volatility remains.",
        sources: ["CoinGecko", "Reddit"],
      },
    ];

    seedAssets.forEach((data) => this.createAsset(data));
  }

  // Retention criteria check for "On Watch" assets
  private meetsRetentionCriteria(asset: Asset | PendingAsset): boolean {
    // Criteria 1: memeScore >= 2
    if (asset.memeScore >= 2) {
      return true;
    }

    // Criteria 2: Mentioned by 2 or more distinct signal sources
    if (asset.sources && asset.sources.length >= 2) {
      return true;
    }

    // Criteria 3: unusualVolume === true
    if (asset.unusualVolume === true) {
      return true;
    }

    // Criteria 4: Tagged as political trade or earnings-based signal
    if (asset.isPoliticalTrade === true || asset.isEarningsBased === true) {
      return true;
    }

    return false;
  }

  // Run cleanup for "On Watch" assets that don't meet retention criteria
  runOnWatchAssetCleanup(): { deletedAssets: number; deletedPending: number } {
    console.log("🧹 Running On Watch asset cleanup...");

    const initialAssetCount = this.assets.length;
    const initialPendingCount = this.pendingAssets.length;

    // Clean up confirmed assets
    this.assets = this.assets.filter((asset) => {
      if (
        asset.recommendation === "On Watch" &&
        !this.meetsRetentionCriteria(asset)
      ) {
        console.log(
          `🗑️ Deleting On Watch asset: ${asset.ticker} (no retention criteria met)`,
        );
        return false;
      }
      return true;
    });

    // Clean up pending assets
    this.pendingAssets = this.pendingAssets.filter((asset) => {
      if (
        asset.recommendation === "On Watch" &&
        !this.meetsRetentionCriteria(asset)
      ) {
        console.log(
          `🗑️ Deleting On Watch pending asset: ${asset.ticker} (no retention criteria met)`,
        );
        return false;
      }
      return true;
    });

    const deletedAssets = initialAssetCount - this.assets.length;
    const deletedPending = initialPendingCount - this.pendingAssets.length;

    if (deletedAssets > 0 || deletedPending > 0) {
      this.saveToStorage();
      console.log(
        `✅ Cleanup complete: Deleted ${deletedAssets} confirmed assets and ${deletedPending} pending assets`,
      );
    } else {
      console.log("✅ Cleanup complete: No assets needed deletion");
    }

    return { deletedAssets, deletedPending };
  }

  // Existing methods with updates for new fields
  getAllAssets(): Asset[] {
    return [...this.assets]
      .filter((asset) => asset.visibility !== "hidden")
      .sort((a, b) => b.totalScore - a.totalScore);
  }

  getAssetById(id: string): Asset | undefined {
    return this.assets.find((asset) => asset.id === id);
  }

  getAssetByTicker(ticker: string): Asset | undefined {
    return this.assets.find((asset) => asset.ticker === ticker);
  }

  createAsset(data: AssetFormData): Asset {
    const totalScore = calculateTotalScore(
      data.memeScore,
      data.politicalScore,
      data.earningsScore,
    );
    const recommendation = getRecommendation(totalScore);

    const asset: Asset = {
      id: Date.now().toString(),
      ...data,
      totalScore,
      recommendation,
      alertSent: false,
      sources: data.sources || [],
      unusualVolume: data.unusualVolume || false,
      isPoliticalTrade: data.isPoliticalTrade || false,
      isEarningsBased: data.isEarningsBased || false,
      visibility: "visible",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Check if this is an "On Watch" asset that should be auto-deleted
    if (recommendation === "On Watch" && !this.meetsRetentionCriteria(asset)) {
      console.log(
        `🗑️ Auto-deleting On Watch asset: ${asset.ticker} (no retention criteria met)`,
      );
      return asset; // Return but don't save
    }

    this.assets.push(asset);
    this.saveToStorage();
    return asset;
  }

  updateAsset(id: string, updates: Partial<AssetFormData>): Asset | null {
    const index = this.assets.findIndex((asset) => asset.id === id);
    if (index === -1) return null;

    const asset = this.assets[index];
    const updatedData = { ...asset, ...updates };

    if (
      "memeScore" in updates ||
      "politicalScore" in updates ||
      "earningsScore" in updates
    ) {
      updatedData.totalScore = calculateTotalScore(
        updatedData.memeScore,
        updatedData.politicalScore,
        updatedData.earningsScore,
      );
      updatedData.recommendation = getRecommendation(updatedData.totalScore);
    }

    updatedData.updatedAt = new Date();

    // Check if updated asset should be auto-deleted
    if (
      updatedData.recommendation === "On Watch" &&
      !this.meetsRetentionCriteria(updatedData)
    ) {
      console.log(
        `🗑️ Auto-deleting updated On Watch asset: ${updatedData.ticker} (no retention criteria met)`,
      );
      this.assets.splice(index, 1);
      this.saveToStorage();
      return null;
    }

    this.assets[index] = updatedData;
    this.saveToStorage();
    return updatedData;
  }

  // New method for updating pricing data
  updateAssetPricing(
    ticker: string,
    priceData: {
      livePrice: number;
      priceChange24h: number;
      percentChange24h: number;
      lastPriceUpdate: Date;
    },
  ): boolean {
    const asset = this.assets.find((a) => a.ticker === ticker);
    if (!asset) return false;

    asset.livePrice = priceData.livePrice;
    asset.priceChange24h = priceData.priceChange24h;
    asset.percentChange24h = priceData.percentChange24h;
    asset.lastPriceUpdate = priceData.lastPriceUpdate;
    asset.updatedAt = new Date();

    this.saveToStorage();
    return true;
  }

  markAlertSent(id: string): boolean {
    const asset = this.assets.find((a) => a.id === id);
    if (!asset) return false;

    asset.alertSent = true;
    asset.updatedAt = new Date();
    this.saveToStorage();

    console.log(`✅ Marked alert as sent for ${asset.ticker}`);
    return true;
  }

  deleteAsset(id: string): boolean {
    const index = this.assets.findIndex((asset) => asset.id === id);
    if (index === -1) return false;

    this.assets.splice(index, 1);
    this.saveToStorage();
    return true;
  }

  getHighScoreAssets(): Asset[] {
    return this.getUnreadAlerts();
  }

  // Enhanced methods for pending assets with cleanup logic
  addPendingAsset(trendingData: TrendingData): PendingAsset {
    // Check if asset already exists in confirmed or pending
    const existsInConfirmed = this.assets.some(
      (asset) => asset.ticker === trendingData.ticker,
    );
    const existsInPending = this.pendingAssets.some(
      (asset) => asset.ticker === trendingData.ticker,
    );

    if (existsInConfirmed || existsInPending) {
      throw new Error(`Asset ${trendingData.ticker} already exists`);
    }

    const totalScore = calculateTotalScore(trendingData.memeScore, 0, 0); // Only meme score from discovery
    const recommendation = getRecommendation(totalScore);

    const pendingAsset: PendingAsset = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      ticker: trendingData.ticker,
      type: trendingData.type,
      memeScore: trendingData.memeScore,
      politicalScore: 0, // Will be set manually during approval
      earningsScore: 0, // Will be set manually during approval
      totalScore,
      recommendation,
      gptSummary: trendingData.summary,
      sources: trendingData.sources,
      confidence: trendingData.confidence,
      discoveredAt: new Date(),
      status: "pending",
      unusualVolume: trendingData.unusualVolume || false,
      isPoliticalTrade: trendingData.isPoliticalTrade || false,
      isEarningsBased: trendingData.isEarningsBased || false,
      visibility: "visible",
    };

    // Check if this is an "On Watch" asset that should be auto-deleted
    if (
      recommendation === "On Watch" &&
      !this.meetsRetentionCriteria(pendingAsset)
    ) {
      console.log(
        `🗑️ Auto-rejecting On Watch pending asset: ${pendingAsset.ticker} (no retention criteria met)`,
      );
      throw new Error(
        `Asset ${trendingData.ticker} auto-rejected (On Watch with no retention criteria)`,
      );
    }

    this.pendingAssets.push(pendingAsset);
    this.saveToStorage();
    return pendingAsset;
  }

  getPendingAssets(): PendingAsset[] {
    return this.pendingAssets
      .filter(
        (asset) => asset.status === "pending" && asset.visibility !== "hidden",
      )
      .sort((a, b) => b.confidence - a.confidence);
  }

  approvePendingAsset(
    id: string,
    additionalData?: Partial<AssetFormData>,
  ): Asset | null {
    const pendingIndex = this.pendingAssets.findIndex(
      (asset) => asset.id === id,
    );
    if (pendingIndex === -1) return null;

    const pending = this.pendingAssets[pendingIndex];

    // Create confirmed asset
    const assetData: AssetFormData = {
      ticker: pending.ticker,
      type: pending.type,
      memeScore: pending.memeScore,
      politicalScore: additionalData?.politicalScore ?? 0,
      earningsScore: additionalData?.earningsScore ?? 0,
      gptSummary: additionalData?.gptSummary ?? pending.gptSummary,
      sources: pending.sources,
      unusualVolume: pending.unusualVolume,
      isPoliticalTrade: pending.isPoliticalTrade,
      isEarningsBased: pending.isEarningsBased,
    };

    const confirmedAsset = this.createAsset(assetData);

    // Mark pending as approved
    pending.status = "approved";
    this.saveToStorage();

    return confirmedAsset;
  }

  rejectPendingAsset(id: string): boolean {
    const pendingIndex = this.pendingAssets.findIndex(
      (asset) => asset.id === id,
    );
    if (pendingIndex === -1) return false;

    this.pendingAssets[pendingIndex].status = "rejected";
    this.saveToStorage();
    return true;
  }

  getPendingAssetById(id: string): PendingAsset | undefined {
    return this.pendingAssets.find((asset) => asset.id === id);
  }

  processTrendingAssets(trendingAssets: TrendingData[]): {
    added: number;
    skipped: number;
    autoRejected: number;
  } {
    let added = 0;
    let skipped = 0;
    let autoRejected = 0;

    trendingAssets.forEach((trending) => {
      try {
        this.addPendingAsset(trending);
        added++;
      } catch (error) {
        if (error instanceof Error && error.message.includes("auto-rejected")) {
          autoRejected++;
        } else {
          skipped++;
        }
      }
    });

    if (autoRejected > 0) {
      console.log(
        `🧹 Auto-rejected ${autoRejected} On Watch assets during ingestion`,
      );
    }

    return { added, skipped, autoRejected };
  }

  // Get assets that need price updates
  getAssetsForPriceUpdate(): { ticker: string; type: "Stock" | "Coin" }[] {
    return this.assets.map((asset) => ({
      ticker: asset.ticker,
      type: asset.type,
    }));
  }

  // Get pricing statistics
  getPricingStats() {
    const assetsWithPrices = this.assets.filter(
      (asset) => asset.livePrice !== undefined,
    );
    const totalAssets = this.assets.length;
    const lastUpdate = this.assets
      .filter((asset) => asset.lastPriceUpdate)
      .sort(
        (a, b) =>
          (b.lastPriceUpdate?.getTime() || 0) -
          (a.lastPriceUpdate?.getTime() || 0),
      )[0]?.lastPriceUpdate;

    return {
      totalAssets,
      assetsWithPrices: assetsWithPrices.length,
      coveragePercent:
        totalAssets > 0 ? (assetsWithPrices.length / totalAssets) * 100 : 0,
      lastUpdate,
    };
  }

  // Get cleanup statistics
  getCleanupStats() {
    const onWatchAssets = this.assets.filter(
      (asset) => asset.recommendation === "On Watch",
    );
    const onWatchPending = this.pendingAssets.filter(
      (asset) => asset.recommendation === "On Watch",
    );

    const retainedOnWatchAssets = onWatchAssets.filter((asset) =>
      this.meetsRetentionCriteria(asset),
    );
    const retainedOnWatchPending = onWatchPending.filter((asset) =>
      this.meetsRetentionCriteria(asset),
    );

    return {
      totalOnWatchAssets: onWatchAssets.length,
      totalOnWatchPending: onWatchPending.length,
      retainedOnWatchAssets: retainedOnWatchAssets.length,
      retainedOnWatchPending: retainedOnWatchPending.length,
      eligibleForDeletion:
        onWatchAssets.length -
        retainedOnWatchAssets.length +
        (onWatchPending.length - retainedOnWatchPending.length),
    };
  }

  // Add a method to get only unread alerts
  getUnreadAlerts(): Asset[] {
    return this.assets.filter(
      (asset) => asset.totalScore >= 6 && !asset.alertSent,
    );
  }

  // Add this new method for testing
  resetAlertsForTesting(): number {
    console.log("🔄 Resetting alerts for testing...");

    let resetCount = 0;
    this.assets.forEach((asset) => {
      if (asset.totalScore >= 6) {
        asset.alertSent = false;
        asset.updatedAt = new Date();
        resetCount++;
        console.log(
          `✅ Reset alert for ${asset.ticker} (score: ${asset.totalScore})`,
        );
      }
    });

    if (resetCount > 0) {
      this.saveToStorage();
      console.log(`✅ Reset ${resetCount} alerts for testing`);
    }

    return resetCount;
  }
}

export const assetDB = new AssetDatabase();
