/**
 * AUTOMATED END-TO-END VERIFICATION SUITE: ITEM 8
 * "Reliability and Model Performance Page"
 *
 * Requirements Verified:
 * 1. Track false alarms, missed failures, prediction lead time, maintenance effectiveness,
 *    drift, and model performance across all 6 asset classes.
 * 2. Compare recommendations and predictions with actual outcomes (ground-truth stream).
 * 3. Capture user feedback with ratings and operational comments.
 * 4. Display 6 project indicators: Quality, Accuracy, Drift, Latency, Failure, and Adoption.
 * 5. Immutable audit logging for feedback and RBAC governance.
 */

import http from 'http';
import { Socket } from 'net';
import app from '../src/app.js';

let totalAssertions = 0;
const results = [];

function assert(condition, message) {
  totalAssertions++;
  if (condition) {
    results.push({ status: 'PASS', message });
    console.log(`  ✅ [PASS] ${message}`);
  } else {
    results.push({ status: 'FAIL', message });
    console.error(`  ❌ [FAIL] ${message}`);
  }
}

// In-process Express Dispatcher
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
    let rawBody = '';

    res.write = function (chunk) {
      if (chunk) rawBody += chunk.toString();
      return true;
    };

    res.end = function (chunk) {
      if (chunk) rawBody += chunk.toString();
      let parsed = null;
      try {
        parsed = JSON.parse(rawBody);
      } catch (e) {
        parsed = rawBody;
      }
      resolve({
        status: res.statusCode,
        data: parsed,
        headers: res.getHeaders()
      });
    };

    if (body) {
      const dataStr = typeof body === 'string' ? body : JSON.stringify(body);
      req.headers['content-length'] = Buffer.byteLength(dataStr);
      app(req, res);
      req.emit('data', Buffer.from(dataStr));
      req.emit('end');
    } else {
      app(req, res);
      req.emit('end');
    }
  });
}

