import { useState, useEffect, useCallback } from "react";
import { discoveryService } from "../services/discoveryService";
import { assetDB } from "../data/database";

export const useAssetDiscovery = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null);
  const [scanResults, setScanResults] = useState<{
    added: number;
    skipped: number;
  } | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const performScan = useCallback(async () => {
    if (isScanning) return;

    setIsScanning(true);
    setScanError(null);

    try {
      console.log("🤖 Starting automated asset discovery...");
      const trendingAssets = await discoveryService.scanForTrendingAssets();
      const results = assetDB.processTrendingAssets(trendingAssets);

      setScanResults(results);
      setLastScanTime(new Date());

      console.log(
        `✅ Discovery complete: ${results.added} new assets found, ${results.skipped} skipped`,
      );

      // Show notification if new assets found
      if (results.added > 0) {
        console.log(
          `🎯 ${results.added} new trending assets discovered and added to pending review!`,
        );
      }
    } catch (error) {
      console.error("❌ Asset discovery failed:", error);
      setScanError(
        error instanceof Error ? error.message : "Unknown error occurred",
      );
    } finally {
      setIsScanning(false);
    }
  }, [isScanning]);

  // Auto-scan on mount and then every 6 hours
  useEffect(() => {
    const checkAndScan = () => {
      if (discoveryService.shouldScan()) {
        performScan();
      }
    };

    // Initial check after a short delay
    const initialTimeout = setTimeout(checkAndScan, 2000);

    // Set up interval for every 6 hours
    const interval = setInterval(checkAndScan, 6 * 60 * 60 * 1000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [performScan]);

  // Load last scan time from service on mount
  useEffect(() => {
    const status = discoveryService.getScanStatus();
    setLastScanTime(status.lastScanTime);
    setIsScanning(status.isScanning);
  }, []);

  // Manual scan trigger
  const triggerManualScan = useCallback(async () => {
    console.log("🔄 Manual scan triggered by user...");
    await performScan();
  }, [performScan]);

  return {
    isScanning,
    lastScanTime,
    scanResults,
    scanError,
    performScan,
    triggerManualScan,
  };
};
