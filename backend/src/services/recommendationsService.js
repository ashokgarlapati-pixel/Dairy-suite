import { WORK_ORDER_PRIORITY } from '../config/constants.js';

/**
 * Service 3: Actionable Maintenance Recommendations Engine
 * Generates prescriptive maintenance cards with timing, spare parts & financial impact
 */
export const generateMaintenanceRecommendations = (asset, failureAnalysis, rulData) => {
  const category = asset.category || 'BULK_MILK_COOLER';
  const { failureRiskScore, riskLevel, predictedFailureMode } = failureAnalysis;

  let title = `Predictive Maintenance: ${asset.name}`;
  let suggestedTiming = rulData.recommendedInterventionWindow;
  let requiredSkills = ['General Industrial Maintenance'];
  let probableParts = [];
  let expectedDowntimeHours = 2.5;
  let estimatedMilkLossINR = 45000;
  let estimatedRepairCost = 6000;
  let safetyImpact = 'Low microbial contamination hazard under current chilling control.';
  let operationalImpact = 'Minor disruption to normal processing shifts.';

  let priority = WORK_ORDER_PRIORITY.MEDIUM_P2;
  if (riskLevel === 'CRITICAL') priority = WORK_ORDER_PRIORITY.CRITICAL_P0;
  else if (riskLevel === 'HIGH') priority = WORK_ORDER_PRIORITY.HIGH_P1;

  switch (category) {
    case 'BULK_MILK_COOLER': {
      title = 'Compressor Suction Valve Inspection & Refrigerant Top-up';
      requiredSkills = ['Refrigeration Mechanic (Certified)', 'HVAC Vacuum & Recovery'];
      probableParts = [
        { partName: 'Copeland Scroll Suction Valve Plate Assembly', estimatedCost: 4800, inStock: true },
        { partName: 'R404A Eco-Refrigerant Canister (10kg)', estimatedCost: 6500, inStock: true },
        { partName: 'Sanitary Neoprene O-Ring Kit', estimatedCost: 450, inStock: true }
      ];
      expectedDowntimeHours = 4.0;
      estimatedRepairCost = 11750;
      estimatedMilkLossINR = 215000; // 5,000L @ ₹43/L
      safetyImpact = 'CRITICAL: Chilling failure above 6.0°C will trigger total curdling of 5,000L raw milk batch.';
      operationalImpact = 'Milk reception will need to be re-routed to neighboring chilling center VCC-04.';
      break;
    }

    case 'PASTEURIZER': {
      title = 'HTST Regeneration Plate Pack Acid Wash & Gasket Check';
      requiredSkills = ['Dairy Plant Process Technician', 'CIP System Sanitization'];
      probableParts = [
        { partName: 'Food-Grade Nitric Acid Descaler (25L)', estimatedCost: 2800, inStock: true },
        { partName: 'EPDM Clip-on Plate Gaskets (Set of 10)', estimatedCost: 3200, inStock: true }
      ];
      expectedDowntimeHours = 3.5;
      estimatedRepairCost = 6000;
      estimatedMilkLossINR = 430000; // 10,000 LPH line stoppage
      safetyImpact = 'FOOD SAFETY VIOLATION: Sub-pasteurization temperature risks pathogen survival (Listeria, Salmonella).';
      operationalImpact = 'Full pasteurization and pouch packaging line stoppage during chemical circulation.';
      break;
    }

    case 'HOMOGENIZER': {
      title = 'Homogenizer Ceramic Plunger Packing Overhaul';
      requiredSkills = ['Precision Mechanical Fitter', 'Hydraulics Specialist'];
      probableParts = [
        { partName: 'Ceramic Plunger Sleeve 45mm', estimatedCost: 7500, inStock: false },
        { partName: 'V-Packing High-Pressure Seal Ring Pack', estimatedCost: 1850, inStock: true }
      ];
      expectedDowntimeHours = 5.0;
      estimatedRepairCost = 9350;
      estimatedMilkLossINR = 180000;
      safetyImpact = 'Moderate: Hydraulic pressure fluctuation leads to unstandardized fat globule sizing.';
      operationalImpact = 'Requires pausing standardized milk and paneer processing batches.';
      break;
    }

    case 'CHILLED_TANKER': {
      title = 'Road Milk Tanker Auxiliary Chilling & Seal Servicing';
      requiredSkills = ['Automotive HVAC Specialist', 'Sanitary Dairy Valves'];
      probableParts = [
        { partName: '3-Inch Silicon Butterfly Seat Gasket', estimatedCost: 850, inStock: true },
        { partName: 'Compressor Drive Belt Heavy-Duty', estimatedCost: 1200, inStock: true }
      ];
      expectedDowntimeHours = 2.0;
      estimatedRepairCost = 2050;
      estimatedMilkLossINR = 645000; // 15,000L Tanker souring risk
      safetyImpact = 'High: Road transit temperature rise causes curdling before arrival at mother dairy.';
      operationalImpact = 'Tanker held in maintenance bay; alternate logistics carrier required.';
      break;
    }

    default:
      break;
  }

  const totalRiskValue = estimatedMilkLossINR + estimatedRepairCost;

  return {
    title,
    suggestedTiming,
    requiredSkills,
    probableParts,
    expectedDowntimeHours,
    priority,
    safetyImpact,
    costImpact: {
      estimatedRepairCost,
      estimatedMilkSouringLoss: estimatedMilkLossINR,
      totalRiskValue
    },
    operationalImpact,
    status: 'PENDING_REVIEW', // Strict HITL governance: Never auto-approved
    predictedFailureMode
  };
};

