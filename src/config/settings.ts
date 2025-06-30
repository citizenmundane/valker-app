// Consolidated settings configuration
export const settings = {
  pricing: {
    fmp: {
      enabled: true,
      apiKey: import.meta.env.VITE_FMP_API_KEY || "demo",
      priority: 1,
      rateLimit: 250, // requests per minute
      name: "Financial Modeling Prep",
    },
    twelveData: {
      enabled: true,
      apiKey: import.meta.env.VITE_TWELVE_DATA_API_KEY || "demo",
      priority: 2,
      rateLimit: 8, // requests per minute for free tier
      name: "Twelve Data",
    },
    yahoo: {
      enabled: true,
      apiKey: null, // No API key required
      priority: 3,
      rateLimit: 60, // Conservative estimate
      name: "Yahoo Finance",
    },
    // General price settings
    maxDiscrepancy: 0.5, // Maximum allowed price discrepancy between sources (percentage)
    requestTimeout: 10000, // Timeout for each API request (milliseconds)
    maxRetries: 2, // Retry attempts for failed requests
    cacheDuration: 5 * 60 * 1000, // Cache duration for price data (milliseconds) - 5 minutes
    enableDiscrepancyLogging: true, // Enable price comparison logging
  },
};

// Legacy exports for backward compatibility (if needed)
export const PRICE_SOURCES = {
  FMP: settings.pricing.fmp,
  TWELVE_DATA: settings.pricing.twelveData,
  YAHOO: settings.pricing.yahoo,
};

export const PRICE_SETTINGS = {
  maxDiscrepancy: settings.pricing.maxDiscrepancy,
  requestTimeout: settings.pricing.requestTimeout,
  maxRetries: settings.pricing.maxRetries,
  cacheDuration: settings.pricing.cacheDuration,
  enableDiscrepancyLogging: settings.pricing.enableDiscrepancyLogging,
};
