import mongoose from 'mongoose';
import { AuditLog } from '../models/AuditLog.js';
import { AUDIT_ACTIONS, AUDIT_OUTCOMES, ROLES } from '../config/constants.js';

// Pre-seeded comprehensive audit trail representing all 11 required action types
export const inMemoryAuditLogs = [
  {
    _id: 'AUD-001',
    logId: 'AUDIT-2026-0001',
    actorName: 'Garlapati Ashok babu (Lead Admin)',
    actorRole: ROLES.MAINTENANCE_ADMIN,
    action: AUDIT_ACTIONS.LOGIN,
    resourceType: 'User',
    resourceId: 'admin@dairycoop.org',
    orgScope: { cooperativeZone: 'ALL', plantId: 'Plant-Central (Mysore)' },
    outcome: AUDIT_OUTCOMES.SUCCESS,
    ipAddress: '127.0.0.1',
    userAgent: 'Chrome 122.0.0 / Windows 11 Enterprise',
    reason: 'Authorized administrator JWT session issued via Dairy Gateway',
    timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString()
  },
  {
    _id: 'AUD-002',
    logId: 'AUDIT-2026-0002',
    actorName: 'Ramesh Patel (Operations Manager)',
    actorRole: ROLES.OPERATIONS_MANAGER,
    action: AUDIT_ACTIONS.AUTHENTICATION,
    resourceType: 'User',
    resourceId: 'ops@dairycoop.org',
    orgScope: { cooperativeZone: 'Southern District Union', plantId: 'Plant-Central (Mysore)' },
    outcome: AUDIT_OUTCOMES.SUCCESS,
    ipAddress: '127.0.0.1',
    userAgent: 'Safari 17.2 / macOS Sonoma',
    reason: 'Two-factor cooperative credential verification succeeded',
    timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString()
  },
  {
    _id: 'AUD-003',
    logId: 'AUDIT-2026-0003',
    actorName: 'Suresh Kumar (Senior Field Technician)',
    actorRole: ROLES.TECHNICIAN,
    action: AUDIT_ACTIONS.DATA_ACCESS,
    resourceType: 'Asset',
    resourceId: 'BMC-018',
    orgScope: { cooperativeZone: 'Southern District Union', centerId: 'VCC-MYSORE-01' },
    outcome: AUDIT_OUTCOMES.SUCCESS,
    ipAddress: '192.168.1.42',
    userAgent: 'Mobile Chrome / Android 14',
    reason: 'Technician opened bulk milk cooler telemetry sensor health logs',
    timestamp: new Date(Date.now() - 40 * 60 * 1000).toISOString()
  },
  {
    _id: 'AUD-004',
    logId: 'AUDIT-2026-0004',
    actorName: 'Garlapati Ashok babu (Lead Admin)',
    actorRole: ROLES.MAINTENANCE_ADMIN,
    action: AUDIT_ACTIONS.CREATE,
    resourceType: 'WorkOrder',
    resourceId: 'WO-2026-0819',
    orgScope: { cooperativeZone: 'Southern District Union', plantId: 'Plant-Central (Mysore)' },
    outcome: AUDIT_OUTCOMES.SUCCESS,
    ipAddress: '127.0.0.1',
    userAgent: 'Chrome 122.0.0 / Windows 11 Enterprise',
    newState: { title: 'Compressor Suction Valve Plate Replacement', priority: 'CRITICAL_P0' },
    reason: 'Provisioned emergency corrective work order following high-side pressure anomaly',
    timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString()
  },
  {
    _id: 'AUD-005',
    logId: 'AUDIT-2026-0005',
    actorName: 'Suresh Kumar (Senior Field Technician)',
    actorRole: ROLES.TECHNICIAN,
    action: AUDIT_ACTIONS.MODIFY,
    resourceType: 'WorkOrder',
    resourceId: 'WO-2026-0819',
    orgScope: { cooperativeZone: 'Southern District Union', centerId: 'VCC-MYSORE-01' },
    outcome: AUDIT_OUTCOMES.SUCCESS,
    ipAddress: '192.168.1.42',
    userAgent: 'Mobile Chrome / Android 14',
    previousState: { status: 'ASSIGNED' },
    newState: { status: 'IN_PROGRESS' },
    reason: 'Technician tagged out electrical isolator and initiated valve plate overhaul',
    timestamp: new Date(Date.now() - 90 * 60 * 1000).toISOString()
  },
  {
    _id: 'AUD-006',
    logId: 'AUDIT-2026-0006',
    actorName: 'Garlapati Ashok babu (Lead Admin)',
    actorRole: ROLES.MAINTENANCE_ADMIN,
    action: AUDIT_ACTIONS.DELETE,
    resourceType: 'Asset',
    resourceId: 'BMC-DECOMMISSIONED-001',
    orgScope: { cooperativeZone: 'Southern District Union' },
    outcome: AUDIT_OUTCOMES.SUCCESS,
    ipAddress: '127.0.0.1',
    userAgent: 'Chrome 122.0.0 / Windows 11 Enterprise',
    reason: 'Soft-deleted obsolete 500L chilling tank following scrap decommission audit',
    timestamp: new Date(Date.now() - 120 * 60 * 1000).toISOString()
  },
  {
    _id: 'AUD-007',
    logId: 'AUDIT-2026-0007',
    actorName: 'Ramesh Patel (Operations Manager)',
    actorRole: ROLES.OPERATIONS_MANAGER,
    action: AUDIT_ACTIONS.EXPORT,
    resourceType: 'Report',
    resourceId: 'ASSET_HEALTH',
    orgScope: { cooperativeZone: 'ALL' },
    outcome: AUDIT_OUTCOMES.SUCCESS,
    ipAddress: '127.0.0.1',
    userAgent: 'Safari 17.2 / macOS Sonoma',
    reason: 'Exported official Dairy Union fleet reliability manifest in CSV format',
    timestamp: new Date(Date.now() - 150 * 60 * 1000).toISOString()
  },
  {
    _id: 'AUD-008',
    logId: 'AUDIT-2026-0008',
    actorName: 'SYSTEM_AI_DIAGNOSTICS',
    actorRole: 'SYSTEM',
    action: AUDIT_ACTIONS.AI_EXECUTION,
    resourceType: 'FailurePrediction',
    resourceId: 'PST-LINE-01',
    orgScope: { cooperativeZone: 'Southern District Union', plantId: 'Plant-Central (Mysore)' },
    outcome: AUDIT_OUTCOMES.SUCCESS,
    ipAddress: '127.0.0.1',
    userAgent: 'DairyPhysics-AI/2.5',
    reason: 'Gemini-2.5-Flash predicted regeneration plate fouling with 94% confidence and 14 days RUL',
    timestamp: new Date(Date.now() - 180 * 60 * 1000).toISOString()
  },
  {
    _id: 'AUD-009',
    logId: 'AUDIT-2026-0009',
    actorName: 'Ramesh Patel (Operations Manager)',
    actorRole: ROLES.OPERATIONS_MANAGER,
    action: AUDIT_ACTIONS.APPROVAL,
    resourceType: 'WorkOrder',
    resourceId: 'WO-2026-0818',
    orgScope: { cooperativeZone: 'Southern District Union', plantId: 'Plant-Central (Mysore)' },
    outcome: AUDIT_OUTCOMES.SUCCESS,
    ipAddress: '127.0.0.1',
    userAgent: 'Safari 17.2 / macOS Sonoma',
    reason: 'Supervisor verified hydrostatic seal pressure test and approved closure sign-off',
    timestamp: new Date(Date.now() - 210 * 60 * 1000).toISOString()
  },
  {
    _id: 'AUD-010',
    logId: 'AUDIT-2026-0010',
    actorName: 'Ramesh Patel (Operations Manager)',
    actorRole: ROLES.OPERATIONS_MANAGER,
    action: AUDIT_ACTIONS.REJECTION,
    resourceType: 'WorkOrder',
    resourceId: 'WO-2026-0815',
    orgScope: { cooperativeZone: 'Southern District Union', plantId: 'Plant-Central (Mysore)' },
    outcome: AUDIT_OUTCOMES.SUCCESS,
    ipAddress: '127.0.0.1',
    userAgent: 'Safari 17.2 / macOS Sonoma',
    reason: 'Rejected closure sign-off: CIP post-wash chemical titration test photo was missing from evidence',
    timestamp: new Date(Date.now() - 240 * 60 * 1000).toISOString()
  },
  {
    _id: 'AUD-011',
    logId: 'AUDIT-2026-0011',
    actorName: 'Ramesh Patel (Operations Manager)',
    actorRole: ROLES.OPERATIONS_MANAGER,
    action: AUDIT_ACTIONS.OVERRIDE,
    resourceType: 'Recommendation',
    resourceId: 'REC-2026-004',
    orgScope: { cooperativeZone: 'Southern District Union', plantId: 'Plant-Central (Mysore)' },
    outcome: AUDIT_OUTCOMES.SUCCESS,
    ipAddress: '127.0.0.1',
    userAgent: 'Safari 17.2 / macOS Sonoma',
    reason: 'Overrode AI maintenance schedule: Shifted plate acid wash from Day 14 to Day 3 due to pending export milk run',
    timestamp: new Date(Date.now() - 270 * 60 * 1000).toISOString()
  },
  {
    _id: 'AUD-012',
    logId: 'AUDIT-2026-0012',
    actorName: 'Garlapati Ashok babu (Lead Admin)',
    actorRole: ROLES.MAINTENANCE_ADMIN,
    action: AUDIT_ACTIONS.CONFIG_CHANGE,
    resourceType: 'SystemConfig',
    resourceId: 'MASTER_CONFIG',
    orgScope: { cooperativeZone: 'ALL' },
    outcome: AUDIT_OUTCOMES.SUCCESS,
    ipAddress: '127.0.0.1',
    userAgent: 'Chrome 122.0.0 / Windows 11 Enterprise',
    reason: 'Master food safety raw milk threshold updated from 4.5°C to statutory 4.0°C limit',
    timestamp: new Date(Date.now() - 300 * 60 * 1000).toISOString()
  }
];

