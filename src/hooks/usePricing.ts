import { useState, useEffect, useCallback } from "react";
import { pricingService } from "../services/pricingService";
import { assetDB } from "../data/database";

export const usePricing = () => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const updatePrices = useCallback(
    async (forceUpdate = false) => {
      if (isUpdating && !forceUpdate) return;

      if (!forceUpdate && !pricingService.shouldUpdatePrices()) {
        console.log("⏭️ Skipping price update - too recent");
        return;
      }

      setIsUpdating(true);
      setUpdateError(null);

      try {
        const assets = assetDB.getAllAssets();
        const assetInfo = assets.map((asset) => ({
          ticker: asset.ticker,
          type: asset.type,
        }));

        const priceData = await pricingService.updateAllPrices(assetInfo);

        // Update database with new prices
        priceData.forEach((price) => {
          assetDB.updateAssetPricing(price.ticker, {
            livePrice: price.price,
            priceChange24h: price.change24h,
            percentChange24h: price.percentChange24h,
            lastPriceUpdate: price.lastUpdated,
          });
        });

        setLastUpdateTime(new Date());
        console.log(`💰 Updated prices for ${priceData.length} assets`);
      } catch (error) {
        console.error("❌ Price update failed:", error);
        setUpdateError(
          error instanceof Error ? error.message : "Unknown error",
        );
      } finally {
        setIsUpdating(false);
      }
    },
    [isUpdating],
  );

  // Auto-update prices every 5 minutes
  useEffect(() => {
    const checkAndUpdate = () => {
      if (pricingService.shouldUpdatePrices()) {
        updatePrices();
      }
    };

    // Initial update after 3 seconds
    const initialTimeout = setTimeout(checkAndUpdate, 3000);

    // Set up interval for every 5 minutes
    const interval = setInterval(checkAndUpdate, 5 * 60 * 1000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [updatePrices]);

  // Load last update time on mount
  useEffect(() => {
    setLastUpdateTime(pricingService.getLastUpdateTime());
  }, []);

  const forceRefresh = useCallback(() => {
    console.log("🔄 Manual price refresh triggered...");
    updatePrices(true);
  }, [updatePrices]);

  return {
    isUpdating,
    lastUpdateTime,
    updateError,
    updatePrices,
    forceRefresh,
  };
};
