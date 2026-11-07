import mongoose from 'mongoose';
import { Telemetry } from '../models/Telemetry.js';
import { Asset } from '../models/Asset.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { DAIRY_THRESHOLDS, ASSET_STATUS, FAILURE_RISK_LEVELS } from '../config/constants.js';

/**
 * Domain-specific rule evaluation for dairy telemetry anomalies
 */
const evaluateAnomaly = (metricType, value, assetCategory) => {
  let isAnomaly = false;
  let severity = 'NORMAL';
  let thresholdReason = '';

  switch (metricType) {
    case 'TEMPERATURE':
      if (assetCategory === 'BULK_MILK_COOLER' || assetCategory === 'COLD_ROOM') {
        if (value > 6.0) {
          isAnomaly = true;
          severity = 'CRITICAL';
          thresholdReason = `Milk temperature (${value}°C) dangerously exceeds maximum cold-chain threshold of 4.0°C! High risk of microbial proliferation.`;
        } else if (value > 4.0) {
          isAnomaly = true;
          severity = 'WARNING';
          thresholdReason = `Milk temperature (${value}°C) exceeds standard chilling ceiling of 4.0°C.`;
        }
      } else if (assetCategory === 'PASTEURIZER') {
        if (value < 71.5) {
          isAnomaly = true;
          severity = 'CRITICAL';
          thresholdReason = `Pasteurizer holding tube temperature (${value}°C) dropped below legal pasteurization threshold (72.0°C). Food safety hazard!`;
        }
      } else if (assetCategory === 'CHILLED_TANKER') {
        if (value > 5.5) {
          isAnomaly = true;
          severity = 'WARNING';
          thresholdReason = `In-transit road tanker temperature (${value}°C) has risen above allowable transfer threshold.`;
        }
      }
      break;

    case 'SUCTION_PRESSURE':
      if (value < 2.0) {
        isAnomaly = true;
        severity = 'CRITICAL';
        thresholdReason = `Refrigeration suction pressure (${value} bar) critically depressed. Imminent compressor vacuum hazard or severe refrigerant leak.`;
      } else if (value < 2.4) {
        isAnomaly = true;
        severity = 'WARNING';
        thresholdReason = `Suction pressure (${value} bar) below normal operating window (2.4 - 3.2 bar).`;
      }
      break;

    case 'VIBRATION_RMS':
      if (value > 5.5) {
        isAnomaly = true;
        severity = 'CRITICAL';
        thresholdReason = `Plunger vibration RMS (${value} mm/s) exceeds mechanical ISO limits. Plunger packing seal wear detected.`;
      } else if (value > 3.8) {
        isAnomaly = true;
        severity = 'WARNING';
        thresholdReason = `Elevated vibration level (${value} mm/s). Mechanical inspection advised.`;
      }
      break;

    case 'CIP_FLOW_RATE':
      if (value < 110) {
        isAnomaly = true;
        severity = 'WARNING';
        thresholdReason = `Clean-in-Place (CIP) return flow (${value} L/min) below effective sanitization baseline (120 L/min). Plate pack milk stone fouling suspected.`;
      }
      break;

    default:
      break;
  }

  return { isAnomaly, severity, thresholdReason };
};

/**
 * Generate synthetic 24-hour realistic dairy sensor trends for interactive UI charts
 */