/**
 * Reusable Audit Logging Helper (Enforces append-only immutable records)
 */
export const recordAuditEvent = async ({
  req,
  actorId = null,
  actorName = 'SYSTEM',
  actorRole = 'SYSTEM',
  action,
  resourceType,
  resourceId = null,
  orgScope = {},
  outcome = 'SUCCESS',
  previousState = null,
  newState = null,
  reason = ''
}) => {
  try {
    const ipAddress = req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || '127.0.0.1';
    const userAgent = req?.headers?.['user-agent'] || 'Unknown';

    const resolvedActorId = actorId || req?.user?._id || null;
    const resolvedActorName = actorName !== 'SYSTEM' ? actorName : req?.user?.fullName || 'SYSTEM';
    const resolvedActorRole = actorRole !== 'SYSTEM' ? actorRole : req?.user?.role || 'SYSTEM';

    const logEntry = {
      _id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      logId: `AUDIT-${Date.now()}`,
      actorId: resolvedActorId,
      actorName: resolvedActorName,
      actorRole: resolvedActorRole,
      action,
      resourceType,
      resourceId: resourceId ? String(resourceId) : undefined,
      orgScope,
      outcome,
      ipAddress,
      userAgent,
      previousState,
      newState,
      reason,
      timestamp: new Date().toISOString()
    };

    inMemoryAuditLogs.unshift(logEntry);

    if (mongoose.connection.readyState === 1) {
      const log = new AuditLog(logEntry);
      await log.save();
      return log;
    }

    return logEntry;
  } catch (error) {
    console.error(`[AuditLogger Warning] Failed to persist audit record: ${error.message}`);
    return null;
  }
};
