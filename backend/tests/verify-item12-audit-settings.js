/**
 * Automated Verification Suite for Item 12: Audit Logs and System Settings Page
 *
 * Requirements Tested:
 * 1. Searchable audit logs across all 11 required action types:
 *    - Authentication (AUTHENTICATION / LOGIN)
 *    - Data access (DATA_ACCESS)
 *    - Record creation (CREATE)
 *    - Modification (MODIFY)
 *    - Deletion (DELETE)
 *    - Export (EXPORT)
 *    - AI execution (AI_EXECUTION)
 *    - Approval (APPROVAL)
 *    - Rejection (REJECTION)
 *    - Override (OVERRIDE)
 *    - Configuration changes (CONFIG_CHANGE)
 * 2. Multi-dimensional filtering:
 *    - User (actorName / actorId)
 *    - Role (actorRole)
 *    - Action (action)
 *    - Entity / Domain (resourceType)
 *    - Date range (from / to)
 *    - Outcome (SUCCESS, FAILURE, ACCESS_DENIED)
 *    - Relevant organisational scope (cooperativeZone)
 * 3. System Configuration Management (Admin Only) across all 6 domains:
 *    - Master data
 *    - Workflow rules
 *    - Operational thresholds
 *    - AI settings
 *    - Integrations
 *    - Notification rules
 * 4. Immutability & Access Protection:
 *    - Prevention of audit modification or deletion (HTTP 403 append-only enforcement)
 *    - Strict RBAC on settings (non-admins blocked with HTTP 403)
 */

import http from 'http';
import net from 'net';
import fs from 'fs';
import path from 'path';
import app from '../src/app.js';
import { ROLES, AUDIT_ACTIONS, AUDIT_OUTCOMES } from '../src/config/constants.js';

let passedChecks = 0;
let totalChecks = 0;

function assert(condition, message) {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  [PASS] ${message}`);
  } else {
    console.error(`  [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

function makeInProcessRequest({ app, method, path, headers = {}, body = null }) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    Object.defineProperty(socket, 'remoteAddress', { get: () => '127.0.0.1' });

    const req = new http.IncomingMessage(socket);
    req.method = method;
    req.url = path;
    req.headers = {
      host: '127.0.0.1',
      'user-agent': 'DairySuite-TestRunner',
      ...headers
    };

    if (body) {
      const payload = typeof body === 'string' ? body : JSON.stringify(body);
      req.headers['content-type'] = req.headers['content-type'] || 'application/json';
      req.headers['content-length'] = Buffer.byteLength(payload);
    }

    const res = new http.ServerResponse(req);
    let resData = '';

    res.write = function (chunk, encoding) {
      if (chunk) {
        resData += Buffer.isBuffer(chunk) ? chunk.toString(encoding || 'utf8') : chunk;
      }
      return true;
    };

    res.end = function (chunk, encoding) {
      if (chunk) {
        resData += Buffer.isBuffer(chunk) ? chunk.toString(encoding || 'utf8') : chunk;
      }

      let parsedBody = resData;
      const contentType = res.getHeader('content-type') || '';
      if (contentType.includes('application/json')) {
        try {
          parsedBody = JSON.parse(resData);
        } catch (e) {
          // keep raw string
        }
      }

      resolve({
        statusCode: res.statusCode,
        headers: res.getHeaders(),
        body: parsedBody
      });
    };

    app(req, res);

    if (body) {
      const payload = typeof body === 'string' ? body : JSON.stringify(body);
      req.emit('data', Buffer.from(payload));
    }
    req.emit('end');
  });
}

