/**
 * DairyReliability Suite — Phase 7 Automated End-to-End Verification Test Suite
 *
 * In-process direct Express router execution (Socketless, fully compliant http.ServerResponse)
 */

import http from 'http';
import { Socket } from 'net';
import app from '../src/app.js';

let adminToken = '';
let techToken = '';
let opsToken = '';

const results = [];

function assert(condition, message) {
  if (condition) {
    results.push({ status: 'PASS', message });
    console.log(`  ✅ [PASS] ${message}`);
  } else {
    results.push({ status: 'FAIL', message });
    console.error(`  ❌ [FAIL] ${message}`);
  }
}

function request(method, path, { headers = {}, body } = {}) {
  return new Promise((resolve) => {
    const socket = new Socket();
    Object.defineProperty(socket, 'remoteAddress', { value: '127.0.0.1' });
    const req = new http.IncomingMessage(socket);
    req.ip = '127.0.0.1';
    req.method = method.toUpperCase();
    req.url = path;
    req.originalUrl = path;
    req.headers = {
      host: 'localhost:5000',
      'x-forwarded-for': '127.0.0.1',
      'content-type': 'application/json',
      ...Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]))
    };

    const res = new http.ServerResponse(req);
    let resBody = '';

    res.write = function (chunk) {
      if (chunk) resBody += chunk.toString();
      return true;
    };

    res.end = function (chunk) {
      if (chunk) resBody += chunk.toString();

      let parsed = resBody;
      try {
        parsed = JSON.parse(resBody);
      } catch (e) {}

      resolve({
        status: res.statusCode,
        headers: res.getHeaders(),
        data: parsed
      });
    };

    if (body) {
      const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
      req.headers['content-length'] = Buffer.byteLength(bodyStr).toString();
      req.push(Buffer.from(bodyStr));
    }
    req.push(null);

    app(req, res, (err) => {
      if (err) {
        resolve({
          status: 500,
          headers: {},
          data: { error: err.message }
        });
      }
    });
  });
}