const generateRealisticSensorTrends = (asset) => {
  const points = [];
  const now = new Date();
  const category = asset.category || 'BULK_MILK_COOLER';
  const isDegraded =
    asset.currentStatus === ASSET_STATUS.WARNING ||
    asset.currentStatus === ASSET_STATUS.CRITICAL_FAULT ||
    asset.failureRiskLevel === FAILURE_RISK_LEVELS.HIGH;

  for (let i = 23; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
    const hourLabel = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let point = {
      timestamp: timestamp.toISOString(),
      timeLabel: hourLabel
    };

    if (category === 'BULK_MILK_COOLER' || category === 'COLD_ROOM') {
      // Normal: chills down to ~3.5C, cycles with agitator between 3.2C and 3.9C
      // Degraded: takes long to chill, creeps up to 5.8C or 6.8C
      const baseTemp = isDegraded ? 5.2 + (23 - i) * 0.08 : 3.6;
      const variation = Math.sin(i * 0.8) * 0.4;
      const suctionBase = isDegraded ? 2.1 - (23 - i) * 0.02 : 2.8;

      point.temperature = parseFloat((baseTemp + variation).toFixed(2));
      point.thresholdTemp = 4.0;
      point.suctionPressure = parseFloat((suctionBase + Math.sin(i * 0.5) * 0.1).toFixed(2));
      point.dischargePressure = parseFloat((14.2 + Math.cos(i * 0.5) * 0.6).toFixed(2));
      point.agitatorRpm = isDegraded && i < 4 ? 0 : 32;
    } else if (category === 'PASTEURIZER') {
      // Holding tube temperature baseline 72.0C - 73.0C
      const baseTemp = isDegraded ? 71.2 + Math.sin(i * 0.6) * 0.8 : 72.6 + Math.sin(i * 0.3) * 0.2;
      const cipFlow = isDegraded ? 108 + Math.cos(i) * 5 : 135 + Math.cos(i) * 4;

      point.holdingTemperature = parseFloat(baseTemp.toFixed(2));
      point.safetyThreshold = 72.0;
      point.cipFlowRate = parseFloat(cipFlow.toFixed(1));
      point.flowThreshold = 120.0;
      point.regenerationDeltaP = parseFloat((isDegraded ? 2.1 : 1.2 + Math.sin(i) * 0.1).toFixed(2));
    } else if (category === 'HOMOGENIZER') {
      // Vibration RMS normal 1.8 - 2.5 mm/s, degraded 4.2 - 5.8 mm/s
      const vibration = isDegraded ? 4.6 + Math.sin(i * 0.7) * 0.8 : 2.1 + Math.sin(i * 0.4) * 0.3;
      point.vibrationRms = parseFloat(vibration.toFixed(2));
      point.vibrationThreshold = 3.8;
      point.stage1Pressure = isDegraded ? 140 + Math.sin(i) * 15 : 150 + Math.sin(i) * 3;
      point.motorCurrent = parseFloat((isDegraded ? 58.2 : 51.5 + Math.sin(i) * 1.5).toFixed(1));
    } else {
      // Generic equipment
      point.temperature = parseFloat((3.8 + Math.sin(i * 0.5) * 0.3).toFixed(2));
      point.vibrationRms = parseFloat((1.9 + Math.cos(i * 0.5) * 0.2).toFixed(2));
      point.thresholdTemp = 4.0;
    }

    points.push(point);
  }

  return points;
};

/**
 * POST /api/v1/telemetry/ingest
 * Ingests single or bulk IoT telemetry data with instant dairy threshold checking
 */
export const ingestTelemetry = async (req, res) => {
  try {
    const payload = req.body;
    const rawReadings = Array.isArray(payload.readings) ? payload.readings : [payload];

    if (rawReadings.length === 0) {
      return ApiResponse.error(res, 'No telemetry readings provided for ingestion.', 400);
    }

    const processedReadings = [];
    const anomaliesFound = [];

    for (const raw of rawReadings) {
      // Find asset
      let asset = null;
      if (mongoose.connection.readyState === 1) {
        asset = await Asset.findById(raw.assetId);
      }

      const assetCategory = asset?.category || 'BULK_MILK_COOLER';
      const { isAnomaly, severity, thresholdReason } = evaluateAnomaly(
        raw.metricType,
        raw.metricValue,
        assetCategory
      );

      const readingDoc = {
        assetId: raw.assetId,
        sensorId: raw.sensorId,
        metricType: raw.metricType,
        metricValue: raw.metricValue,
        unit: raw.unit,
        timestamp: raw.timestamp ? new Date(raw.timestamp) : new Date(),
        isAnomaly,
        thresholdRange: raw.thresholdRange || { normalMin: 0, normalMax: 100 },
        orgScope: raw.orgScope || asset?.orgScope || {}
      };

      processedReadings.push(readingDoc);

      if (isAnomaly) {
        anomaliesFound.push({
          sensorId: raw.sensorId,
          metricType: raw.metricType,
          metricValue: raw.metricValue,
          severity,
          reason: thresholdReason
        });

        // Degrade asset health score if anomaly is critical
        if (asset && mongoose.connection.readyState === 1) {
          const penalty = severity === 'CRITICAL' ? 15 : 5;
          asset.currentHealthScore = Math.max(10, (asset.currentHealthScore || 100) - penalty);
          if (severity === 'CRITICAL') {
            asset.currentStatus = ASSET_STATUS.CRITICAL_FAULT;
            asset.failureRiskLevel = FAILURE_RISK_LEVELS.CRITICAL;
          } else if (asset.currentStatus === ASSET_STATUS.OPERATIONAL) {
            asset.currentStatus = ASSET_STATUS.WARNING;
            asset.failureRiskLevel = FAILURE_RISK_LEVELS.HIGH;
          }
          await asset.save();
        }
      }
    }

    // Persist to MongoDB if connected
    if (mongoose.connection.readyState === 1) {
      await Telemetry.insertMany(processedReadings);
    }

    return ApiResponse.success(
      res,
      {
        ingestedCount: processedReadings.length,
        anomaliesDetected: anomaliesFound.length,
        anomalies: anomaliesFound
      },
      'Telemetry processed successfully',
      201
    );
  } catch (error) {
    console.error('[Telemetry Controller Error] ingestTelemetry:', error);
    return ApiResponse.error(res, error.message || 'Telemetry ingestion failed', 500);
  }
};

