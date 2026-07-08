/**
 * SMART fee recalibration — pure core (docs/02 §4).
 * Back-fits the global parameters from executed deals: the median of
 * agreed/predicted fees becomes a scale applied to W and F (T/C stay put in v1).
 * Median (not mean) so outlier negotiations don't skew the proposal.
 */

export interface SmartSample {
  agreedMinor: number;
  predictedMinor: number;
}

export function calibrationRatio(samples: SmartSample[]): number | null {
  const ratios = samples
    .filter((s) => s.predictedMinor > 0 && s.agreedMinor > 0)
    .map((s) => s.agreedMinor / s.predictedMinor)
    .sort((a, b) => a - b);
  if (ratios.length === 0) return null;
  const mid = Math.floor(ratios.length / 2);
  return ratios.length % 2 === 1 ? ratios[mid]! : (ratios[mid - 1]! + ratios[mid]!) / 2;
}

export function applyRatio(
  config: { basketMultiplier: number; weightUsdPerKg: number; floorFeeUsd: number },
  ratio: number,
) {
  return {
    basketMultiplier: config.basketMultiplier, // B untouched by the global scale
    weightUsdPerKg: Math.max(1, Math.round(config.weightUsdPerKg * ratio)),
    floorFeeUsd: Math.max(0, Math.round(config.floorFeeUsd * ratio)),
  };
}
