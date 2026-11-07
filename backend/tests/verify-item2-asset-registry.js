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

async function runItem2Tests() {
  console.log('\n================================================================');
  console.log(' ITEM 2 VERIFICATION: ASSET REGISTRY & HEALTH DASHBOARD PAGE    ');
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

  console.log('--- 1. SIX MANDATORY DAIRY ASSET CATEGORIES VERIFICATION ---');
  const allAssetsRes = await request('GET', '/api/v1/assets?limit=50', {
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(allAssetsRes.status === 200, `Retrieved asset registry with HTTP 200`);
  const assets = allAssetsRes.data?.data?.assets || [];
  assert(assets.length > 0, `Pre-seeded equipment pool active (${assets.length} items found)`);

  const categories = new Set(assets.map(a => a.category));
  assert(categories.has('BULK_MILK_COOLER'), 'Category 1: Bulk Milk Coolers (BMCs) present');
  assert(categories.has('CHILLED_TANKER'), 'Category 2: Insulated Chilled Milk Tankers present');
  assert(categories.has('PASTEURIZER'), 'Category 3: High-Temperature Pasteurizers present');
  assert(categories.has('HOMOGENIZER'), 'Category 4: Processing Lines / Homogenizers present');
  assert(categories.has('COLD_ROOM'), 'Category 5: Cold Storage Rooms present');
  assert(categories.has('PACKAGING_MACHINE'), 'Category 6: Form-Fill-Seal Packaging Equipment present');

  console.log('\n--- 2. DASHBOARD KPI INDICATORS & FLEET HEALTH METRICS ---');
  const statsRes = await request('GET', '/api/v1/assets/stats', {
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(statsRes.status === 200, 'Fleet Health KPI statistics responded with HTTP 200');
  const stats = statsRes.data?.data;
  assert(typeof stats.totalAssets === 'number' && stats.totalAssets > 0, `Total Assets indicator tracked (${stats.totalAssets})`);
  assert(typeof stats.avgHealthScore === 'number' && stats.avgHealthScore >= 0 && stats.avgHealthScore <= 100, `Fleet Health Index calculated (${stats.avgHealthScore}%)`);
  assert(typeof stats.operationalCount === 'number', `Operational equipment count tracked (${stats.operationalCount})`);
  assert(typeof stats.warningCount === 'number', `Warning condition count tracked (${stats.warningCount})`);
  assert(typeof stats.criticalFaultCount === 'number', `Critical Fault (P0) exception count tracked (${stats.criticalFaultCount})`);
  assert(typeof stats.highRiskCount === 'number', `Imminent failure breakdown hazard count tracked (${stats.highRiskCount})`);

  console.log('\n--- 3. ADVANCED BUSINESS FILTERS ---');
  // Category filter
  const bmcFilter = await request('GET', '/api/v1/assets?category=BULK_MILK_COOLER', {
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(bmcFilter.status === 200, 'Category filter responds HTTP 200');
  const bmcItems = bmcFilter.data?.data?.assets || [];
  assert(bmcItems.length > 0 && bmcItems.every(a => a.category === 'BULK_MILK_COOLER'), 'Category filter strictly restricts items to BULK_MILK_COOLER');

  // Status filter
  const statusFilter = await request('GET', '/api/v1/assets?currentStatus=OPERATIONAL', {
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(statusFilter.status === 200, 'Status filter responds HTTP 200');
  const opItems = statusFilter.data?.data?.assets || [];
  assert(opItems.length > 0 && opItems.every(a => a.currentStatus === 'OPERATIONAL'), 'Status filter strictly restricts items to OPERATIONAL');

  // Risk filter
  const riskFilter = await request('GET', '/api/v1/assets?failureRiskLevel=HIGH', {
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(riskFilter.status === 200, 'Failure Risk filter responds HTTP 200');
  const highRiskItems = riskFilter.data?.data?.assets || [];
  assert(highRiskItems.every(a => a.failureRiskLevel === 'HIGH'), 'Risk filter strictly restricts items to HIGH risk');

  // Location filter
  const locFilter = await request('GET', '/api/v1/assets?location=Mysore', {
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(locFilter.status === 200, 'Location filter responds HTTP 200');
  const locItems = locFilter.data?.data?.assets || [];
  assert(locItems.length > 0 && locItems.every(a => a.location?.facilityName?.toLowerCase().includes('mysore')), 'Location filter restricts items to Mysore facilities');

  // Owner filter
  const ownerFilter = await request('GET', '/api/v1/assets?ownerType=COOPERATIVE', {
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(ownerFilter.status === 200, 'Owner filter responds HTTP 200');
  const coopItems = ownerFilter.data?.data?.assets || [];
  assert(coopItems.length > 0 && coopItems.every(a => a.owner?.ownerType === 'COOPERATIVE'), 'Owner filter restricts items to COOPERATIVE owned assets');

  // Date filter
  const dateFilter = await request('GET', '/api/v1/assets?startDate=2020-01-01&endDate=2030-12-31', {
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(dateFilter.status === 200, 'Date range filter responds HTTP 200');

  // Search filter
  const searchFilter = await request('GET', '/api/v1/assets?search=BMC-018', {
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(searchFilter.status === 200, 'Search query responds HTTP 200');
  const searchItems = searchFilter.data?.data?.assets || [];
  assert(searchItems.some(a => a.assetTag.includes('BMC-018')), 'Search query successfully located asset BMC-018');

  console.log('\n--- 4. ROLE-AWARE ACCESS & PERMISSIONS ---');
  // Maintenance Admin can create asset
  const newAssetPayload = {
    assetTag: 'BMC-TEST-VERIFY',
    name: 'Verification Bulk Milk Cooler 5KL',
    category: 'BULK_MILK_COOLER',
    criticality: 'CRITICAL_P0',
    ratedCapacity: '5,000 Liters',
    location: {
      facilityName: 'Mandya Chilling Center',
      department: 'Intake Bay 1'
    },
    orgScope: {
      cooperativeZone: 'Southern District Union',
      plantId: 'Plant-Central (Mysore)'
    }
  };

  const createByAdmin = await request('POST', '/api/v1/assets', {
    headers: { authorization: `Bearer ${adminToken}` },
    body: newAssetPayload
  });
  assert(createByAdmin.status === 201 || createByAdmin.status === 200, `Maintenance Admin authorized to register equipment (HTTP ${createByAdmin.status})`);

  // Technician is forbidden from creating asset (Least Privilege)
  const createByTech = await request('POST', '/api/v1/assets', {
    headers: { authorization: `Bearer ${techToken}` },
    body: { ...newAssetPayload, assetTag: 'BMC-TECH-ILLEGAL' }
  });
  assert(createByTech.status === 403, `Technician forbidden from registering equipment (HTTP 403 Forbidden)`);

  console.log('\n--- 5. PAGINATION & SORTING ---');
  const page1 = await request('GET', '/api/v1/assets?page=1&limit=2', {
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(page1.status === 200, 'Pagination query responds HTTP 200');
  assert(page1.data?.data?.pagination?.page === 1, 'Pagination page number is 1');
  assert(page1.data?.data?.pagination?.limit === 2, 'Pagination limit is 2');
  assert(page1.data?.data?.assets?.length <= 2, 'Returned asset count respects page limit');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;

  console.log('\n================================================================');
  console.log('             ITEM 2 VERIFICATION RESULTS SUMMARY                ');
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

runItem2Tests().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
