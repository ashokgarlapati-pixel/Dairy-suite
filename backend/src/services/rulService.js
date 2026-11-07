/**
 * Service 2: Remaining Useful Life (RUL) Calculation Service
 * Projects operational life in days & hours before catastrophic failure threshold
 */
export const calculateRUL = (asset, failureRiskScore, riskLevel) => {
  // Base maximum RUL for normal equipment
  let baseRulDays = 90;

  switch (riskLevel) {
    case 'CRITICAL':
      // Imminent breakdown within 1 to 3 days
      baseRulDays = Math.max(1, Math.round(4 - (failureRiskScore / 100) * 3));
      break;
    case 'HIGH':
      // Breakdown within 4 to 12 days
      baseRulDays = Math.max(4, Math.round(14 - (failureRiskScore / 100) * 10));
      break;
    case 'MEDIUM':
      // Wear notice: 15 to 45 days
      baseRulDays = Math.max(15, Math.round(50 - (failureRiskScore / 100) * 35));
      break;
    case 'LOW':
    default:
      baseRulDays = Math.max(60, Math.round(120 - (failureRiskScore / 100) * 40));
      break;
  }

  // Correlate with runtime hours (equipment over 8,000 hours degrades faster)
  if (asset.totalRuntimeHours > 8000) {
    baseRulDays = Math.max(1, Math.round(baseRulDays * 0.85));
  }

  const rulOperatingHours = baseRulDays * 16; // Average 16 operating hours per dairy day

  let recommendedWindow = '';
  if (baseRulDays <= 3) {
    recommendedWindow = 'IMMEDIATE INTERVENTION (Within 24 - 36 Hours before batch processing)';
  } else if (baseRulDays <= 7) {
    recommendedWindow = 'SCHEDULE THIS WEEK (Prioritize in next preventive shutdown)';
  } else if (baseRulDays <= 21) {
    recommendedWindow = 'PLANNED ROUTINE (Address during upcoming bi-weekly maintenance)';
  } else {
    recommendedWindow = 'REGULAR MONITORING (Next monthly inspection cycle)';
  }

  return {
    remainingUsefulLifeDays: baseRulDays,
    rulOperatingHours,
    recommendedInterventionWindow: recommendedWindow,
    degradationSlope: parseFloat(((100 - (asset.currentHealthScore || 100)) / (asset.totalRuntimeHours || 1000)).toFixed(4))
  };
};

