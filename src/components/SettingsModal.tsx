import React, { useState } from "react";
import {
  X,
  Save,
  RefreshCw,
  AlertTriangle,
  Eye,
  TrendingUp,
  BarChart3,
  CheckCircle,
  XCircle,
  Globe,
} from "lucide-react";
import { taapiProvider } from "../services/taapiProvider";
import { firecrawlService } from "../services/firecrawlService";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [settings, setSettings] = useState({
    autoRefresh: true,
    refreshInterval: 5, // minutes
    alertThreshold: 6,
    showPriceAlerts: true,
    showMemeAlerts: true,
    showPoliticalAlerts: true,
    showEarningsAlerts: true,
    compactMode: false,
    debugMode: false,
  });

  const [taapiStatus, setTaapiStatus] = useState({
    isTesting: false,
    isConnected: false,
    lastTest: null as Date | null,
  });

  const [firecrawlStatus, setFirecrawlStatus] = useState({
    isTesting: false,
    isConnected: false,
    lastTest: null as Date | null,
  });

  const testTaapiConnection = async () => {
    setTaapiStatus(prev => ({ ...prev, isTesting: true }));
    try {
      const isConnected = await taapiProvider.testConnection();
      setTaapiStatus({
        isTesting: false,
        isConnected,
        lastTest: new Date(),
      });
    } catch (error) {
      setTaapiStatus({
        isTesting: false,
        isConnected: false,
        lastTest: new Date(),
      });
    }
  };

  const testFirecrawlConnection = async () => {
    setFirecrawlStatus(prev => ({ ...prev, isTesting: true }));
    try {
      const isConnected = await firecrawlService.testConnection();
      setFirecrawlStatus({
        isTesting: false,
        isConnected,
        lastTest: new Date(),
      });
    } catch (error) {
      setFirecrawlStatus({
        isTesting: false,
        isConnected: false,
        lastTest: new Date(),
      });
    }
  };

  if (!isOpen) return null;

  const handleSave = () => {
    // Save settings to localStorage
    localStorage.setItem("valker-settings", JSON.stringify(settings));
    console.log("✅ Settings saved");
    onClose();
  };

  const handleReset = () => {
    const defaultSettings = {
      autoRefresh: true,
      refreshInterval: 5,
      alertThreshold: 6,
      showPriceAlerts: true,
      showMemeAlerts: true,
      showPoliticalAlerts: true,
      showEarningsAlerts: true,
      compactMode: false,
      debugMode: false,
    };
    setSettings(defaultSettings);
  };

  const taapiProviderStatus = taapiProvider.getStatus();
  const firecrawlProviderStatus = firecrawlService.getStatus();

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="bg-cyan-500 rounded-xl p-2">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Settings</h2>
              <p className="text-gray-400 text-sm">
                Configure Valker preferences
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
        <div className="overflow-y-auto max-h-[calc(90vh-120px)] p-6">
          <div className="space-y-6">
            {/* Auto Refresh Settings */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                <RefreshCw className="w-5 h-5 text-cyan-400" />
                <span>Auto Refresh</span>
              </h3>

              <div className="space-y-3">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.autoRefresh}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        autoRefresh: e.target.checked,
                      })
                    }
                    className="rounded"
                  />
                  <span className="text-gray-300">
                    Enable automatic data refresh
                  </span>
                </label>

                <div className="flex items-center space-x-3">
                  <span className="text-gray-400 text-sm">
                    Refresh interval:
                  </span>
                  <select
                    value={settings.refreshInterval}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        refreshInterval: parseInt(e.target.value),
                      })
                    }
                    className="bg-gray-700 text-white rounded px-3 py-1 text-sm"
                  >
                    <option value={1}>1 minute</option>
                    <option value={5}>5 minutes</option>
                    <option value={10}>10 minutes</option>
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Technical Analysis Settings */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                <BarChart3 className="w-5 h-5 text-purple-400" />
                <span>Technical Analysis</span>
              </h3>

              <div className="space-y-4">
                {/* taapi.io Status */}
                <div className="bg-gray-700/50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-white font-medium">taapi.io API</span>
                      {taapiProviderStatus.hasApiKey ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400" />
                      )}
                    </div>
                    <button
                      onClick={testTaapiConnection}
                      disabled={taapiStatus.isTesting}
                      className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                    >
                      {taapiStatus.isTesting ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin inline mr-1" />
                          Testing...
                        </>
                      ) : (
                        'Test Connection'
                      )}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-400">Status:</span>
                      <span className={`ml-1 ${taapiStatus.isConnected ? 'text-green-400' : 'text-gray-400'}`}>
                        {taapiStatus.isConnected ? 'Connected' : 'Not Tested'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Requests:</span>
                      <span className="ml-1 text-white">{taapiProviderStatus.requestsToday}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Rate Limit:</span>
                      <span className="ml-1 text-white">{taapiProviderStatus.rateLimitRemaining}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Success Rate:</span>
                      <span className="ml-1 text-white">{Math.round(taapiProviderStatus.successRate * 100)}%</span>
                    </div>
                  </div>

                  {taapiStatus.lastTest && (
                    <div className="text-xs text-gray-500 mt-2">
                      Last tested: {taapiStatus.lastTest.toLocaleTimeString()}
                    </div>
                  )}
                </div>

                <div className="text-xs text-gray-400">
                  Technical analysis enhances prediction accuracy using RSI, MACD, moving averages, and other indicators.
                </div>
              </div>
            </div>

            {/* Web Scraping Settings */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                <Globe className="w-5 h-5 text-green-400" />
                <span>Web Scraping</span>
              </h3>

              <div className="space-y-4">
                {/* Firecrawl MCP Status */}
                <div className="bg-gray-700/50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-white font-medium">Firecrawl MCP</span>
                      {firecrawlProviderStatus.hasApiKey ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400" />
                      )}
                    </div>
                    <button
                      onClick={testFirecrawlConnection}
                      disabled={firecrawlStatus.isTesting}
                      className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                    >
                      {firecrawlStatus.isTesting ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin inline mr-1" />
                          Testing...
                        </>
                      ) : (
                        'Test Connection'
                      )}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-400">Status:</span>
                      <span className={`ml-1 ${firecrawlStatus.isConnected ? 'text-green-400' : 'text-gray-400'}`}>
                        {firecrawlStatus.isConnected ? 'Connected' : 'Not Tested'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Requests:</span>
                      <span className="ml-1 text-white">{firecrawlProviderStatus.requestsToday}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Rate Limit:</span>
                      <span className="ml-1 text-white">{firecrawlProviderStatus.rateLimitRemaining}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Success Rate:</span>
                      <span className="ml-1 text-white">{Math.round(firecrawlProviderStatus.successRate * 100)}%</span>
                    </div>
                  </div>

                  {firecrawlStatus.lastTest && (
                    <div className="text-xs text-gray-500 mt-2">
                      Last tested: {firecrawlStatus.lastTest.toLocaleTimeString()}
                    </div>
                  )}
                </div>

                <div className="text-xs text-gray-400">
                  Web scraping collects real-time news, social media mentions, and market sentiment to enhance prediction accuracy.
                </div>
              </div>
            </div>

            {/* Alert Settings */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-orange-400" />
                <span>Alert Preferences</span>
              </h3>

              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <span className="text-gray-400 text-sm">
                    Alert threshold:
                  </span>
                  <select
                    value={settings.alertThreshold}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        alertThreshold: parseInt(e.target.value),
                      })
                    }
                    className="bg-gray-700 text-white rounded px-3 py-1 text-sm"
                  >
                    <option value={5}>5+ (Low)</option>
                    <option value={6}>6+ (Medium)</option>
                    <option value={7}>7+ (High)</option>
                    <option value={8}>8+ (Very High)</option>
                  </select>
                </div>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.showPriceAlerts}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        showPriceAlerts: e.target.checked,
                      })
                    }
                    className="rounded"
                  />
                  <span className="text-gray-300">
                    Show price movement alerts
                  </span>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.showMemeAlerts}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        showMemeAlerts: e.target.checked,
                      })
                    }
                    className="rounded"
                  />
                  <span className="text-gray-300">Show meme stock alerts</span>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.showPoliticalAlerts}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        showPoliticalAlerts: e.target.checked,
                      })
                    }
                    className="rounded"
                  />
                  <span className="text-gray-300">
                    Show political trade alerts
                  </span>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.showEarningsAlerts}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        showEarningsAlerts: e.target.checked,
                      })
                    }
                    className="rounded"
                  />
                  <span className="text-gray-300">
                    Show earnings-based alerts
                  </span>
                </label>
              </div>
            </div>

            {/* Display Settings */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                <Eye className="w-5 h-5 text-blue-400" />
                <span>Display</span>
              </h3>

              <div className="space-y-3">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.compactMode}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        compactMode: e.target.checked,
                      })
                    }
                    className="rounded"
                  />
                  <span className="text-gray-300">Compact mode</span>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.debugMode}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        debugMode: e.target.checked,
                      })
                    }
                    className="rounded"
                  />
                  <span className="text-gray-300">Debug mode</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-700">
          <button
            onClick={handleReset}
            className="text-gray-400 hover:text-white transition-colors"
          >
            Reset to Defaults
          </button>

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>Save Settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