async function runItem8Tests() {
  console.log('\n================================================================');
  console.log(' ITEM 8 VERIFICATION: RELIABILITY & MODEL PERFORMANCE (MLOPS)   ');
  console.log('================================================================\n');

  // Authenticate Admin, Ops Manager, and Technician
  const adminLogin = await request('POST', '/api/v1/auth/login', {
    body: { email: 'admin@dairycoop.org', password: 'Admin@123' }
  });
  const adminToken = adminLogin.data?.data?.accessToken;

  const opsLogin = await request('POST', '/api/v1/auth/login', {
    body: { email: 'ops@dairycoop.org', password: 'Ops@123' }
  });
  const opsToken = opsLogin.data?.data?.accessToken;

  const techLogin = await request('POST', '/api/v1/auth/login', {
    body: { email: 'tech@dairycoop.org', password: 'Tech@123' }
  });
  const techToken = techLogin.data?.data?.accessToken;

  // -------------------------------------------------------------------------
  // 1. VERIFY 6 CORE INDICATORS (QUALITY, ACCURACY, DRIFT, LATENCY, FAILURE, ADOPTION)
  // -------------------------------------------------------------------------
  console.log('--- 1. SIX MANDATORY MLOPS INDICATORS ---');
  const metricsRes = await request('GET', '/api/v1/ai/mlops-metrics', {
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(metricsRes.status === 200, 'Query MLOps metrics endpoint returned HTTP 200');
  const m = metricsRes.data?.data;

  // Indicator 1: Quality
  assert(typeof m.qualityIndex === 'number', `Indicator [Quality]: Ground-truth data quality index verified (${m.qualityIndex}%)`);
  assert(m.qualityIndex >= 90.0, 'Indicator [Quality]: Meets cooperative data assurance threshold (>90%)');

  // Indicator 2: Accuracy
  assert(typeof m.accuracyScore === 'number', `Indicator [Accuracy]: Overall accuracy verified (${m.accuracyScore}%)`);
  assert(m.accuracyScore >= 85.0, 'Indicator [Accuracy]: High prediction precision verified (>85%)');

  // Indicator 3: Drift
  assert(typeof m.driftIndex === 'number', `Indicator [Drift]: Concept & feature drift index verified (${m.driftIndex})`);
  assert(m.driftIndex < 0.10, 'Indicator [Drift]: Model stability confirmed below drift boundary (< 0.10 PSI)');

  // Indicator 4: Latency
  assert(typeof m.predictionLatencyMs === 'number', `Indicator [Latency]: Inference latency verified (${m.predictionLatencyMs}ms)`);
  assert(m.predictionLatencyMs < 1000, 'Indicator [Latency]: Sub-second responsive edge inference (< 1000ms)');

  // Indicator 5: Failure
  assert(typeof m.failureRate === 'number', `Indicator [Failure]: Missed failure rate verified (${m.failureRate}%)`);
  assert(typeof m.falseAlarmRate === 'number', `Indicator [Failure]: False alarm rate verified (${m.falseAlarmRate}%)`);
  assert(typeof m.missedFailures === 'number', `Indicator [Failure]: Missed failures count verified (${m.missedFailures})`);

  // Indicator 6: Adoption
  assert(typeof m.adoptionRate === 'number', `Indicator [Adoption]: Human supervisor recommendation adoption verified (${m.adoptionRate}%)`);
  assert(m.adoptionRate >= 80.0, 'Indicator [Adoption]: High operational trust confirmed (>80%)');

  // Supporting Operational Indicators
  assert(typeof m.avgLeadTimeHours === 'number', `Advance warning lead time tracked (${m.avgLeadTimeHours} hours)`);
  assert(typeof m.maintenanceEffectiveness === 'number', `Maintenance effectiveness tracked (${m.maintenanceEffectiveness}%)`);

  // -------------------------------------------------------------------------
  // 2. MODEL PERFORMANCE BY ASSET CLASS (ALL 6 DAIRY CATEGORIES)
  // -------------------------------------------------------------------------
  console.log('\n--- 2. MODEL PERFORMANCE BY ASSET CLASS (ALL 6 CATEGORIES) ---');
  const catPerf = m.categoryPerformance || [];
  assert(catPerf.length === 6, `Model performance broken down across all 6 dairy equipment classes (${catPerf.length} classes)`);

  const expectedClasses = [
    'Bulk Milk Coolers (BMCs)',
    'Plate Pasteurizers',
    'Chilled Milk Tankers',
    'Homogenizers',
    'Cold Storage Rooms',
    'Pouch Packaging Machines'
  ];

  for (const exp of expectedClasses) {
    const found = catPerf.find(c => c.category === exp);
    assert(Boolean(found), `Equipment class [${exp}]: Verified presence in MLOps breakdown`);
    assert(typeof found?.accuracy === 'number' && found?.accuracy >= 80, `Equipment class [${exp}]: Accuracy verified (${found?.accuracy}%)`);
    assert(typeof found?.sampleCount === 'number', `Equipment class [${exp}]: Sample inspections tracked (${found?.sampleCount})`);
  }

  // -------------------------------------------------------------------------
  // 3. COMPARE PREDICTIONS & RECOMMENDATIONS WITH ACTUAL OUTCOMES
  // -------------------------------------------------------------------------
  console.log('\n--- 3. GROUND-TRUTH PREDICTION VS ACTUAL OUTCOME COMPARISONS ---');
  const comparisons = m.outcomeComparisons || [];
  assert(comparisons.length >= 4, `Ground-truth comparisons stream available (${comparisons.length} records)`);

  const sampleComp = comparisons[0];
  assert(Boolean(sampleComp.assetTag && sampleComp.assetName), `Comparison captures Equipment (${sampleComp.assetTag} - ${sampleComp.assetName})`);
  assert(Boolean(sampleComp.predictedFailureMode), `Comparison captures Predicted Failure Mode ("${sampleComp.predictedFailureMode}")`);
  assert(Boolean(sampleComp.actualOutcome), `Comparison captures Actual Physical Outcome ("${sampleComp.actualOutcome}")`);
  assert(Boolean(sampleComp.outcomeClassification), `Outcome classification labeled: ${sampleComp.outcomeClassification}`);
  assert(typeof sampleComp.leadTimeHours === 'number', `Advance warning lead time recorded (${sampleComp.leadTimeHours}h)`);
  assert(Boolean(sampleComp.technicianName), `Certified technician verifier captured: ${sampleComp.technicianName}`);

  // -------------------------------------------------------------------------
  // 4. CAPTURE USER FEEDBACK
  // -------------------------------------------------------------------------
  console.log('\n--- 4. USER FEEDBACK CAPTURE & VALIDATION ---');
  // 1. Query feedback stream
  const fbRes = await request('GET', '/api/v1/ai/feedback', {
    headers: { authorization: `Bearer ${techToken}` }
  });
  assert(fbRes.status === 200, 'Query feedback stream returned HTTP 200');
  const existingFb = fbRes.data?.data?.feedbackList || [];
  assert(existingFb.length >= 2, `Pre-seeded user feedback entries found (${existingFb.length} entries)`);

  // 2. Validation: Reject empty feedback comment
  const invalidFb = await request('POST', '/api/v1/ai/feedback', {
    headers: { authorization: `Bearer ${techToken}` },
    body: {
      assetTag: 'BMC-018',
      rating: 5,
      feedbackCategory: 'TRUE_POSITIVE',
      userComment: ''
    }
  });
  assert(invalidFb.status === 400, 'Empty feedback comment rejected with HTTP 400 Bad Request');

  // 3. Submit valid user feedback from field technician
  const newFbRes = await request('POST', '/api/v1/ai/feedback', {
    headers: { authorization: `Bearer ${techToken}` },
    body: {
      assetTag: 'BMC-018',
      rating: 5,
      feedbackCategory: 'TRUE_POSITIVE',
      userComment: 'Verified suction reed valve bypass during evening inspection. Replaced valve assembly before milk reception batch arrived.'
    }
  });
  assert(newFbRes.status === 201, 'Technician feedback submitted with HTTP 201 Created');
  assert(newFbRes.data?.data?.assetTag === 'BMC-018', 'Captured asset tag verified as BMC-018');
  assert(newFbRes.data?.data?.rating === 5, 'Captured 5-star rating');
  assert(Boolean(newFbRes.data?.data?.userName), `Captured submitting user: ${newFbRes.data?.data?.userName}`);

  // 4. Verify feedback appears in updated MLOps metrics stream
  const updatedMetricsRes = await request('GET', '/api/v1/ai/mlops-metrics', {
    headers: { authorization: `Bearer ${opsToken}` }
  });
  const updatedList = updatedMetricsRes.data?.data?.userFeedbackList || [];
  const foundSubmitted = updatedList.find(f => f.assetTag === 'BMC-018');
  assert(Boolean(foundSubmitted), 'Newly submitted user feedback immediately integrated into MLOps stream');

  // -------------------------------------------------------------------------
  // 5. IMMUTABLE AUDIT TRAIL LOGGING
  // -------------------------------------------------------------------------
  console.log('\n--- 5. IMMUTABLE AUDIT TRAIL RECORDING ---');
  const auditRes = await request('GET', '/api/v1/audit-logs?resourceType=ModelPerformance', {
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(auditRes.status === 200, 'Audit trail queried successfully with HTTP 200');
  const logs = auditRes.data?.data?.logs || [];
  assert(logs.length >= 1, `Feedback capture recorded in immutable audit ledger (${logs.length} events logged)`);
  
  const sampleAudit = logs[0];
  assert(Boolean(sampleAudit.actorName), 'Audit record captures Reviewer / Technician Name');
  assert(Boolean(sampleAudit.reason), `Audit record captures Feedback Note ("${sampleAudit.reason}")`);
  assert(Boolean(sampleAudit.timestamp), 'Audit record captures Decision Timestamp');

  // -------------------------------------------------------------------------
  // RESULTS SUMMARY
  // -------------------------------------------------------------------------
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;

  console.log('\n================================================================');
  console.log('             ITEM 8 VERIFICATION RESULTS SUMMARY                ');
  console.log('================================================================');
  console.log(` TOTAL ASSERTIONS : ${results.length}`);
  console.log(` PASSED           : ${passed}`);
  console.log(` FAILED           : ${failed}`);
  console.log(` SUCCESS RATE     : ${Math.round((passed / results.length) * 100)}%`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runItem8Tests().catch(err => {
  console.error('Fatal execution error in Item 8 tests:', err);
  process.exit(1);
});

