import dotenv from 'dotenv';
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

/**
 * Service 4: Google Gemini Explainability Advisor
 * Translates mathematical telemetry and degradation into human-readable diagnostic summaries.
 */
export const generateGeminiExplanation = async ({
  asset,
  failureAnalysis,
  rulData,
  recommendations
}) => {
  const { failureRiskScore, riskLevel, predictedFailureMode, contributingFactors } = failureAnalysis;
  const { remainingUsefulLifeDays, recommendedInterventionWindow } = rulData;

  // Domain Fallback Explanation Generator (Used when Gemini API is offline or during network restrictions)
  const generateRuleBasedExplanation = () => {
    return {
      source: 'DAIRY_HEURISTIC_RULE_ENGINE',
      aiExplanation: `Diagnostic assessment indicates ${riskLevel} risk (${failureRiskScore}%) for ${asset.name}. Primary failure mode identified is ${predictedFailureMode}. Continuous telemetry analysis reveals abnormal deviation from baseline operating limits. Immediate action recommended within ${remainingUsefulLifeDays} days (${recommendedInterventionWindow}) to prevent unrecoverable biological milk spoilage.`,
      citedTelemetryEvidence:
        contributingFactors.length > 0
          ? contributingFactors
          : [
              `Operating runtime: ${asset.totalRuntimeHours || 0} hours`,
              `Health Score: ${asset.currentHealthScore || 100}%`
            ],
      recommendedActions: [
        `Isolate electrical and pneumatic supplies following dairy lock-out tag-out (LOTO) protocols.`,
        `Inspect ${asset.category?.replace(/_/g, ' ')} critical components per standard operating procedure.`,
        `Replace flagged spare parts and conduct sanitary CIP recirculation test before re-introducing raw milk batch.`,
        `Record physical findings in maintenance queue to update MLOps ground-truth evaluation.`
      ],
      confidenceAssessment: `Confidence score calculated at ${(failureAnalysis.confidenceScore * 100).toFixed(0)}% based on recent time-series telemetry sample density and baseline threshold conformance.`
    };
  };

  // If no Gemini API Key is configured, return clean rule-based explanation
  if (!GEMINI_API_KEY) {
    return generateRuleBasedExplanation();
  }

  try {
    const prompt = `You are the Lead Reliability & Maintenance AI Diagnostic Specialist for a Dairy Cooperative Supply Chain.
Analyze the following dairy asset condition and provide an explainable, root-cause diagnostic summary.

EQUIPMENT DETAILS:
- Asset Name: ${asset.name} (${asset.assetTag})
- Category: ${asset.category}
- Capacity: ${asset.ratedCapacity || 'Standard'}
- Location: ${asset.location?.facilityName || 'Chilling Center'}
- Total Runtime: ${asset.totalRuntimeHours || 0} Hours
- Current Health Score: ${asset.currentHealthScore}%

CALCULATED METRICS:
- Failure Risk Score: ${failureRiskScore}% (${riskLevel} Risk)
- Model Confidence: ${(failureAnalysis.confidenceScore * 100).toFixed(0)}%
- Predicted Failure Mode: ${predictedFailureMode}
- Remaining Useful Life: ${remainingUsefulLifeDays} Days
- Recommended Timing: ${recommendedInterventionWindow}
- Observed Telemetry Anomalies: ${contributingFactors.join('; ')}

REQUIREMENTS:
1. Provide a concise, professional diagnostic summary (2-3 sentences) explaining WHY the equipment is failing based on dairy physics and microbial safety (raw milk spoils rapidly above 4.0°C).
2. Cite observed telemetry numbers as physical evidence.
3. Provide 3-4 specific action items for the field technician.
4. DO NOT output any hidden chain-of-thought tokens or conversational filler.
5. Return strictly valid JSON matching this schema:
{
  "aiExplanation": "string",
  "citedTelemetryEvidence": ["string"],
  "recommendedActions": ["string"],
  "confidenceAssessment": "string"
}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json'
        }
      })
    });

    if (!response.ok) {
      console.warn(`[Gemini API Warning] HTTP ${response.status}: Falling back to dairy rule engine`);
      return generateRuleBasedExplanation();
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      return generateRuleBasedExplanation();
    }

    const parsed = JSON.parse(rawText);
    return {
      source: 'GOOGLE_GEMINI_2.5_FLASH',
      aiExplanation: parsed.aiExplanation,
      citedTelemetryEvidence: parsed.citedTelemetryEvidence || contributingFactors,
      recommendedActions: parsed.recommendedActions || [],
      confidenceAssessment: parsed.confidenceAssessment || ''
    };
  } catch (error) {
    console.warn(`[Gemini Error] ${error.message}. Using resilient dairy rule-based fallback.`);
    return generateRuleBasedExplanation();
  }
};

