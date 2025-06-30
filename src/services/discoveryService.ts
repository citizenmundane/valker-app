import { TrendingData } from "../types/Asset";
import { apiService } from "./apiService";

class DiscoveryService {
  private lastScanTime: Date | null = null;
  private scanInterval: number = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
  private isScanning: boolean = false;

  async scanForTrendingAssets(): Promise<TrendingData[]> {
    if (this.isScanning) {
      console.log("⏳ Scan already in progress...");
      return [];
    }

    this.isScanning = true;
    console.log("🤖 Starting AI-powered asset discovery...");

    try {
      // Use real API integration only
      const trendingAssets = await apiService.scanAllSources();

      this.lastScanTime = new Date();
      console.log(
        `✅ Discovery complete: Found ${trendingAssets.length} trending assets`,
      );

      return trendingAssets;
    } catch (error) {
      console.error("❌ Asset discovery failed:", error);

      // Return empty array instead of mock data
      console.log("⚠️ No fallback data available - using real sources only");
      return [];
    } finally {
      this.isScanning = false;
    }
  }

  shouldScan(): boolean {
    if (!this.lastScanTime) return true;
    return Date.now() - this.lastScanTime.getTime() > this.scanInterval;
  }

  getScanStatus(): {
    lastScan: Date | null;
    isScanning: boolean;
    nextScan: Date | null;
  } {
    const nextScan = this.lastScanTime
      ? new Date(this.lastScanTime.getTime() + this.scanInterval)
      : null;

    return {
      lastScan: this.lastScanTime,
      isScanning: this.isScanning,
      nextScan,
    };
  }
}

export const discoveryService = new DiscoveryService();