async function runSuite() {
  console.log('\n========================================================================');
  console.log(' STARTING END-TO-END TEST SUITE: ITEM 12 - AUDIT LOGS & SYSTEM SETTINGS');
  console.log('========================================================================\n');

  // STEP 1: AUTHENTICATION FOR TEST ACTORS
  console.log('--- Step 1: User Authentication & Role Token Acquisition ---');
  
  // 1.1 Maintenance Admin
  const adminLogin = await makeInProcessRequest({
    app,
    method: 'POST',
    path: '/api/v1/auth/login',
    body: { email: 'admin@dairycoop.org', password: 'Admin@123' }
  });
  assert(adminLogin.statusCode === 200, 'Admin login succeeded with HTTP 200');
  const adminToken = adminLogin.body.data.accessToken;

  // 1.2 Operations Manager
  const opsLogin = await makeInProcessRequest({
    app,
    method: 'POST',
    path: '/api/v1/auth/login',
    body: { email: 'ops@dairycoop.org', password: 'Ops@123' }
  });
  assert(opsLogin.statusCode === 200, 'Operations Manager login succeeded with HTTP 200');
  const opsToken = opsLogin.body.data.accessToken;

  // 1.3 Field Technician
  const techLogin = await makeInProcessRequest({
    app,
    method: 'POST',
    path: '/api/v1/auth/login',
    body: { email: 'tech@dairycoop.org', password: 'Tech@123' }
  });
  assert(techLogin.statusCode === 200, 'Technician login succeeded with HTTP 200');
  const techToken = techLogin.body.data.accessToken;

  // STEP 2: AUDIT TRAIL RETRIEVAL & ALL 11 REQUIRED ACTION TYPES
  console.log('\n--- Step 2: Audit Trail Retrieval & All 11 Required Action Types ---');
  const auditRes = await makeInProcessRequest({
    app,
    method: 'GET',
    path: '/api/v1/audit-logs',
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(auditRes.statusCode === 200, 'GET /audit-logs returned HTTP 200 for Admin');
  const auditData = auditRes.body.data;
  assert(Array.isArray(auditData.logs), 'Audit logs array returned');
  assert(auditData.logs.length >= 12, `Total seeded audit records count: ${auditData.logs.length}`);

  // Validate all 11 required action types are present in audit logs
  const actionsLogged = auditData.logs.map((l) => l.action);
  assert(actionsLogged.includes('AUTHENTICATION') || actionsLogged.includes('LOGIN'), '1. Action: AUTHENTICATION / LOGIN present in audit trail');
  assert(actionsLogged.includes('DATA_ACCESS'), '2. Action: DATA_ACCESS present in audit trail');
  assert(actionsLogged.includes('CREATE'), '3. Action: CREATE present in audit trail');
  assert(actionsLogged.includes('MODIFY'), '4. Action: MODIFY present in audit trail');
  assert(actionsLogged.includes('DELETE'), '5. Action: DELETE present in audit trail');
  assert(actionsLogged.includes('EXPORT'), '6. Action: EXPORT present in audit trail');
  assert(actionsLogged.includes('AI_EXECUTION'), '7. Action: AI_EXECUTION present in audit trail');
  assert(actionsLogged.includes('APPROVAL'), '8. Action: APPROVAL present in audit trail');
  assert(actionsLogged.includes('REJECTION'), '9. Action: REJECTION present in audit trail');
  assert(actionsLogged.includes('OVERRIDE'), '10. Action: OVERRIDE present in audit trail');
  assert(actionsLogged.includes('CONFIG_CHANGE'), '11. Action: CONFIG_CHANGE present in audit trail');

  // Verify log record structure integrity
  const sampleLog = auditData.logs[0];
  assert(Boolean(sampleLog.actorName && sampleLog.actorRole && sampleLog.timestamp), 'Audit log contains actorName, actorRole, timestamp');
  assert(Boolean(sampleLog.action && sampleLog.resourceType && sampleLog.outcome), 'Audit log contains action, resourceType, outcome');
  assert(Boolean(sampleLog.ipAddress && sampleLog.reason), 'Audit log contains IP address and operational reason diff');

  // STEP 3: MULTI-DIMENSIONAL AUDIT FILTERING
  console.log('\n--- Step 3: Multi-Dimensional Audit Log Filtering ---');
  
  // 3.1 Filter by Action
  const filterActionRes = await makeInProcessRequest({
    app,
    method: 'GET',
    path: '/api/v1/audit-logs?action=AI_EXECUTION',
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(filterActionRes.statusCode === 200, 'GET /audit-logs?action=AI_EXECUTION returned HTTP 200');
  assert(filterActionRes.body.data.logs.every((l) => l.action === 'AI_EXECUTION'), 'All returned logs have action=AI_EXECUTION');

  // 3.2 Filter by Entity / Resource Type
  const filterEntityRes = await makeInProcessRequest({
    app,
    method: 'GET',
    path: '/api/v1/audit-logs?resourceType=WorkOrder',
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(filterEntityRes.statusCode === 200, 'GET /audit-logs?resourceType=WorkOrder returned HTTP 200');
  assert(filterEntityRes.body.data.logs.every((l) => l.resourceType === 'WorkOrder'), 'All returned logs have resourceType=WorkOrder');

  // 3.3 Filter by Actor Role
  const filterRoleRes = await makeInProcessRequest({
    app,
    method: 'GET',
    path: '/api/v1/audit-logs?actorRole=OPERATIONS_MANAGER',
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(filterRoleRes.statusCode === 200, 'GET /audit-logs?actorRole=OPERATIONS_MANAGER returned HTTP 200');
  assert(filterRoleRes.body.data.logs.every((l) => l.actorRole === 'OPERATIONS_MANAGER'), 'All returned logs match actorRole=OPERATIONS_MANAGER');

  // 3.4 Filter by Outcome
  const filterOutcomeRes = await makeInProcessRequest({
    app,
    method: 'GET',
    path: '/api/v1/audit-logs?outcome=SUCCESS',
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(filterOutcomeRes.statusCode === 200, 'GET /audit-logs?outcome=SUCCESS returned HTTP 200');
  assert(filterOutcomeRes.body.data.logs.every((l) => l.outcome === 'SUCCESS'), 'All returned logs match outcome=SUCCESS');

  // 3.5 Filter by User
  const filterUserRes = await makeInProcessRequest({
    app,
    method: 'GET',
    path: '/api/v1/audit-logs?user=Ramesh',
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(filterUserRes.statusCode === 200, 'GET /audit-logs?user=Ramesh returned HTTP 200');
  assert(filterUserRes.body.data.logs.every((l) => l.actorName.includes('Ramesh')), 'Filtered logs by actorName substring match');

  // 3.6 Filter by Organisational Scope (Zone)
  const filterZoneRes = await makeInProcessRequest({
    app,
    method: 'GET',
    path: '/api/v1/audit-logs?cooperativeZone=Southern District Union',
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(filterZoneRes.statusCode === 200, 'GET /audit-logs?cooperativeZone=Southern District Union returned HTTP 200');
  assert(filterZoneRes.body.data.logs.length > 0, 'Found records matching organizational zone scope');

  // 3.7 Search by Keyword
  const searchKeywordRes = await makeInProcessRequest({
    app,
    method: 'GET',
    path: '/api/v1/audit-logs?search=fouling',
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(searchKeywordRes.statusCode === 200, 'Search by keyword "fouling" returned HTTP 200');
  assert(searchKeywordRes.body.data.logs.some((l) => l.reason.toLowerCase().includes('fouling')), 'Found audit record referencing plate fouling');

  // 3.8 Operations Manager can view audit logs
  const opsAuditRes = await makeInProcessRequest({
    app,
    method: 'GET',
    path: '/api/v1/audit-logs',
    headers: { authorization: `Bearer ${opsToken}` }
  });
  assert(opsAuditRes.statusCode === 200, 'Operations Manager has authorized read access to audit logs');

  // STEP 4: IMMUTABILITY ENFORCEMENT (PREVENT DELETION OR MODIFICATION)
  console.log('\n--- Step 4: Immutability Enforcement & Tamper-Proof Protection ---');
  
  // 4.1 Delete individual audit record attempt rejected
  const deleteLogAttempt = await makeInProcessRequest({
    app,
    method: 'DELETE',
    path: '/api/v1/audit-logs/AUD-001',
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(deleteLogAttempt.statusCode === 403, 'DELETE /audit-logs/:id strictly rejected with HTTP 403 Forbidden');
  assert(deleteLogAttempt.body.message.includes('immutable') || deleteLogAttempt.body.message.includes('SECURITY VIOLATION'), 'Immutability violation error message returned');

  // 4.2 Delete all audit records attempt rejected
  const deleteAllAttempt = await makeInProcessRequest({
    app,
    method: 'DELETE',
    path: '/api/v1/audit-logs',
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(deleteAllAttempt.statusCode === 403, 'DELETE /audit-logs batch clear strictly rejected with HTTP 403 Forbidden');

  // 4.3 Update / modify audit record attempt rejected
  const putLogAttempt = await makeInProcessRequest({
    app,
    method: 'PUT',
    path: '/api/v1/audit-logs/AUD-001',
    headers: { authorization: `Bearer ${adminToken}` },
    body: { reason: 'Tampered reason' }
  });
  assert(putLogAttempt.statusCode === 403, 'PUT /audit-logs/:id modification strictly rejected with HTTP 403 Forbidden');

  // STEP 5: SYSTEM SETTINGS CONFIGURATION (ALL 6 DOMAINS)
  console.log('\n--- Step 5: Master System Settings Across All 6 Domains ---');
  
  // 5.1 Admin retrieves settings
  const getSettingsRes = await makeInProcessRequest({
    app,
    method: 'GET',
    path: '/api/v1/audit-logs/settings',
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(getSettingsRes.statusCode === 200, 'GET /audit-logs/settings returned HTTP 200 for Admin');
  const settingsObj = getSettingsRes.body.data.settings;
  
  // Validate presence of all 6 configuration domains
  assert(Boolean(settingsObj.masterData), '1. Master Data configuration domain present');
  assert(settingsObj.masterData.equipmentCategories.length >= 6, 'Master Data covers all 6 dairy equipment categories');
  
  assert(Boolean(settingsObj.workflowRules), '2. Workflow Rules configuration domain present');
  assert(typeof settingsObj.workflowRules.unassignedWorkOrderEscalationHours === 'number', 'Workflow unassigned escalation timer configured');
  assert(settingsObj.workflowRules.requireDualSupervisorSignoffP0 === true, 'Workflow dual sign-off configured');

  assert(Boolean(settingsObj.thresholds), '3. Operational Thresholds domain present');
  assert(typeof settingsObj.thresholds.milkQualityCeilingTemp === 'number', 'Operational milk temperature threshold configured');
  assert(typeof settingsObj.thresholds.pasteurizerHoldingTemp === 'number', 'Operational pasteurizer holding temp configured');

  assert(Boolean(settingsObj.aiSettings), '4. AI Settings domain present');
  assert(Boolean(settingsObj.aiSettings.defaultModel), `AI default model configured: ${settingsObj.aiSettings.defaultModel}`);
  assert(typeof settingsObj.aiSettings.minAiConfidenceThreshold === 'number', 'AI confidence threshold configured');

  assert(Boolean(settingsObj.integrations), '5. Integrations domain present');
  assert(Boolean(settingsObj.integrations.scadaOpcEndpoint), `SCADA OPC-UA endpoint configured: ${settingsObj.integrations.scadaOpcEndpoint}`);
  assert(typeof settingsObj.integrations.telemetryHeartbeatSeconds === 'number', 'Telemetry heartbeat configured');

  assert(Boolean(settingsObj.notificationRules), '6. Notification Delivery Rules domain present');
  assert(settingsObj.notificationRules.enableAutomatedSmsAlerts === true, 'Automated SMS alerts enabled in notification rules');

  // 5.2 Non-admin access to settings is blocked
  const techSettingsAttempt = await makeInProcessRequest({
    app,
    method: 'GET',
    path: '/api/v1/audit-logs/settings',
    headers: { authorization: `Bearer ${techToken}` }
  });
  assert(techSettingsAttempt.statusCode === 403, 'Technician blocked from reading system settings with HTTP 403 Forbidden');

  // STEP 6: UPDATE SETTINGS & CONFIRM IMMUTABLE AUDIT LOG GENERATION
  console.log('\n--- Step 6: Update Settings & Automatic CONFIG_CHANGE Audit Logging ---');
  
  const settingsUpdatePayload = {
    thresholds: {
      milkQualityCeilingTemp: 3.8, // stricter threshold
      pasteurizerHoldingTemp: 72.5
    },
    aiSettings: {
      minAiConfidenceThreshold: 80,
      rulWarningThresholdDays: 10
    },
    workflowRules: {
      unassignedWorkOrderEscalationHours: 8
    },
    reason: 'Upgraded cooperative hygiene standards and reduced unassigned escalation window to 8 hours'
  };

  const updateSettingsRes = await makeInProcessRequest({
    app,
    method: 'PATCH',
    path: '/api/v1/audit-logs/settings',
    headers: { authorization: `Bearer ${adminToken}` },
    body: settingsUpdatePayload
  });
  assert(updateSettingsRes.statusCode === 200, 'PATCH /audit-logs/settings succeeded with HTTP 200');
  const updated = updateSettingsRes.body.data.settings;
  assert(updated.thresholds.milkQualityCeilingTemp === 3.8, 'Updated milk temperature ceiling persisted');
  assert(updated.aiSettings.minAiConfidenceThreshold === 80, 'Updated AI confidence gate persisted');
  assert(updated.workflowRules.unassignedWorkOrderEscalationHours === 8, 'Updated escalation timeline persisted');

  // Non-admin update blocked
  const techUpdateAttempt = await makeInProcessRequest({
    app,
    method: 'PATCH',
    path: '/api/v1/audit-logs/settings',
    headers: { authorization: `Bearer ${techToken}` },
    body: { thresholds: { milkQualityCeilingTemp: 10.0 } }
  });
  assert(techUpdateAttempt.statusCode === 403, 'Technician blocked from modifying settings with HTTP 403 Forbidden');

  // Verify CONFIG_CHANGE audit record was automatically appended to audit trail
  const verifyAuditAfterUpdate = await makeInProcessRequest({
    app,
    method: 'GET',
    path: '/api/v1/audit-logs?action=CONFIG_CHANGE',
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(verifyAuditAfterUpdate.statusCode === 200, 'Retrieved CONFIG_CHANGE audit logs');
  const latestConfigChange = verifyAuditAfterUpdate.body.data.logs[0];
  assert(latestConfigChange.action === 'CONFIG_CHANGE', 'Most recent audit record is CONFIG_CHANGE');
  assert(latestConfigChange.reason.includes('Upgraded cooperative hygiene standards'), 'Audit log contains operational justification reason');
  assert(Boolean(latestConfigChange.previousState && latestConfigChange.newState), 'Audit log contains full previousState vs newState diff');

  // STEP 7: FRONTEND SOURCE CODE INSPECTION
  console.log('\n--- Step 7: Frontend Source Code Inspection & UI Verification ---');
  const pagePath = path.resolve('frontend/src/pages/AuditLogsSettingsPage.jsx');
  assert(fs.existsSync(pagePath), 'AuditLogsSettingsPage.jsx exists on disk');
  const pageCode = fs.readFileSync(pagePath, 'utf8');

  // Verify all 11 action types in UI dropdown
  assert(pageCode.includes('AUTHENTICATION') && pageCode.includes('LOGIN'), 'UI action filter contains AUTHENTICATION & LOGIN');
  assert(pageCode.includes('DATA_ACCESS') && pageCode.includes('CREATE') && pageCode.includes('MODIFY'), 'UI action filter contains DATA_ACCESS, CREATE, MODIFY');
  assert(pageCode.includes('DELETE') && pageCode.includes('EXPORT') && pageCode.includes('AI_EXECUTION'), 'UI action filter contains DELETE, EXPORT, AI_EXECUTION');
  assert(pageCode.includes('APPROVAL') && pageCode.includes('REJECTION') && pageCode.includes('OVERRIDE'), 'UI action filter contains APPROVAL, REJECTION, OVERRIDE');
  assert(pageCode.includes('CONFIG_CHANGE'), 'UI action filter contains CONFIG_CHANGE');

  // Verify all 6 settings configuration domains in UI
  assert(pageCode.includes('Food Safety Thresholds') && pageCode.includes('milkQualityCeilingTemp'), 'UI supports food safety threshold configuration');
  assert(pageCode.includes('AI & Model Parameters') && pageCode.includes('minAiConfidenceThreshold'), 'UI supports AI model parameter configuration');
  assert(pageCode.includes('Workflow & Escalations') && pageCode.includes('unassignedWorkOrderEscalationHours'), 'UI supports workflow escalation rules configuration');
  assert(pageCode.includes('Master Data Catalog') && pageCode.includes('equipmentCategories'), 'UI supports master data equipment categories');
  assert(pageCode.includes('SCADA & ERP Integrations') && pageCode.includes('scadaOpcEndpoint'), 'UI supports SCADA integration configuration');
  assert(pageCode.includes('Notification Delivery Rules') && pageCode.includes('enableAutomatedSmsAlerts'), 'UI supports notification delivery rules');

  // Verify Immutability architecture banner & state diff modal in UI
  assert(pageCode.includes('Append-Only Immutability Architecture'), 'UI displays append-only immutability banner');
  assert(pageCode.includes('selectedLogForDiff') && pageCode.includes('Audit Transaction Record'), 'UI supports state diff inspection modal');

  console.log('\n========================================================================');
  console.log(` ALL ITEM 12 VERIFICATION CHECKS PASSED: ${passedChecks}/${totalChecks} (100%)`);
  console.log('========================================================================\n');
}

runSuite().catch((err) => {
  console.error('\n*** TEST SUITE FAILED ***\n', err);
  process.exit(1);
});

