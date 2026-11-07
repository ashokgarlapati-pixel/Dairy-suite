import mongoose from 'mongoose';
import { AuditLog } from '../models/AuditLog.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { recordAuditEvent, inMemoryAuditLogs } from '../utils/auditLogger.js';
import { AUDIT_ACTIONS, AUDIT_OUTCOMES, ROLES } from '../config/constants.js';

// In-memory master system configuration structured across all 6 required domains
let systemSettings = {
  // 1. Master Data
  masterData: {
    equipmentCategories: [
      'BULK_MILK_COOLER',
      'CHILLED_TANKER',
      'PASTEURIZER',
      'HOMOGENIZER',
      'COLD_ROOM',
      'PACKAGING_MACHINE'
    ],
    approvedManufacturers: ['AlphaLaval', 'GEA Westfalia', 'TetraPak', 'Frick India', 'Kirloskar'],
    preventiveIntervalHours: 720
  },
  // 2. Workflow Rules
  workflowRules: {
    unassignedWorkOrderEscalationHours: 12,
    requireDualSupervisorSignoffP0: true,
    autoDispatchEmergencyP0: true,
    minTechnicianCertificationLevel: 'LEVEL_2_CERTIFIED'
  },
  // 3. Operational Thresholds
  thresholds: {
    milkQualityCeilingTemp: 4.0, // °C (Statutory max limit)
    pasteurizerHoldingTemp: 72.0, // °C
    minCipFlowRateLMin: 120.0, // L/min
    maxDifferentialPressureBar: 1.8, // Bar
    condenserPressureLimitBar: 22.0 // Bar
  },
  // 4. AI Settings
  aiSettings: {
    defaultModel: 'Gemini-2.5-Flash / DairyPhysics-v2.5',
    minAiConfidenceThreshold: 75, // %
    rulWarningThresholdDays: 14, // Days
    anomalySensitivity: 0.85,
    driftRetrainingTrigger: 0.15
  },
  // 5. Integrations
  integrations: {
    scadaOpcEndpoint: 'opc.tcp://scada.dairycoop.org:4840',
    telemetryHeartbeatSeconds: 60,
    tankerGpsWebhook: 'https://telemetry.dairycoop.org/api/v1/tankers/webhook',
    erpSyncIntervalMinutes: 15
  },
  // 6. Notification Rules
  notificationRules: {
    enableAutomatedSmsAlerts: true,
    emailDigestTime: '07:00 IST',
    pushOnSupervisorSignoff: true,
    autoEscalateUnacknowledgedMins: 30
  }
};

/**
 * GET /api/v1/audit-logs
 * Searchable immutable audit trail with multi-filter query support (Admin & Ops Only)
 */
export const getAuditLogs = async (req, res) => {
  try {
    const {
      action,
      resourceType,
      outcome,
      actorRole,
      user,
      cooperativeZone,
      from,
      to,
      search,
      page = 1,
      limit = 50
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    let filtered = [...inMemoryAuditLogs];

    // Action Filter
    if (action && action !== 'ALL') {
      filtered = filtered.filter((l) => l.action === action);
    }

    // Resource Type / Entity Filter
    if (resourceType && resourceType !== 'ALL') {
      filtered = filtered.filter((l) => l.resourceType === resourceType);
    }

    // Outcome Filter
    if (outcome && outcome !== 'ALL') {
      filtered = filtered.filter((l) => l.outcome === outcome);
    }

    // Actor Role Filter
    if (actorRole && actorRole !== 'ALL') {
      filtered = filtered.filter((l) => l.actorRole === actorRole);
    }

    // Specific User Filter
    if (user && user !== 'ALL') {
      const uLower = user.toLowerCase();
      filtered = filtered.filter(
        (l) =>
          (l.actorName && l.actorName.toLowerCase().includes(uLower)) ||
          (l.actorId && String(l.actorId) === user)
      );
    }

    // Organisational Scope Filter
    if (cooperativeZone && cooperativeZone !== 'ALL') {
      filtered = filtered.filter(
        (l) => l.orgScope?.cooperativeZone === cooperativeZone || l.orgScope?.cooperativeZone === 'ALL'
      );
    }

    // Date Range Filtering
    if (from) {
      const fromDate = new Date(from);
      filtered = filtered.filter((l) => new Date(l.timestamp) >= fromDate);
    }
    if (to) {
      const toDate = new Date(to);
      filtered = filtered.filter((l) => new Date(l.timestamp) <= toDate);
    }

    // Keyword Search
    if (search && search.trim()) {
      const s = search.trim().toLowerCase();
      filtered = filtered.filter(
        (l) =>
          (l.actorName && l.actorName.toLowerCase().includes(s)) ||
          (l.resourceId && l.resourceId.toLowerCase().includes(s)) ||
          (l.reason && l.reason.toLowerCase().includes(s)) ||
          (l.action && l.action.toLowerCase().includes(s)) ||
          (l.resourceType && l.resourceType.toLowerCase().includes(s))
      );
    }

    const total = filtered.length;
    const paginatedLogs = filtered.slice(skip, skip + limitNum);

    return ApiResponse.success(res, {
      logs: paginatedLogs,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1
      }
    });
  } catch (error) {
    console.error('[Audit Controller Error] getAuditLogs:', error);
    return ApiResponse.error(res, error.message || 'Failed to retrieve audit trail', 500);
  }
};

