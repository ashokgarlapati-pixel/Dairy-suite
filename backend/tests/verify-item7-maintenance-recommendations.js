/**
 * AUTOMATED END-TO-END VERIFICATION SUITE: ITEM 7
 * "Maintenance Recommendations Page"
 *
 * Requirements Verified:
 * 1. Content: Timing, Required Skills, Probable Parts, Expected Downtime, Priority
 *    derived from Criticality, Safety, Cost, and Operational Impact.
 * 2. Clear Separation: Distinct AI suggestions (PENDING_REVIEW) vs Approved Business Decisions.
 * 3. HITL Controls: Authorized review actions: ACCEPT, REJECT, CORRECT, OVERRIDE.
 * 4. Mandatory Reason: Enforces operational explanation (min 5 chars).
 * 5. RBAC & Audit: Restricted to Maintenance Admin / Ops Manager, immutable audit log created.
 */

import http from 'http';
import { Socket } from 'net';
import app from '../src/app.js';
import { inMemoryRecommendations } from '../src/controllers/aiController.js';

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

async function runItem7Tests() {
  console.log('\n================================================================');
  console.log(' ITEM 7 VERIFICATION: MAINTENANCE RECOMMENDATIONS (HITL)        ');
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
  // 1. VERIFY RECOMMENDATION CONTENT DIMENSIONS
  // -------------------------------------------------------------------------
  console.log('--- 1. RECOMMENDATION CONTENT & IMPACT ANALYSIS ---');
  const getRes = await request('GET', '/api/v1/ai/recommendations', {
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(getRes.status === 200, 'Query recommendations returned HTTP 200');
  const recList = getRes.data?.data?.recommendations || [];
  assert(recList.length >= 2, `Pre-seeded recommendations available (${recList.length} items)`);

  const rec = recList[0];
  assert(Boolean(rec.title), `Recommendation title verified: "${rec.title}"`);
  assert(Boolean(rec.suggestedTiming), `Recommended timing specified: "${rec.suggestedTiming}"`);
  assert(Array.isArray(rec.requiredSkills) && rec.requiredSkills.length > 0, `Required skills specified (${rec.requiredSkills.join(', ')})`);
  assert(Array.isArray(rec.probableParts) && rec.probableParts.length > 0, `Probable spare parts specified (${rec.probableParts.map(p => p.partName).join(', ')})`);
  assert(typeof rec.expectedDowntimeHours === 'number', `Expected downtime specified (${rec.expectedDowntimeHours} hours)`);
  assert(Boolean(rec.priority), `Priority level derived (${rec.priority})`);
  assert(Boolean(rec.safetyImpact), `Food safety & biological impact evaluated: "${rec.safetyImpact}"`);
  assert(Boolean(rec.costImpact?.estimatedMilkSouringLoss), `Cost impact evaluated (₹${rec.costImpact.estimatedMilkSouringLoss.toLocaleString()} potential spoilage loss)`);
  assert(Boolean(rec.operationalImpact), `Operational plant impact evaluated: "${rec.operationalImpact}"`);

  // -------------------------------------------------------------------------
  // 2. SEPARATION OF AI SUGGESTIONS FROM APPROVED BUSINESS DECISIONS
  // -------------------------------------------------------------------------
  console.log('\n--- 2. SEPARATION OF AI SUGGESTIONS FROM BUSINESS DECISIONS ---');
  assert(rec.status === 'PENDING_REVIEW', 'Unreviewed recommendation clearly marked as PENDING_REVIEW (AI Advisory Suggestion)');
  assert(!rec.reviewedBy, 'Unreviewed recommendation has no reviewer assignment');
  assert(!rec.convertedWorkOrderId, 'Unreviewed recommendation has not dispatched any physical work order');

  // -------------------------------------------------------------------------
  // 3. HUMAN-IN-THE-LOOP ACTIONS: ACCEPT, CORRECT, OVERRIDE, REJECT
  // -------------------------------------------------------------------------
  console.log('\n--- 3. HITL REVIEW ACTIONS & MANDATORY REASON ---');

  // ACTION 1: ACCEPT
  const targetRec1 = recList[0];
  const acceptRes = await request('POST', `/api/v1/ai/recommendations/${targetRec1._id}/review`, {
    headers: { authorization: `Bearer ${opsToken}` },
    body: {
      decision: 'ACCEPTED',
      reviewerReason: 'Reviewed chilling curve: 4.2h suction depression verified on BMC-MYSORE-014. Dispatching certified mechanic for valve plate replacement.'
    }
  });
  assert(acceptRes.status === 200, 'Action [ACCEPT]: Recommendation accepted successfully (HTTP 200)');
  assert(acceptRes.data?.data?.recommendation?.status === 'ACCEPTED', 'Status transitioned to ACCEPTED business decision');
  assert(Boolean(acceptRes.data?.data?.convertedWorkOrder?.workOrderNumber), `Verified work order automatically dispatched: ${acceptRes.data?.data?.convertedWorkOrder?.workOrderNumber}`);
  assert(acceptRes.data?.data?.recommendation?.reviewerName === 'Ramesh Patel (Operations Manager)', 'Reviewer name captured');

  // ACTION 2: CORRECT (Adjust parameters like priority/skills/downtime)
  const targetRec2 = recList[1];
  const correctRes = await request('POST', `/api/v1/ai/recommendations/${targetRec2._id}/review`, {
    headers: { authorization: `Bearer ${adminToken}` },
    body: {
      decision: 'CORRECTED',
      modifiedPriority: 'CRITICAL_P0',
      reviewerReason: 'Corrected priority from P1 to P0 because regeneration plate differential pressure exceeded 2.0 bar, threatening sub-pasteurization shutoff.'
    }
  });
  assert(correctRes.status === 200, 'Action [CORRECT]: Recommendation corrected successfully (HTTP 200)');
  assert(correctRes.data?.data?.recommendation?.status === 'CORRECTED', 'Status transitioned to CORRECTED business decision');
  assert(correctRes.data?.data?.recommendation?.priority === 'CRITICAL_P0', 'Supervisor corrected priority to CRITICAL_P0');
  assert(Boolean(correctRes.data?.data?.convertedWorkOrder), 'Corrected recommendation dispatched updated work order');

  // ACTION 3: OVERRIDE (Human engineering judgment overrides AI suggestion)
  // Create a third recommendation to test OVERRIDE
  const overrideRec = {
    _id: 'REC-TEST-OVERRIDE',
    recommendationId: 'REC-TEST-OVERRIDE',
    assetTag: 'TNK-KA09-4412',
    title: 'Auxiliary Chiller Compressor Complete Teardown',
    suggestedTiming: 'Immediate',
    priority: 'CRITICAL_P0',
    status: 'PENDING_REVIEW',
    safetyImpact: 'Refrigeration loss in transit',
    costImpact: { estimatedRepairCost: 45000, estimatedMilkSouringLoss: 120000 },
    operationalImpact: 'Tanker grounded',
    requiredSkills: ['Refrigeration Specialist'],
    probableParts: [{ partName: 'Complete 3HP Compressor Assembly', estimatedCost: 35000 }]
  };
  inMemoryRecommendations.push(overrideRec);

  const overrideRes = await request('POST', `/api/v1/ai/recommendations/${overrideRec._id}/review`, {
    headers: { authorization: `Bearer ${opsToken}` },
    body: {
      decision: 'OVERRIDDEN',
      modifiedPriority: 'LOW_P3',
      reviewerReason: 'Supervisor engineering override: Physical test revealed compressor is undamaged; anomaly caused by loose ambient thermocouple cable.'
    }
  });
  assert(overrideRes.status === 200, 'Action [OVERRIDE]: Recommendation overridden successfully (HTTP 200)');
  assert(overrideRes.data?.data?.recommendation?.status === 'OVERRIDDEN', 'Status transitioned to OVERRIDDEN business decision');

  // ACTION 4: REJECT (Dismiss suggestion)
  const rejectRec = {
    _id: 'REC-TEST-REJECT',
    recommendationId: 'REC-TEST-REJECT',
    assetTag: 'CLR-STORE-03',
    title: 'Cold Room Evaporator Fan Motor Replacement',
    suggestedTiming: 'Within 24h',
    priority: 'HIGH_P1',
    status: 'PENDING_REVIEW',
    safetyImpact: 'Cold room air temperature elevation',
    costImpact: { estimatedRepairCost: 8500, estimatedMilkSouringLoss: 75000 },
    operationalImpact: 'Cold store staging delayed',
    requiredSkills: ['Electrician'],
    probableParts: [{ partName: 'Fan Motor 0.75kW', estimatedCost: 6500 }]
  };
  inMemoryRecommendations.push(rejectRec);

  const rejectRes = await request('POST', `/api/v1/ai/recommendations/${rejectRec._id}/review`, {
    headers: { authorization: `Bearer ${opsToken}` },
    body: {
      decision: 'REJECTED',
      reviewerReason: 'Rejection: False alarm triggered during intentional hot-gas defrost cycle. Temperature returned to 2.4°C within 15 minutes.'
    }
  });
  assert(rejectRes.status === 200, 'Action [REJECT]: Recommendation rejected successfully (HTTP 200)');
  assert(rejectRes.data?.data?.recommendation?.status === 'REJECTED', 'Status transitioned to REJECTED business decision');

  // -------------------------------------------------------------------------
  // 4. MANDATORY REASON VALIDATION & RBAC ENFORCEMENT
  // -------------------------------------------------------------------------
  console.log('\n--- 4. MANDATORY REASON VALIDATION & RBAC SECURITY ---');

  // Attempt review with empty reason
  const emptyReasonRes = await request('POST', `/api/v1/ai/recommendations/${targetRec1._id}/review`, {
    headers: { authorization: `Bearer ${opsToken}` },
    body: { decision: 'ACCEPTED', reviewerReason: '' }
  });
  assert(emptyReasonRes.status === 400, 'Empty justification reason rejected with HTTP 400 Bad Request');
  assert(emptyReasonRes.data?.message?.includes('Mandatory justification required'), 'Validation message prompts for mandatory operational explanation');

  // Attempt review by unauthorized Technician role
  const techReviewRes = await request('POST', `/api/v1/ai/recommendations/${targetRec1._id}/review`, {
    headers: { authorization: `Bearer ${techToken}` },
    body: { decision: 'ACCEPTED', reviewerReason: 'Unauthorized technician attempt to approve' }
  });
  assert(techReviewRes.status === 403, 'RBAC: Unauthorized technician review forbidden with HTTP 403 Forbidden');

  // -------------------------------------------------------------------------
  // 5. AUDIT TRAIL LOGGING
  // -------------------------------------------------------------------------
  console.log('\n--- 5. IMMUTABLE DECISION AUDIT RECORDING ---');
  const auditRes = await request('GET', '/api/v1/audit-logs?resourceType=Recommendation', {
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(auditRes.status === 200, 'Audit trail queried successfully with HTTP 200');
  const logs = auditRes.data?.data?.logs || [];
  assert(logs.length >= 4, `All 4 review decisions permanently recorded in audit trail (${logs.length} events logged)`);
  
  const sampleAudit = logs[0];
  assert(Boolean(sampleAudit.actorName), 'Audit record captures Reviewer Name');
  assert(Boolean(sampleAudit.reason), `Audit record captures Mandatory Reason ("${sampleAudit.reason}")`);
  assert(Boolean(sampleAudit.timestamp), 'Audit record captures Decision Timestamp');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;

  console.log('\n================================================================');
  console.log('             ITEM 7 VERIFICATION RESULTS SUMMARY                ');
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

runItem7Tests().catch(err => {
  console.error('Fatal execution error in Item 7 tests:', err);
  process.exit(1);
});
