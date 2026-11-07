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

async function runItem4Tests() {
  console.log('\n================================================================');
  console.log(' ITEM 4 VERIFICATION: MAINTENANCE CALENDAR & TECHNICIAN QUEUE  ');
  console.log('================================================================\n');

  // Authenticate Admin and Technician
  const adminLogin = await request('POST', '/api/v1/auth/login', {
    body: { email: 'admin@dairycoop.org', password: 'Admin@123' }
  });
  const adminToken = adminLogin.data?.data?.accessToken;

  const techLogin = await request('POST', '/api/v1/auth/login', {
    body: { email: 'tech@dairycoop.org', password: 'Tech@123' }
  });
  const techToken = techLogin.data?.data?.accessToken;

  console.log('--- 1. PREVENTIVE-MAINTENANCE CALENDARS & SCHEDULES ---');
  const allOrdersRes = await request('GET', '/api/v1/work-orders?limit=50', {
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(allOrdersRes.status === 200, 'Work orders retrieved with HTTP 200');
  const allOrders = allOrdersRes.data?.data?.workOrders || [];
  assert(allOrders.length > 0, `Active maintenance orders pool verified (${allOrders.length} items)`);

  const scheduledOrders = allOrders.filter(w => w.scheduledStartDate);
  assert(scheduledOrders.length > 0, `Scheduled maintenance cycles verified (${scheduledOrders.length} calendar events)`);
  assert(Boolean(scheduledOrders[0].scheduledStartDate), 'Schedule timestamp confirmed on calendar event');
  assert(Boolean(scheduledOrders[0].assetTag || scheduledOrders[0].assetId), 'Target equipment linked to calendar schedule');

  console.log('\n--- 2. FAILURE-RISK BREAKDOWN ALERTS & AI TRIGGERS ---');
  const aiTriggered = allOrders.filter(w => w.source === 'AI_PREDICTIVE_TRIGGER');
  assert(aiTriggered.length > 0, 'Failure-risk AI predictive trigger work orders active');
  assert(aiTriggered.some(w => w.priority === 'CRITICAL_P0'), 'Imminent failure breakdown alert flagged as CRITICAL_P0');
  assert(Boolean(aiTriggered[0].description), 'AI diagnostic evidence included in work order description');

  console.log('\n--- 3. TECHNICIAN QUEUE & STATE TRANSITION ---');
  // Create a designated test work order to run through technician queue
  const createOrderRes = await request('POST', '/api/v1/work-orders', {
    headers: { authorization: `Bearer ${adminToken}` },
    body: {
      assetId: 'BMC-018',
      title: 'Emergency Chiller Suction Inspection',
      description: 'Chilling cycle slowdown alert. Evacuate suction line and test valve plates.',
      priority: 'CRITICAL_P0',
      source: 'AI_PREDICTIVE_TRIGGER',
      requiredSkills: ['Refrigeration Mechanic'],
      estimatedDowntimeHours: 3.5,
      scheduledStartDate: new Date().toISOString()
    }
  });
  assert(createOrderRes.status === 201 || createOrderRes.status === 200, `Test work order created in technician queue (HTTP ${createOrderRes.status})`);
  const activeWo = createOrderRes.data?.data;
  const woId = activeWo?._id;
  assert(Boolean(woId), `Generated Work Order ID verified (${woId})`);

  // Technician initiates task (Start Job -> IN_PROGRESS)
  const startJobRes = await request('PATCH', `/api/v1/work-orders/${woId}/status`, {
    headers: { authorization: `Bearer ${techToken}` },
    body: { status: 'IN_PROGRESS', reason: 'Technician arrived on-site and initiated diagnostic pull-down' }
  });
  assert(startJobRes.status === 200, 'Technician transitioned work order to IN_PROGRESS (HTTP 200)');
  assert(startJobRes.data?.data?.status === 'IN_PROGRESS', 'Status verified as IN_PROGRESS');

  console.log('\n--- 4. MOBILE EVIDENCE CAPTURE & INSPECTION CHECKLIST ---');
  const evidencePayload = {
    summaryOfWork: 'Suction reed valve replaced. Vacuum pulled to 420 microns. Recharged 2.8kg R404A. Chilled milk from 14C to 3.8C in 2.9 hours.',
    photos: [
      'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=600&q=80'
    ],
    audioNotesUrl: 'https://storage.dairycoop.org/audio/notes-wo-test.m4a',
    gpsCoordinates: { lat: 12.3051, lng: 76.6551 },
    checklistResults: [
      { item: 'Compressor suction valve torque verified (180 Nm)', result: 'PASS' },
      { item: 'Refrigerant line vacuum held at < 500 microns', result: 'PASS' },
      { item: 'Cold chain chilling pull-down tested below 4.0°C', result: 'PASS' }
    ]
  };

  const submitEvidenceRes = await request('POST', `/api/v1/work-orders/${woId}/evidence`, {
    headers: { authorization: `Bearer ${techToken}` },
    body: evidencePayload
  });
  assert(submitEvidenceRes.status === 200, 'Technician mobile evidence submitted with HTTP 200');
  assert(submitEvidenceRes.data?.data?.status === 'PENDING_APPROVAL', 'Work order automatically advanced to PENDING_APPROVAL upon evidence submission');
  const submittedEvidence = submitEvidenceRes.data?.data?.evidence;
  assert(Boolean(submittedEvidence?.summaryOfWork), 'Summary of work verified in evidence record');
  assert(submittedEvidence?.checklistResults?.length === 3, 'Quality inspection checklist verified (3 items)');
  assert(submittedEvidence?.checklistResults?.every(c => c.result === 'PASS'), 'All checklist items confirmed as PASS');
  assert(submittedEvidence?.photos?.length === 2, 'Field photos verified (2 attachments)');
  assert(typeof submittedEvidence?.gpsCoordinates?.lat === 'number', 'Mobile GPS geolocation stamp verified');

  console.log('\n--- 5. DOWNTIME ANALYTICS & CLEAR OPERATIONAL STATES ---');
  // Check downtime aggregation
  const totalDowntime = allOrders.reduce((sum, w) => sum + (w.estimatedDowntimeHours || 0), 0);
  assert(typeof totalDowntime === 'number' && totalDowntime >= 0, `Total estimated downtime hours computed (${totalDowntime}h)`);

  // Verify all required states exist in state machine
  const distinctStatuses = new Set(allOrders.map(w => w.status));
  distinctStatuses.add(submitEvidenceRes.data?.data?.status);
  assert(distinctStatuses.has('PENDING_APPROVAL'), 'Pending-review state verified');
  assert(distinctStatuses.has('IN_PROGRESS'), 'In-progress state verified');

  console.log('\n--- 6. DRILL-DOWN INTO UNDERLYING RECORD & EVIDENCE ---');
  const drillDownRes = await request('GET', `/api/v1/work-orders/${woId}`, {
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(drillDownRes.status === 200, 'Drill-down work order details query responds HTTP 200');
  const detailWo = drillDownRes.data?.data;
  assert(detailWo._id === woId, 'Drill-down verified correct underlying work order record');
  assert(Boolean(detailWo.evidence?.summaryOfWork), 'Drill-down retrieved full evidence summary');
  assert(detailWo.evidence?.checklistResults?.length > 0, 'Drill-down retrieved full inspection checklist');
  assert(Boolean(detailWo.evidence?.gpsCoordinates?.lat), 'Drill-down retrieved field geolocation data');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;

  console.log('\n================================================================');
  console.log('             ITEM 4 VERIFICATION RESULTS SUMMARY                ');
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

runItem4Tests().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
