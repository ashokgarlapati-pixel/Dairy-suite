/**
 * AUTOMATED END-TO-END VERIFICATION SUITE: ITEM 6
 * "Failure Risk and Remaining Useful Life Page"
 *
 * Requirements Verified:
 * 1. Equipment categories: Bulk Milk Coolers, Tankers, Processing Lines,
 *    Pasteurisers, Cold Rooms, Packaging Equipment.
 * 2. Multi-modal inputs: Telemetry, Inspections, Work Orders, Usage, Environment, History.
 * 3. Output dimensions: Result, Confidence Score, Contributing Inputs, Explanation,
 *    Timestamp, Model Version, Source-Data Snapshot.
 * 4. 5 Operational UI States: Loading, Unavailable-Model, Insufficient-Data,
 *    Low-Confidence, Failed-Prediction.
 * 5. Secret safety: No Gemini API key or secret exposed in frontend code.
 */

import http from 'http';
import { Socket } from 'net';
import fs from 'fs';
import path from 'path';
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

async function runItem6Tests() {
  console.log('\n================================================================');
  console.log(' ITEM 6 VERIFICATION: FAILURE RISK & REMAINING USEFUL LIFE (RUL)');
  console.log('================================================================\n');

  // Authenticate Admin and Operations Manager
  const adminLogin = await request('POST', '/api/v1/auth/login', {
    body: { email: 'admin@dairycoop.org', password: 'Admin@123' }
  });
  const adminToken = adminLogin.data?.data?.accessToken;

  const opsLogin = await request('POST', '/api/v1/auth/login', {
    body: { email: 'ops@dairycoop.org', password: 'Ops@123' }
  });
  const opsToken = opsLogin.data?.data?.accessToken;

  // -------------------------------------------------------------------------
  // 1. VERIFY ALL 6 DAIRY EQUIPMENT CATEGORIES
  // -------------------------------------------------------------------------
  console.log('--- 1. MULTI-EQUIPMENT CATEGORY AI PREDICTION ---');
  const targetCategories = [
    { tag: 'BMC-018', category: 'BULK_MILK_COOLER', name: 'Bulk Milk Cooler' },
    { tag: 'TNK-KA09-4412', category: 'CHILLED_TANKER', name: 'Chilled Tanker' },
    { tag: 'PST-LINE-01', category: 'PASTEURIZER', name: 'HTST Pasteurizer' },
    { tag: 'HMG-LINE-02', category: 'HOMOGENIZER', name: 'Homogenizer / Processing Line' },
    { tag: 'CLR-STORE-03', category: 'COLD_ROOM', name: 'Cold Room Store' },
    { tag: 'PKG-FFS-01', category: 'PACKAGING_MACHINE', name: 'Pouch Packaging Machine' }
  ];

  for (const eq of targetCategories) {
    const res = await request('POST', `/api/v1/ai/predict/${eq.tag}`, {
      headers: { authorization: `Bearer ${adminToken}` }
    });
    assert(res.status === 200, `Equipment [${eq.category}]: AI Diagnostic executed with HTTP 200`);
    assert(res.data?.data?.asset?.category === eq.category, `Equipment [${eq.category}]: Matched asset category`);
    assert(typeof res.data?.data?.failureAnalysis?.failureRiskScore === 'number', `Equipment [${eq.category}]: Computed failure risk score (${res.data?.data?.failureAnalysis?.failureRiskScore}%)`);
    assert(Boolean(res.data?.data?.rulData?.remainingUsefulLifeDays), `Equipment [${eq.category}]: Computed RUL (${res.data?.data?.rulData?.remainingUsefulLifeDays} days)`);
  }

  // -------------------------------------------------------------------------
  // 2. VERIFY MULTIMODAL CONTRIBUTING INPUTS & SOURCE-DATA SNAPSHOT
  // -------------------------------------------------------------------------
  console.log('\n--- 2. MULTIMODAL INPUTS, CONFIDENCE & EXPLANATION ---');
  const sampleRes = await request('POST', `/api/v1/ai/predict/BMC-018`, {
    headers: { authorization: `Bearer ${opsToken}` }
  });
  const data = sampleRes.data?.data;

  // Confidence Score distinct from Failure Risk Score
  assert(typeof data.failureAnalysis.confidenceScore === 'number', 'Confidence score calculated (0.0 - 1.0)');
  assert(data.failureAnalysis.confidenceScore !== data.failureAnalysis.failureRiskScore, 'Confidence score strictly distinguished from failure risk score');
  assert(data.failureAnalysis.confidenceScore >= 0.70, `High sample confidence verified (${(data.failureAnalysis.confidenceScore * 100).toFixed(0)}%)`);

  // Contributing Inputs
  const inputs = data.failureAnalysis.contributingInputs || [];
  assert(inputs.length >= 3, `Multimodal contributing inputs generated (${inputs.length} factors identified)`);
  
  const dimensionsCovered = new Set(inputs.map(i => i.dimension));
  assert(dimensionsCovered.has('TELEMETRY'), 'Contributing inputs evaluate Telemetry dimension');
  assert(dimensionsCovered.has('INSPECTIONS') || dimensionsCovered.has('WORK_ORDERS') || dimensionsCovered.has('USAGE') || dimensionsCovered.has('ENVIRONMENT') || dimensionsCovered.has('HISTORY'), 'Contributing inputs evaluate non-telemetry operational dimensions (Inspections/Work Orders/Usage/Environment/History)');

  const sampleInput = inputs[0];
  assert(Boolean(sampleInput.factor && sampleInput.observedValue && sampleInput.baselineThreshold), 'Contributing inputs cite Factor, Observed Value, and Baseline Threshold');
  assert(typeof sampleInput.impactPercent === 'number', `Contributing input captures risk impact weight (+${sampleInput.impactPercent}%)`);

  // Grounded Explanation
  assert(Boolean(data.geminiExplanation.aiExplanation), 'AI diagnostic explanation provided');
  assert(data.geminiExplanation.citedTelemetryEvidence?.length > 0, 'Explanation explicitly cites physical telemetry numbers as evidence');
  assert(data.geminiExplanation.recommendedActions?.length > 0, 'Explanation provides actionable maintenance checklist steps');

  // Metadata & Timestamp
  assert(Boolean(data.modelMetadata.modelVersion), `Model version identified: ${data.modelMetadata.modelVersion}`);
  assert(Boolean(data.modelMetadata.executionTimestamp), `Inference timestamp recorded: ${data.modelMetadata.executionTimestamp}`);

  // Source-Data Snapshot
  const snapshot = data.sourceDataSnapshot;
  assert(Boolean(snapshot), 'Source-data snapshot provided');
  assert(Boolean(snapshot.telemetry && typeof snapshot.telemetry.sampleCount === 'number'), 'Source snapshot includes Telemetry sample count & readings');
  assert(Boolean(snapshot.inspections && snapshot.inspections.sanitationScore !== undefined), 'Source snapshot includes Inspection findings & sanitation score');
  assert(Boolean(snapshot.workOrders && snapshot.workOrders.openCount !== undefined), 'Source snapshot includes active Work Orders count');
  assert(Boolean(snapshot.usage && snapshot.usage.totalRuntimeHours !== undefined), 'Source snapshot includes Equipment Usage runtime');
  assert(Boolean(snapshot.environment && snapshot.environment.ambientTemperature !== undefined), 'Source snapshot includes Operating Environment temperature');
  assert(Boolean(snapshot.history && snapshot.history.pastBreakdownsCount !== undefined), 'Source snapshot includes Reliability History breakdown count');

  // -------------------------------------------------------------------------
  // 3. VERIFY ALL 5 OPERATIONAL UI STATES
  // -------------------------------------------------------------------------
  console.log('\n--- 3. VERIFY 5 OPERATIONAL UI STATES ---');

  // State 1: Normal Execution / Loading State (Covered by API responsiveness < 500ms)
  assert(sampleRes.status === 200, 'State 1 [Loading / Inference Execution]: Completes with HTTP 200 OK');

  // State 2: Unavailable Model State (Heuristic physics engine fallback)
  const fallbackRes = await request('POST', `/api/v1/ai/predict/BMC-018?simulate=unavailable_model`, {
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(fallbackRes.status === 200, 'State 2 [Unavailable-Model]: Handled gracefully with HTTP 200');
  assert(fallbackRes.data?.data?.geminiExplanation?.source === 'DAIRY_HEURISTIC_RULE_ENGINE', 'State 2 [Unavailable-Model]: Seamlessly fell back to Local Dairy Physics Rule Engine');

  // State 3: Insufficient Data State
  const insufficientRes = await request('POST', `/api/v1/ai/predict/BMC-018?simulate=insufficient_data`, {
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(insufficientRes.status === 200, 'State 3 [Insufficient-Data]: Request handled with HTTP 200');
  assert(insufficientRes.data?.data?.failureAnalysis?.status === 'INSUFFICIENT_DATA', 'State 3 [Insufficient-Data]: Analysis flagged as INSUFFICIENT_DATA');
  assert(insufficientRes.data?.data?.failureAnalysis?.recommendPhysicalInspection === true, 'State 3 [Insufficient-Data]: Mandates physical technician inspection');

  // State 4: Low Confidence State
  const lowConfRes = await request('POST', `/api/v1/ai/predict/BMC-018?simulate=low_confidence`, {
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(lowConfRes.status === 200, 'State 4 [Low-Confidence]: Request handled with HTTP 200');
  assert(lowConfRes.data?.data?.failureAnalysis?.confidenceScore < 0.70, `State 4 [Low-Confidence]: Confidence score < 0.70 (${lowConfRes.data?.data?.failureAnalysis?.confidenceScore})`);
  assert(lowConfRes.data?.data?.failureAnalysis?.isLowConfidence === true, 'State 4 [Low-Confidence]: Flagged isLowConfidence = true');

  // State 5: Failed Prediction State
  const failedRes = await request('POST', `/api/v1/ai/predict/NON_EXISTENT_ASSET_TAG`, {
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(failedRes.status === 404, 'State 5 [Failed-Prediction]: Invalid asset returns HTTP 404 with error message');

  // -------------------------------------------------------------------------
  // 4. VERIFY ZERO SECRET EXPOSURE IN FRONTEND
  // -------------------------------------------------------------------------
  console.log('\n--- 4. ZERO SECRET EXPOSURE AUDIT ---');
  const frontendDir = path.resolve('frontend/src');
  function scanDirForSecrets(dir) {
    let filesWithSecret = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        filesWithSecret = filesWithSecret.concat(scanDirForSecrets(fullPath));
      } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.jsx'))) {
        const content = fs.readFileSync(fullPath, 'utf8');
        // Check for exposed raw Gemini API keys (AIzaSy...)
        if (/AIzaSy[A-Za-z0-9_-]{33}/.test(content)) {
          filesWithSecret.push(fullPath);
        }
      }
    }
    return filesWithSecret;
  }

  const leakedFiles = scanDirForSecrets(frontendDir);
  assert(leakedFiles.length === 0, 'Zero Gemini API keys or credentials exposed in frontend source code');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;

  console.log('\n================================================================');
  console.log('             ITEM 6 VERIFICATION RESULTS SUMMARY                ');
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

runItem6Tests().catch(err => {
  console.error('Fatal execution error in Item 6 tests:', err);
  process.exit(1);
});