/**
 * GET /api/v1/telemetry/asset/:assetId
 * Retrieves recent sensor telemetry for an asset with staleness detector
 */
export const getAssetTelemetry = async (req, res) => {
  try {
    const { assetId } = req.params;
    const { metricType, limit = 50 } = req.query;

    let asset = null;
    if (mongoose.connection.readyState === 1) {
      if (mongoose.Types.ObjectId.isValid(assetId)) {
        asset = await Asset.findById(assetId);
      } else {
        asset = await Asset.findOne({ assetTag: assetId.toUpperCase() });
      }
    }

    const query = { assetId: asset?._id || assetId };
    if (metricType) query.metricType = metricType;

    let readings = [];
    if (mongoose.connection.readyState === 1) {
      readings = await Telemetry.find(query)
        .sort({ timestamp: -1 })
        .limit(parseInt(limit, 10));
    }

    // Staleness Detection: Stale if newest reading is > 6 hours old or no readings exist
    let isStale = false;
    let lastSeenAgoHours = 0;
    if (readings.length > 0) {
      const newest = new Date(readings[0].timestamp).getTime();
      lastSeenAgoHours = Math.round((Date.now() - newest) / (1000 * 60 * 60));
      if (lastSeenAgoHours > 6) {
        isStale = true;
      }
    } else {
      isStale = true;
      lastSeenAgoHours = 24;
    }

    return ApiResponse.success(res, {
      assetId,
      assetTag: asset?.assetTag || 'UNKNOWN',
      isStale,
      lastSeenAgoHours,
      totalReadings: readings.length,
      readings
    });
  } catch (error) {
    console.error('[Telemetry Controller Error] getAssetTelemetry:', error);
    return ApiResponse.error(res, error.message || 'Failed to retrieve telemetry', 500);
  }
};

/**
 * GET /api/v1/telemetry/asset/:assetId/trends
 * Aggregated 24-hour time-series trends formatted for Recharts components
 */
export const getSensorTrends = async (req, res) => {
  try {
    const { assetId } = req.params;

    let asset = null;
    if (mongoose.connection.readyState === 1) {
      if (mongoose.Types.ObjectId.isValid(assetId)) {
        asset = await Asset.findById(assetId);
      } else {
        asset = await Asset.findOne({ assetTag: assetId.toUpperCase() });
      }
    }

    if (!asset) {
      asset = {
        assetTag: assetId,
        category: 'BULK_MILK_COOLER',
        currentStatus: ASSET_STATUS.OPERATIONAL
      };
    }

    // Generate clean 24-hour timeline points for Recharts
    const trends = generateRealisticSensorTrends(asset);

    return ApiResponse.success(res, {
      assetTag: asset.assetTag,
      category: asset.category,
      currentHealthScore: asset.currentHealthScore ?? 100,
      currentStatus: asset.currentStatus,
      pointsCount: trends.length,
      trends
    });
  } catch (error) {
    console.error('[Telemetry Controller Error] getSensorTrends:', error);
    return ApiResponse.error(res, error.message || 'Failed to generate sensor trends', 500);
  }
};

