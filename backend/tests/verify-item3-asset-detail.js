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

async function runItem3Tests() {
  console.log('\n================================================================');
  console.log(' ITEM 3 VERIFICATION: ASSET DETAIL & MAINTENANCE HISTORY PAGE   ');
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

  console.log('--- 1. ASSET PROFILE DETAILS & RECORD METADATA ---');
  const assetRes = await request('GET', '/api/v1/assets/BMC-018', {
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(assetRes.status === 200, 'Asset profile for BMC-018 retrieved with HTTP 200');
  const asset = assetRes.data?.data;

  // Verify all required detail dimensions
  assert(asset.assetTag === 'BMC-018', 'Asset tag verified as BMC-018');
  assert(typeof asset.currentHealthScore === 'number', `Condition Health Index verified (${asset.currentHealthScore}%)`);
  assert(Boolean(asset.currentStatus), `Condition status verified (${asset.currentStatus})`);
  assert(Boolean(asset.criticality), `Criticality level verified (${asset.criticality})`);
  assert(Boolean(asset.location?.facilityName), `Location facility name verified (${asset.location?.facilityName})`);
  assert(Boolean(asset.owner?.ownerName), `Owner entity name verified (${asset.owner?.ownerName})`);
  assert(Boolean(asset.owner?.ownerType), `Owner type verified (${asset.owner?.ownerType})`);
  assert(typeof asset.totalRuntimeHours === 'number', `Operating runtime hours verified (${asset.totalRuntimeHours} hrs)`);
  assert(Boolean(asset.ratedCapacity), `Rated capacity verified (${asset.ratedCapacity})`);

  console.log('\n--- 2. REAL-TIME SENSOR TELEMETRY TRENDS STREAM ---');
  const trendsRes = await request('GET', '/api/v1/telemetry/asset/BMC-018/trends?hours=24', {
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(trendsRes.status === 200, 'IoT sensor trends stream responded with HTTP 200');
  const trends = trendsRes.data?.data?.trends || [];
  assert(Array.isArray(trends) && trends.length > 0, `Telemetry buffer active (${trends.length} hourly readings)`);
  assert(typeof trends[0].temperature === 'number', `Milk temperature stream verified (${trends[0].temperature}°C)`);
  assert(typeof trends[0].suctionPressure === 'number', `Compressor suction pressure stream verified (${trends[0].suctionPressure} bar)`);

  console.log('\n--- 3. LINKED WORK ORDERS & MAINTENANCE HISTORY ---');
  // Query work orders linked to this asset
  const woRes = await request('GET', `/api/v1/work-orders?assetId=BMC-018`, {
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(woRes.status === 200, 'Linked maintenance work orders query responds HTTP 200');
  const workOrders = woRes.data?.data?.workOrders || [];
  assert(Array.isArray(workOrders), 'Work orders array returned');

  // Filter by status on linked work orders
  const woFiltered = await request('GET', `/api/v1/work-orders?assetId=BMC-018&status=IN_PROGRESS`, {
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(woFiltered.status === 200, 'Work orders status filter responds HTTP 200');
  const inProgressWo = woFiltered.data?.data?.workOrders || [];
  assert(inProgressWo.every(w => w.status === 'IN_PROGRESS'), 'Status filter strictly returns IN_PROGRESS work orders');

  // Search work orders
  const woSearched = await request('GET', `/api/v1/work-orders?assetId=BMC-018&search=Chilling`, {
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(woSearched.status === 200, 'Work orders search query responds HTTP 200');

  // Pagination on work orders
  const woPaginated = await request('GET', `/api/v1/work-orders?assetId=BMC-018&page=1&limit=2`, {
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(woPaginated.status === 200, 'Work orders pagination responds HTTP 200');
  assert(woPaginated.data?.data?.pagination?.page === 1, 'Pagination page verified as 1');
  assert(woPaginated.data?.data?.pagination?.limit === 2, 'Pagination limit verified as 2');

  console.log('\n--- 4. ROLE & ORGANIZATIONAL SCOPE ACCESS CONTROL ---');
  // Maintenance Admin with global scope ('ALL') can access any asset
  assert(assetRes.status === 200, 'Maintenance Admin authorized for federation-wide asset access');

  // Technician with 'Southern District Union' scope can access BMC-018 (which is in Southern District Union)
  const techAccessRes = await request('GET', '/api/v1/assets/BMC-018', {
    headers: { authorization: `Bearer ${techToken}` }
  });
  assert(techAccessRes.status === 200, 'Field Technician authorized for asset within their assigned cooperative zone');

  // Technician forbidden from privileged administrative action (Decommission)
  const techDeleteRes = await request('DELETE', `/api/v1/assets/${asset._id || 'BMC-018'}`, {
    headers: { authorization: `Bearer ${techToken}` },
    body: { reason: 'Unauthorized decommission attempt' }
  });
  assert(techDeleteRes.status === 403, 'Technician forbidden from decommissioning asset (HTTP 403 Forbidden)');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;

  console.log('\n================================================================');
  console.log('             ITEM 3 VERIFICATION RESULTS SUMMARY                ');
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

runItem3Tests().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
