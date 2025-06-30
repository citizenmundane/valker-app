import { useState, useEffect, useCallback } from "react";
import { dataIngestionService } from "../services/dataIngestionService";

export const useDataIngestion = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [lastFullScan, setLastFullScan] = useState<Date | null>(null);
  const [scanResults, setScanResults] = useState<{
    added: number;
    skipped: number;
    sources: string[];
  } | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const runIngestion = useCallback(
    async (forceAll = false) => {
      if (isRunning && !forceAll) return;

      setIsRunning(true);
      setScanError(null);

      try {
        console.log("🤖 Starting comprehensive data ingestion...");
        const results = await dataIngestionService.runDataIngestion(forceAll);

        setScanResults(results);
        setLastFullScan(new Date());

        console.log(
          `✅ Data ingestion complete: ${results.added} new signals, ${results.skipped} skipped`,
        );
        console.log(`📊 Sources: ${results.sources.join(", ")}`);

        // Show notification if new signals found
        if (results.added > 0) {
          console.log(
            `🎯 ${results.added} new trading signals discovered and added for review!`,
          );
        }
      } catch (error) {
        console.error("❌ Data ingestion failed:", error);
        setScanError(
          error instanceof Error ? error.message : "Unknown error occurred",
        );
      } finally {
        setIsRunning(false);
      }
    },
    [isRunning],
  );

  // Auto-run ingestion on mount and then every 6 hours
  useEffect(() => {
    const checkAndRun = () => {
      // Check if we should run based on last scan time
      const lastScan = dataIngestionService.getLastFullScan();
      if (!lastScan || Date.now() - lastScan.getTime() > 6 * 60 * 60 * 1000) {
        runIngestion();
      }
    };

    // Initial check after a short delay
    const initialTimeout = setTimeout(checkAndRun, 5000);

    // Set up interval for every 6 hours
    const interval = setInterval(checkAndRun, 6 * 60 * 60 * 1000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [runIngestion]);

  // Load initial state
  useEffect(() => {
    setLastFullScan(dataIngestionService.getLastFullScan());
    setIsRunning(dataIngestionService.isCurrentlyRunning());
  }, []);

  // Manual ingestion trigger
  const triggerManualIngestion = useCallback(async () => {
    console.log("🔄 Manual data ingestion triggered by user...");
    await runIngestion(true);
  }, [runIngestion]);

  return {
    isRunning,
    lastFullScan,
    scanResults,
    scanError,
    runIngestion,
    triggerManualIngestion,
  };
};