/**
 * DELETE /api/v1/audit-logs/:id or PUT /api/v1/audit-logs/:id
 * Rejects any deletion or modification attempt on immutable audit records
 */
export const rejectAuditMutation = async (req, res) => {
  return ApiResponse.error(
    res,
    'SECURITY VIOLATION: Audit logs are append-only and strictly immutable. Modification or deletion of audit records is strictly prohibited.',
    403
  );
};

/**
 * GET /api/v1/audit-logs/settings
 * Get master cooperative reliability configuration across all 6 domains
 */
export const getSystemSettings = async (req, res) => {
  return ApiResponse.success(res, { settings: systemSettings });
};

/**
 * PATCH /api/v1/audit-logs/settings
 * Update master configuration & record immutable CONFIG_CHANGE audit log (Admin Only)
 */
export const updateSystemSettings = async (req, res) => {
  try {
    const previousState = JSON.parse(JSON.stringify(systemSettings));
    const updates = req.body;

    if (updates.masterData) {
      systemSettings.masterData = { ...systemSettings.masterData, ...updates.masterData };
    }
    if (updates.workflowRules) {
      systemSettings.workflowRules = { ...systemSettings.workflowRules, ...updates.workflowRules };
    }
    if (updates.thresholds) {
      systemSettings.thresholds = { ...systemSettings.thresholds, ...updates.thresholds };
    }
    if (updates.aiSettings) {
      systemSettings.aiSettings = { ...systemSettings.aiSettings, ...updates.aiSettings };
    }
    if (updates.integrations) {
      systemSettings.integrations = { ...systemSettings.integrations, ...updates.integrations };
    }
    if (updates.notificationRules) {
      systemSettings.notificationRules = { ...systemSettings.notificationRules, ...updates.notificationRules };
    }

    // Flat compatibility fields
    if (updates.milkQualityCeilingTemp !== undefined) {
      systemSettings.thresholds.milkQualityCeilingTemp = updates.milkQualityCeilingTemp;
    }
    if (updates.minAiConfidenceThreshold !== undefined) {
      systemSettings.aiSettings.minAiConfidenceThreshold = updates.minAiConfidenceThreshold;
    }
    if (updates.rulWarningThresholdDays !== undefined) {
      systemSettings.aiSettings.rulWarningThresholdDays = updates.rulWarningThresholdDays;
    }
    if (updates.unassignedWorkOrderEscalationHours !== undefined) {
      systemSettings.workflowRules.unassignedWorkOrderEscalationHours = updates.unassignedWorkOrderEscalationHours;
    }

    // Record Immutable CONFIG_CHANGE Audit Log
    await recordAuditEvent({
      req,
      action: 'CONFIG_CHANGE',
      resourceType: 'SystemConfig',
      resourceId: 'MASTER_CONFIG',
      outcome: 'SUCCESS',
      previousState,
      newState: systemSettings,
      reason: updates.reason || 'Master cooperative thresholds, AI settings, and integrations updated by Admin'
    });

    return ApiResponse.success(res, { settings: systemSettings }, 'System settings updated successfully');
  } catch (error) {
    console.error('[Audit Controller Error] updateSystemSettings:', error);
    return ApiResponse.error(res, error.message || 'Failed to update settings', 500);
  }
};
