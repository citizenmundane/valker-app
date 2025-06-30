import { Asset } from "../types/Asset";

export const calculateTotalScore = (
  memeScore: number,
  politicalScore: number,
  earningsScore: number,
): number => {
  return memeScore + politicalScore + earningsScore;
};

export const getRecommendation = (
  totalScore: number,
): Asset["recommendation"] => {
  if (totalScore >= 7) return "Buy & Hold";
  if (totalScore >= 5) return "Short-Term Watch";
  return "On Watch";
};

export const getRecommendationColor = (
  recommendation: Asset["recommendation"],
): string => {
  switch (recommendation) {
    case "Buy & Hold":
      return "text-green-400 bg-green-900/20";
    case "Short-Term Watch":
      return "text-yellow-400 bg-yellow-900/20";
    case "On Watch":
      return "text-amber-400 bg-amber-900/20";
    default:
      return "text-gray-400 bg-gray-900/20";
  }
};

export const shouldTriggerAlert = (asset: Asset): boolean => {
  return asset.totalScore >= 6 && !asset.alertSent;
};