async function runTests() {
  console.log('\n================================================================');
  console.log(' DAIRYRELIABILITY SUITE — PHASE 7 END-TO-END VERIFICATION SUITE ');
  console.log('================================================================\n');

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Health & System Diagnostics
    // -------------------------------------------------------------------------
    console.log('--- TEST 1: Gateway Health & System Diagnostics ---');
    const healthRes = await request('GET', '/api/v1/health');
    assert(healthRes.status === 200, 'Health endpoint responds with HTTP 200');
    assert(healthRes.data?.success === true, 'Health check reports operational success');
    assert(healthRes.data?.data?.service?.includes('Asset Reliability'), 'Verified service name');

    // -------------------------------------------------------------------------
    // TEST 2: Authentication & JWT Token Issuance (All Roles)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2: Authentication & JWT Token Issuance ---');
    const adminLogin = await request('POST', '/api/v1/auth/login', {
      body: { email: 'admin@dairycoop.org', password: 'Admin@123' }
    });
    assert(adminLogin.status === 200, 'Maintenance Admin login returned HTTP 200');
    assert(Boolean(adminLogin.data?.data?.accessToken), 'Received JWT access token for Admin');
    adminToken = adminLogin.data?.data?.accessToken;

    const techLogin = await request('POST', '/api/v1/auth/login', {
      body: { email: 'tech@dairycoop.org', password: 'Tech@123' }
    });
    assert(techLogin.status === 200, 'Field Technician login returned HTTP 200');
    techToken = techLogin.data?.data?.accessToken;

    const opsLogin = await request('POST', '/api/v1/auth/login', {
      body: { email: 'ops@dairycoop.org', password: 'Ops@123' }
    });
    assert(opsLogin.status === 200, 'Operations Manager login returned HTTP 200');
    opsToken = opsLogin.data?.data?.accessToken;

    // -------------------------------------------------------------------------
    // TEST 3: Role-Based Access Control (RBAC Security Isolation)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 3: RBAC Security Boundaries & Least Privilege ---');
    // Technician should be BLOCKED from accessing User Directory
    const techUserAttempt = await request('GET', '/api/v1/users', {
      headers: { Authorization: `Bearer ${techToken}` }
    });
    assert(techUserAttempt.status === 403, 'Technician forbidden from accessing User Directory (HTTP 403)');

    // Technician should be BLOCKED from accessing Audit Trail
    const techAuditAttempt = await request('GET', '/api/v1/audit-logs', {
      headers: { Authorization: `Bearer ${techToken}` }
    });
    assert(techAuditAttempt.status === 403, 'Technician forbidden from accessing Immutable Audit Trail (HTTP 403)');

    // Admin CAN access User Directory
    const adminUserAccess = await request('GET', '/api/v1/users', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(adminUserAccess.status === 200, 'Maintenance Admin authorized to access User Directory (HTTP 200)');

    // -------------------------------------------------------------------------
    // TEST 4: Dairy Asset Registry CRUD & Tag Resolution
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 4: Dairy Asset Registry & Tag Resolution ---');
    const assetsRes = await request('GET', '/api/v1/assets?limit=10', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(assetsRes.status === 200, 'Asset registry queried successfully');
    assert(Array.isArray(assetsRes.data?.data?.assets), 'Assets array returned');
    assert(assetsRes.data?.data?.assets.length > 0, 'Found pre-seeded dairy cooperative equipment');

    // Test specific tag lookup and alias resolution
    const bmcLookup = await request('GET', '/api/v1/assets/BMC-018', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(bmcLookup.status === 200, 'Successfully fetched Bulk Milk Cooler BMC-018');
    assert(bmcLookup.data?.data?.category === 'BULK_MILK_COOLER', 'Asset category matches BULK_MILK_COOLER');

    // Test alias resolver for sample-bmc-018
    const aliasLookup = await request('GET', '/api/v1/assets/sample-bmc-018', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(aliasLookup.status === 200, 'Alias sample-bmc-018 gracefully resolved without 404');

    // -------------------------------------------------------------------------
    // TEST 5: Telemetry Ingestion & Sensor Trend Retrieval
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 5: IoT Sensor Ingestion & Thresholds ---');
    const targetAssetId = bmcLookup.data?.data?._id || 'BMC-018';
    const telemetryIngest = await request('POST', '/api/v1/telemetry/ingest', {
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        readings: [
          {
            assetId: targetAssetId,
            sensorId: 'SENSOR-TEMP-01',
            metricType: 'TEMPERATURE',
            metricValue: 7.2,
            unit: '°C'
          },
          {
            assetId: targetAssetId,
            sensorId: 'SENSOR-SUCTION-01',
            metricType: 'SUCTION_PRESSURE',
            metricValue: 1.8,
            unit: 'bar'
          }
        ]
      }
    });
    assert(telemetryIngest.status === 201 || telemetryIngest.status === 200, 'Telemetry packet ingested successfully');

    // Retrieve sensor trends
    const trendsRes = await request('GET', `/api/v1/telemetry/asset/${targetAssetId}/trends`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(trendsRes.status === 200, 'Sensor trends stream retrieved successfully');
    assert(Array.isArray(trendsRes.data?.data?.trends), 'Trends stream array validated');

    // -------------------------------------------------------------------------
    // TEST 6: Work Order State Machine Lifecycle
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 6: Work Order State Machine Lifecycle ---');
    const createWO = await request('POST', '/api/v1/work-orders', {
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        assetId: targetAssetId,
        title: 'E2E Automated Inspection: Evaporator Suction Valve',
        description: 'Scheduled validation inspection of thermal expansion valve',
        priority: 'HIGH_P1',
        estimatedDowntimeHours: 3.5,
        requiredSkills: ['Refrigeration Mechanic (Certified)'],
        partsRequired: [{ partName: 'Filter Drier Core', quantityReserved: 1, unitCost: 1200 }]
      }
    });
    assert(createWO.status === 201 || createWO.status === 200, 'Work order created successfully');
    const createdWOId = createWO.data?.data?._id;
    assert(Boolean(createdWOId), 'Received generated work order ID');

    // State transition 1: CREATED -> IN_PROGRESS by technician
    const startJob = await request('PATCH', `/api/v1/work-orders/${createdWOId}/status`, {
      headers: { Authorization: `Bearer ${techToken}` },
      body: { status: 'IN_PROGRESS', reason: 'Field technician commenced work order' }
    });
    assert(startJob.status === 200, 'Technician transitioned work order to IN_PROGRESS');

    // State transition 2: IN_PROGRESS -> PENDING_APPROVAL
    const submitForSignoff = await request('PATCH', `/api/v1/work-orders/${createdWOId}/status`, {
      headers: { Authorization: `Bearer ${techToken}` },
      body: { status: 'PENDING_APPROVAL', reason: 'Repairs completed, awaiting supervisor sign-off' }
    });
    assert(submitForSignoff.status === 200, 'Work order advanced to PENDING_APPROVAL');

    // Unauthorized closure test: Technician CANNOT close ticket
    const techCloseAttempt = await request('PATCH', `/api/v1/work-orders/${createdWOId}/status`, {
      headers: { Authorization: `Bearer ${techToken}` },
      body: { status: 'CLOSED', reason: 'Tech closing ticket unilaterally' }
    });
    assert(techCloseAttempt.status === 403, 'Technician forbidden from final closure approval (HTTP 403)');

    // Authorized closure test: Ops Manager approves and closes ticket
    const opsClose = await request('PATCH', `/api/v1/work-orders/${createdWOId}/status`, {
      headers: { Authorization: `Bearer ${opsToken}` },
      body: { status: 'CLOSED', reason: 'Operations Manager verified meter readings & closed ticket' }
    });
    assert(opsClose.status === 200, 'Operations Manager authorized to close work order (HTTP 200)');

    // -------------------------------------------------------------------------
    // TEST 7: AI Diagnostic Engine & Human-in-the-Loop Review
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 7: AI Predictive Diagnostics & HITL Approval ---');
    const aiPredict = await request('POST', `/api/v1/ai/predict/${targetAssetId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(aiPredict.status === 200, 'AI predictive diagnostic scan completed (HTTP 200)');
    assert(typeof aiPredict.data?.data?.failureAnalysis?.failureRiskScore === 'number', 'Calculated failure risk probability');
    assert(typeof aiPredict.data?.data?.failureAnalysis?.confidenceScore === 'number', 'Calculated model confidence score');
    assert(typeof aiPredict.data?.data?.rulData?.remainingUsefulLifeDays === 'number', 'Calculated RUL in days');
    assert(Boolean(aiPredict.data?.data?.geminiExplanation?.aiExplanation || aiPredict.data?.data?.geminiExplanation?.summary), 'Generated explainable diagnostic analysis');

    // Test Human-in-the-Loop recommendations retrieval
    const recsRes = await request('GET', '/api/v1/ai/recommendations', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(recsRes.status === 200, 'Retrieved AI maintenance recommendations');
    assert(Array.isArray(recsRes.data?.data?.recommendations), 'Recommendations array validated');

    // -------------------------------------------------------------------------
    // TEST 8: MLOps Model Performance Telemetry
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 8: MLOps Performance & Drift Metrics ---');
    const mlopsRes = await request('GET', '/api/v1/ai/mlops-metrics', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(mlopsRes.status === 200, 'MLOps performance telemetry retrieved (HTTP 200)');
    assert(typeof mlopsRes.data?.data?.accuracyScore === 'number', 'Model accuracy score tracked');
    assert(typeof mlopsRes.data?.data?.falseAlarmRate === 'number', 'False alarm rate tracked');
    assert(typeof mlopsRes.data?.data?.driftIndex === 'number', 'Model drift index calculated');
    assert(typeof mlopsRes.data?.data?.predictionLatencyMs === 'number', 'Inference latency monitored');
    assert(Array.isArray(mlopsRes.data?.data?.categoryPerformance), 'Category-specific performance array present');

    // -------------------------------------------------------------------------
    // TEST 9: Analytics Reports & CSV Export Stream
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 9: Analytics Reports & Data Export ---');
    const analyticsRes = await request('GET', '/api/v1/analytics/dashboard', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(analyticsRes.status === 200, 'Analytics dashboard summary retrieved (HTTP 200)');
    assert(Boolean(analyticsRes.data?.data?.fleetSummary?.mtbfHours), 'Calculated MTBF metrics');
    assert(Boolean(analyticsRes.data?.data?.financialROI?.avoidedMilkLossINR), 'Calculated avoided milk spoilage ROI');

    // Export CSV report
    const csvExport = await request('GET', '/api/v1/analytics/export?reportType=ASSET_HEALTH&format=csv', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(csvExport.status === 200, 'CSV export stream completed (HTTP 200)');
    assert(csvExport.headers['content-type']?.includes('text/csv'), 'Header confirms Content-Type: text/csv');
    assert(typeof csvExport.data === 'string' && csvExport.data.includes('Asset Tag'), 'Verified CSV column headers');

    // -------------------------------------------------------------------------
    // TEST 10: Immutable Audit Log Ledger
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 10: Immutable Audit Log Ledger ---');
    const auditRes = await request('GET', '/api/v1/audit-logs?limit=10', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(auditRes.status === 200, 'Audit trail queried successfully (HTTP 200)');
    assert(Array.isArray(auditRes.data?.data?.logs), 'Audit logs array verified');
    assert(auditRes.data?.data?.logs.length > 0, 'Verified append-only event records created during test lifecycle');

  } catch (error) {
    console.error('[Test Execution Error]', error);
    results.push({ status: 'FAIL', message: `Unhandled test exception: ${error.message}` });
  }

  // ---------------------------------------------------------------------------
  // Summary Report
  // ---------------------------------------------------------------------------
  const passCount = results.filter((r) => r.status === 'PASS').length;
  const failCount = results.filter((r) => r.status === 'FAIL').length;

  console.log('\n================================================================');
  console.log('                 PHASE 7 TEST RESULTS SUMMARY                   ');
  console.log('================================================================');
  console.log(` TOTAL ASSERTIONS : ${results.length}`);
  console.log(` PASSED           : ${passCount}`);
  console.log(` FAILED           : ${failCount}`);
  console.log(` SUCCESS RATE     : ${Math.round((passCount / results.length) * 100)}%`);
  console.log('================================================================\n');

  if (failCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
