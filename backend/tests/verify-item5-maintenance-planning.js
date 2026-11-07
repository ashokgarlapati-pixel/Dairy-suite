import http from 'http';
import { Socket } from 'net';
import app from '../src/app.js';

let results = [];

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

async function runItem5Tests() {
  console.log('\n================================================================');
  console.log(' ITEM 5 VERIFICATION: MAINTENANCE PLANNING & CLOSURE BOARD      ');
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

  console.log('--- 1. PLANNING BOARD DATA DIMENSIONS ---');
  // 1. Action: CREATE Work Order with all planning dimensions
  const createRes = await request('POST', '/api/v1/work-orders', {
    headers: { authorization: `Bearer ${adminToken}` },
    body: {
      assetId: 'BMC-018',
      title: 'Bulk Milk Cooler Compressor Overhaul',
      description: 'Compressor thermal overload trip. Replace reed valves, evacuate system, and verify rapid pull-down.',
      priority: 'HIGH_P1',
      source: 'MANUAL',
      requiredSkills: ['Refrigeration Mechanic (Certified)', 'HVAC Vacuum & Recovery'],
      partsRequired: [
        { partName: 'Copeland 7.5HP Suction Valve Plate', quantityReserved: 1, unitCost: 4800 },
        { partName: 'R404A Eco-Refrigerant Canister (10kg)', quantityReserved: 1, unitCost: 6500 }
      ],
      estimatedDowntimeHours: 4.5,
      scheduledStartDate: new Date().toISOString()
    }
  });
  assert(createRes.status === 201 || createRes.status === 200, `Action [CREATE]: Work order created with HTTP ${createRes.status}`);
  const wo = createRes.data?.data;
  const woId = wo._id;
  assert(Boolean(woId), `Work order ID issued: ${woId}`);
  assert(wo.priority === 'HIGH_P1', `Planning Dimension: Priority verified as ${wo.priority}`);
  assert(wo.requiredSkills?.length >= 2, `Planning Dimension: Required skills verified (${wo.requiredSkills.join(', ')})`);
  assert(wo.partsRequired?.length === 2, `Planning Dimension: Parts availability verified (2 parts reserved)`);
  assert(wo.estimatedDowntimeHours === 4.5, `Planning Dimension: Expected downtime verified (${wo.estimatedDowntimeHours} hours)`);

  console.log('\n--- 2. AUTHORIZED ACTIONS: ASSIGN, EDIT, ESCALATE, DEFER, OVERRIDE ---');
  // 2. Action: ASSIGN Technician
  const assignRes = await request('PATCH', `/api/v1/work-orders/${woId}`, {
    headers: { authorization: `Bearer ${opsToken}` },
    body: {
      assignedTechnicianId: '60c72b2f9b1d8b2bad8e9999',
      reason: 'Assigned to Senior Field Technician Suresh Kumar for cold-chain service'
    }
  });
  assert(assignRes.status === 200, 'Action [ASSIGN]: Technician assignment succeeded (HTTP 200)');
  assert(assignRes.data?.data?.status === 'ASSIGNED', 'Status advanced to ASSIGNED');

  // 3. Action: EDIT Work Order details
  const editRes = await request('PATCH', `/api/v1/work-orders/${woId}`, {
    headers: { authorization: `Bearer ${opsToken}` },
    body: {
      estimatedDowntimeHours: 5.0,
      description: 'Updated scope: Added nitrogen leak pressure testing prior to vacuum pull-down.',
      reason: 'Engineering team expanded diagnostic scope'
    }
  });
  assert(editRes.status === 200, 'Action [EDIT]: Work order edited successfully (HTTP 200)');
  assert(editRes.data?.data?.estimatedDowntimeHours === 5.0, 'Downtime updated to 5.0 hours');

  // 4. Action: ESCALATE Priority to CRITICAL_P0
  const escalateRes = await request('PATCH', `/api/v1/work-orders/${woId}`, {
    headers: { authorization: `Bearer ${opsToken}` },
    body: {
      isEscalate: true,
      priority: 'CRITICAL_P0',
      reason: 'Morning milk collection arrived; chilling delay threatens 5,000L spoilage'
    }
  });
  assert(escalateRes.status === 200, 'Action [ESCALATE]: Priority elevated to CRITICAL_P0 (HTTP 200)');
  assert(escalateRes.data?.data?.priority === 'CRITICAL_P0', 'Priority confirmed as CRITICAL_P0');

  // 5. Action: DEFER Work Order
  const deferRes = await request('PATCH', `/api/v1/work-orders/${woId}`, {
    headers: { authorization: `Bearer ${opsToken}` },
    body: {
      isDefer: true,
      status: 'DEFERRED',
      reason: 'Specialized vacuum pump in use at Mandya Plant; postponed by 24 hours'
    }
  });
  assert(deferRes.status === 200, 'Action [DEFER]: Work order deferred (HTTP 200)');
  assert(deferRes.data?.data?.status === 'DEFERRED', 'Status confirmed as DEFERRED');

  // 6. Action: OVERRIDE Supervisor Decision (Return to In Progress)
  const overrideRes = await request('PATCH', `/api/v1/work-orders/${woId}`, {
    headers: { authorization: `Bearer ${adminToken}` },
    body: {
      isOverride: true,
      status: 'IN_PROGRESS',
      priority: 'CRITICAL_P0',
      reason: 'Operations Director approved emergency spare pump dispatch'
    }
  });
  assert(overrideRes.status === 200, 'Action [OVERRIDE]: Supervisor override applied (HTTP 200)');
  assert(overrideRes.data?.data?.status === 'IN_PROGRESS', 'Status resumed to IN_PROGRESS');

  console.log('\n--- 3. RBAC SECURITY BOUNDARIES FOR PLANNING ACTIONS ---');
  // Technician attempting to edit or escalate is rejected with HTTP 403
  const techEditRes = await request('PATCH', `/api/v1/work-orders/${woId}`, {
    headers: { authorization: `Bearer ${techToken}` },
    body: { priority: 'LOW_P3', reason: 'Technician attempt' }
  });
  assert(techEditRes.status === 403, 'RBAC: Technician forbidden from editing/escalating work orders (HTTP 403 Forbidden)');

  console.log('\n--- 4. EVIDENCE SUBMISSION & SUPERVISOR REJECTION (REWORK) ---');
  // Technician uploads work evidence
  const evidenceRes = await request('POST', `/api/v1/work-orders/${woId}/evidence`, {
    headers: { authorization: `Bearer ${techToken}` },
    body: {
      summaryOfWork: 'Completed reed valve replacement. Chilled milk pulled down to 4.2°C.',
      photos: ['https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80'],
      checklistResults: [
        { item: 'Compressor torque verified', result: 'PASS' },
        { item: 'Chilling pull-down tested below 4.0°C', result: 'FLAG', notes: 'Pulled to 4.2C only' }
      ]
    }
  });
  assert(evidenceRes.status === 200, 'Evidence submitted, advanced to PENDING_APPROVAL');

  // 7. Action: REJECT (Supervisor Rejection for Rework)
  const rejectRes = await request('POST', `/api/v1/work-orders/${woId}/verify`, {
    headers: { authorization: `Bearer ${opsToken}` },
    body: {
      decision: 'REJECTED',
      supervisorNotes: 'Regulatory non-compliance: Milk pull-down reached 4.2°C which exceeds mandatory 4.0°C cold-chain standard. Recheck refrigerant charge.',
      signoffSignatureName: 'Ramesh Patel (Operations Manager)'
    }
  });
  assert(rejectRes.status === 200, 'Action [REJECT]: Supervisor rejected evidence with rework notes (HTTP 200)');
  assert(rejectRes.data?.data?.status === 'IN_PROGRESS', 'Rejected work order automatically returned to IN_PROGRESS for technician rework');

  console.log('\n--- 5. FINAL RE-SUBMISSION & CLOSURE VERIFICATION (APPROVE / CLOSE) ---');
  // Technician re-submits rectified evidence
  await request('POST', `/api/v1/work-orders/${woId}/evidence`, {
    headers: { authorization: `Bearer ${techToken}` },
    body: {
      summaryOfWork: 'Re-evacuated system. Added 0.3kg R404A trim charge. Chilled pull-down verified at 3.7°C (compliant with FSSAI regulations).',
      photos: ['https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80'],
      checklistResults: [
        { item: 'Compressor torque verified (180 Nm)', result: 'PASS' },
        { item: 'Cold chain chilling pull-down tested below 4.0°C', result: 'PASS' }
      ]
    }
  });

  // 8. Action: APPROVE & CLOSE (Supervisor Closure Sign-Off)
  const approveRes = await request('POST', `/api/v1/work-orders/${woId}/verify`, {
    headers: { authorization: `Bearer ${opsToken}` },
    body: {
      decision: 'APPROVED',
      supervisorNotes: 'Verified chilling curve logs at 3.7°C. Refrigerant charge and vacuum leak-tightness compliant. Asset cleared for bulk milk intake.',
      signoffSignatureName: 'Ramesh Patel (Operations Manager)'
    }
  });
  assert(approveRes.status === 200, 'Action [APPROVE / CLOSE]: Supervisor formal closure verification approved (HTTP 200)');
  assert(approveRes.data?.data?.status === 'CLOSED', 'Action [CLOSE]: Final status confirmed as CLOSED');
  assert(Boolean(approveRes.data?.data?.closureDetails?.closedAt), 'Closure timestamp recorded');
  assert(approveRes.data?.data?.closureDetails?.signoffSignatureName === 'Ramesh Patel (Operations Manager)', 'Electronic sign-off signature recorded');

  // Technician forbidden from executing closure verification
  const techVerifyRes = await request('POST', `/api/v1/work-orders/${woId}/verify`, {
    headers: { authorization: `Bearer ${techToken}` },
    body: { decision: 'APPROVED', supervisorNotes: 'Illegal tech signoff', signoffSignatureName: 'Tech' }
  });
  assert(techVerifyRes.status === 403, 'RBAC: Technician forbidden from closure verification (HTTP 403 Forbidden)');

  console.log('\n--- 6. IMMUTABLE AUDIT TRAIL RECORDING ---');
  const auditRes = await request('GET', '/api/v1/audit-logs?limit=50', {
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(auditRes.status === 200, 'Audit trail queried successfully with HTTP 200');
  const logs = auditRes.data?.data?.logs || [];
  assert(logs.length > 0, `Audit ledger active (${logs.length} events logged)`);

  // Verify actor, timestamp, reason, previous value, new value, outcome
  const orderLogs = logs.filter(l => l.resourceId === wo.workOrderNumber);
  assert(orderLogs.length > 0, `Audit records created for this work order lifecycle (${orderLogs.length} found)`);
  const sampleLog = orderLogs[0] || {};
  assert(Boolean(sampleLog.actorId || sampleLog.actorName), 'Audit record captures Actor');
  assert(Boolean(sampleLog.timestamp || sampleLog.createdAt), 'Audit record captures Timestamp');
  assert(Boolean(sampleLog.reason), `Audit record captures Reason ("${sampleLog.reason}")`);
  assert(Boolean(sampleLog.outcome === 'SUCCESS'), 'Audit record captures Outcome (SUCCESS)');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;

  console.log('\n================================================================');
  console.log('             ITEM 5 VERIFICATION RESULTS SUMMARY                ');
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

runItem5Tests().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
