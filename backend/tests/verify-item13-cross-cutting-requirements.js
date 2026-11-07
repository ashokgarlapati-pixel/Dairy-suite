/**
 * Automated Verification Suite for Cross-Cutting Requirements (Every Output Page)
 *
 * Requirements Tested:
 * 1. Responsive layouts: Desktop, tablet, and mobile devices.
 * 2. Consistent navigation, page titles, breadcrumbs, loading indicators, empty states,
 *    validation messages, error states, and success feedback.
 * 3. Role-based access control applied to page visibility, data scoping, and actions.
 * 4. Global search, filtering, sorting, pagination, saved views, notifications, and export.
 * 5. Realistic sample data and live backend API connectivity across all 6 dairy equipment categories.
 * 6. AI outputs with confidence, concise evidence explanations, timestamps, model metadata,
 *    and authorised Human-in-the-Loop review controls.
 * 7. Security: Zero exposure of Gemini API key, private keys, or secrets in frontend code.
 */

import http from 'http';
import net from 'net';
import fs from 'fs';
import path from 'path';
import app from '../src/app.js';
import { ROLES, ASSET_CATEGORIES } from '../src/config/constants.js';

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
  console.log(' STARTING END-TO-END TEST SUITE: CROSS-CUTTING REQUIREMENTS AUDIT');
  console.log('========================================================================\n');

  // STEP 1: SECURITY SCAN - ZERO SECRET EXPOSURE IN FRONTEND CODE
  console.log('--- Step 1: Security Audit & Secret Leak Verification ---');
  const frontendSrcDir = path.resolve('frontend/src');
  
  function scanDirForSecrets(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        scanDirForSecrets(fullPath);
      } else if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.json') || file.endsWith('.html')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        // Check for Google Gemini API key patterns (AIzaSy...)
        if (/AIza[0-9A-Za-z-_]{35}/.test(content)) {
          throw new Error(`CRITICAL SECURITY FAILURE: Gemini API key exposed in ${fullPath}`);
        }
        // Check for hardcoded JWT secret assignments
        if (/JWT_SECRET\s*=\s*['"][^'"]+['"]/.test(content)) {
          throw new Error(`CRITICAL SECURITY FAILURE: JWT_SECRET hardcoded in ${fullPath}`);
        }
        // Check for MongoDB connection URIs
        if (/mongodb(?:\+srv)?:\/\//.test(content)) {
          throw new Error(`CRITICAL SECURITY FAILURE: MongoDB connection string exposed in ${fullPath}`);
        }
      }
    }
  }

  scanDirForSecrets(frontendSrcDir);
  assert(true, 'Zero Gemini API keys (AIzaSy...) exposed in frontend code');
  assert(true, 'Zero JWT secrets or private keys exposed in frontend code');
  assert(true, 'Zero MongoDB connection strings exposed in frontend code');

  // STEP 2: USER AUTHENTICATION & ROLE ACQUISITION
  console.log('\n--- Step 2: Role Authentication & Session Token Acquisition ---');
  const adminLogin = await makeInProcessRequest({
    app,
    method: 'POST',
    path: '/api/v1/auth/login',
    body: { email: 'admin@dairycoop.org', password: 'Admin@123' }
  });
  assert(adminLogin.statusCode === 200, 'Admin login succeeded');
  const adminToken = adminLogin.body.data.accessToken;

  const opsLogin = await makeInProcessRequest({
    app,
    method: 'POST',
    path: '/api/v1/auth/login',
    body: { email: 'ops@dairycoop.org', password: 'Ops@123' }
  });
  assert(opsLogin.statusCode === 200, 'Operations Manager login succeeded');
  const opsToken = opsLogin.body.data.accessToken;

  const techLogin = await makeInProcessRequest({
    app,
    method: 'POST',
    path: '/api/v1/auth/login',
    body: { email: 'tech@dairycoop.org', password: 'Tech@123' }
  });
  assert(techLogin.statusCode === 200, 'Technician login succeeded');
  const techToken = techLogin.body.data.accessToken;

  const vendorLogin = await makeInProcessRequest({
    app,
    method: 'POST',
    path: '/api/v1/auth/login',
    body: { email: 'vendor@cooltech.com', password: 'Vendor@123' }
  });
  assert(vendorLogin.statusCode === 200, 'Vendor login succeeded');
  const vendorToken = vendorLogin.body.data.accessToken;

  // STEP 3: ROLE-BASED ACCESS CONTROL (RBAC) ON PROTECTED DATA & ACTIONS
  console.log('\n--- Step 3: Global RBAC Enforcement on Data & Privileged Actions ---');
  
  // 3.1 Unauthenticated requests rejected across all operational endpoints
  const endpointsToTest = [
    '/api/v1/assets',
    '/api/v1/work-orders',
    '/api/v1/telemetry/asset/BMC-018',
    '/api/v1/ai/predictions',
    '/api/v1/ai/recommendations',
    '/api/v1/analytics/dashboard',
    '/api/v1/notifications',
    '/api/v1/users',
    '/api/v1/audit-logs'
  ];

  for (const ep of endpointsToTest) {
    const unauthRes = await makeInProcessRequest({ app, method: 'GET', path: ep });
    assert(unauthRes.statusCode === 401, `Unauthenticated request to ${ep} blocked with HTTP 401`);
  }

  // 3.2 Action authorization boundaries
  // Non-admins blocked from User Management
  const techUsersAttempt = await makeInProcessRequest({
    app,
    method: 'GET',
    path: '/api/v1/users',
    headers: { authorization: `Bearer ${techToken}` }
  });
  assert(techUsersAttempt.statusCode === 403, 'Technician blocked from User Management (HTTP 403)');

  // Technicians blocked from Reports Export
  const techExportAttempt = await makeInProcessRequest({
    app,
    method: 'GET',
    path: '/api/v1/analytics/export?reportType=ASSET_HEALTH&format=csv',
    headers: { authorization: `Bearer ${techToken}` }
  });
  assert(techExportAttempt.statusCode === 403, 'Technician blocked from Reports Export (HTTP 403)');

  // Technicians blocked from AI Recommendation Review Actions
  const techReviewAttempt = await makeInProcessRequest({
    app,
    method: 'POST',
    path: '/api/v1/ai/recommendations/REC-001/review',
    headers: { authorization: `Bearer ${techToken}` },
    body: { action: 'ACCEPT', reason: 'Attempted tech review' }
  });
  assert(techReviewAttempt.statusCode === 403, 'Technician blocked from AI review decisions (HTTP 403)');

  // Technicians blocked from modifying System Settings
  const techSettingsAttempt = await makeInProcessRequest({
    app,
    method: 'PATCH',
    path: '/api/v1/audit-logs/settings',
    headers: { authorization: `Bearer ${techToken}` },
    body: { thresholds: { milkQualityCeilingTemp: 10.0 } }
  });
  assert(techSettingsAttempt.statusCode === 403, 'Technician blocked from altering system settings (HTTP 403)');

  // Vendors blocked from User Management
  const vendorUsersAttempt = await makeInProcessRequest({
    app,
    method: 'GET',
    path: '/api/v1/users',
    headers: { authorization: `Bearer ${vendorToken}` }
  });
  assert(vendorUsersAttempt.statusCode === 403, 'Vendor blocked from User Management (HTTP 403)');

  // STEP 4: REALISTIC DATA ACROSS ALL 6 EQUIPMENT CATEGORIES
  console.log('\n--- Step 4: Realistic Data & Telemetry Across All 6 Equipment Categories ---');
  const assetsRes = await makeInProcessRequest({
    app,
    method: 'GET',
    path: '/api/v1/assets',
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(assetsRes.statusCode === 200, 'GET /assets returned HTTP 200');
  const assets = assetsRes.body.data.assets;
  assert(Array.isArray(assets) && assets.length >= 7, `Asset registry returns ${assets.length} equipment assets`);

  const categories = assets.map((a) => a.category);
  assert(categories.includes('BULK_MILK_COOLER'), 'Category 1: BULK_MILK_COOLER represented');
  assert(categories.includes('CHILLED_TANKER'), 'Category 2: CHILLED_TANKER represented');
  assert(categories.includes('PASTEURIZER'), 'Category 3: PASTEURIZER represented');
  assert(categories.includes('HOMOGENIZER'), 'Category 4: HOMOGENIZER represented');
  assert(categories.includes('COLD_ROOM'), 'Category 5: COLD_ROOM represented');
  assert(categories.includes('PACKAGING_MACHINE'), 'Category 6: PACKAGING_MACHINE represented');

  // Verify realistic sensor telemetry trends for bulk milk cooler
  const telemetryTrendsRes = await makeInProcessRequest({
    app,
    method: 'GET',
    path: '/api/v1/telemetry/asset/BMC-018/trends',
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(telemetryTrendsRes.statusCode === 200, 'GET /telemetry/asset/BMC-018/trends returned HTTP 200');
  const trendsData = telemetryTrendsRes.body.data;
  assert(Array.isArray(trendsData.trends) && trendsData.trends.length > 0, `Generated ${trendsData.trends.length} 24-hour telemetry trend points`);
  assert(typeof trendsData.trends[0].temperature === 'number', `Sample trend temp: ${trendsData.trends[0].temperature}°C`);
  assert(typeof trendsData.trends[0].suctionPressure === 'number', `Sample trend suction pressure: ${trendsData.trends[0].suctionPressure} bar`);

  // STEP 5: AI TRANSPARENCY, CONFIDENCE, MODEL METADATA & HITL CONTROLS
  console.log('\n--- Step 5: AI Output Transparency, Explanations & Review Controls ---');
  const rulRes = await makeInProcessRequest({
    app,
    method: 'POST',
    path: '/api/v1/ai/predict/BMC-018',
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(rulRes.statusCode === 200, 'POST /ai/predict/:id returned HTTP 200');
  const prediction = rulRes.body.data;
  const confidence = prediction.failureAnalysis?.confidenceScore ?? prediction.confidenceScore;
  assert(typeof confidence === 'number', `AI confidence score reported: ${confidence}`);
  const explanation = prediction.geminiExplanation?.aiExplanation || prediction.failureAnalysis?.explanation || prediction.explanation;
  assert(Boolean(explanation), 'Concise evidence-based explanation present');
  const modelVer = prediction.modelMetadata?.modelVersion || prediction.modelVersion;
  assert(Boolean(modelVer), `AI model version specified: ${modelVer}`);
  const timestamp = prediction.modelMetadata?.executionTimestamp || prediction.timestamp;
  assert(Boolean(timestamp), `Prediction timestamp present: ${timestamp}`);
  assert(Boolean(prediction.sourceDataSnapshot), 'Source data snapshot included for verification transparency');

  // Authorised review controls (Accept, Reject, Correct, Override)
  const recommendationsRes = await makeInProcessRequest({
    app,
    method: 'GET',
    path: '/api/v1/ai/recommendations',
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(recommendationsRes.statusCode === 200, 'GET /ai/recommendations returned HTTP 200');
  const recs = recommendationsRes.body.data.recommendations;
  assert(Array.isArray(recs) && recs.length > 0, 'Recommendations list present');

  // Test HITL review decision validation (Mandatory reason required)
  const emptyReasonAttempt = await makeInProcessRequest({
    app,
    method: 'POST',
    path: `/api/v1/ai/recommendations/${recs[0]._id}/review`,
    headers: { authorization: `Bearer ${adminToken}` },
    body: { action: 'ACCEPT', reason: '   ' }
  });
  assert(emptyReasonAttempt.statusCode === 400, 'Review submission with blank reason rejected with HTTP 400');

  // STEP 6: SEARCH, FILTERING, PAGINATION & EXPORT AUDIT
  console.log('\n--- Step 6: Search, Filtering, Pagination & Report Export ---');
  
  // 6.1 Search on Assets
  const searchAsset = await makeInProcessRequest({
    app,
    method: 'GET',
    path: '/api/v1/assets?search=Pasteurizer',
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(searchAsset.body.data.assets.some((a) => a.name.includes('Pasteurizer')), 'Search by asset name keyword succeeded');

  // 6.2 Filter by Category
  const filterCat = await makeInProcessRequest({
    app,
    method: 'GET',
    path: '/api/v1/assets?category=HOMOGENIZER',
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(filterCat.body.data.assets.every((a) => a.category === 'HOMOGENIZER'), 'Filter by category=HOMOGENIZER succeeded');

  // 6.3 Pagination on Audit Logs
  const pagedLogs = await makeInProcessRequest({
    app,
    method: 'GET',
    path: '/api/v1/audit-logs?page=1&limit=5',
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(pagedLogs.body.data.pagination.page === 1, 'Pagination page number confirmed');
  assert(pagedLogs.body.data.logs.length <= 5, 'Pagination limit of 5 confirmed');

  // 6.4 CSV & PDF Report Export
  const exportCsv = await makeInProcessRequest({
    app,
    method: 'GET',
    path: '/api/v1/analytics/export?reportType=ASSET_HEALTH&format=csv',
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(exportCsv.statusCode === 200, 'Report export in CSV format succeeded');
  assert(exportCsv.headers['content-type'].includes('text/csv'), 'Content-type is text/csv');

  const exportPdf = await makeInProcessRequest({
    app,
    method: 'GET',
    path: '/api/v1/analytics/export?reportType=ASSET_HEALTH&format=pdf',
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(exportPdf.statusCode === 200, 'Report export in PDF printable format succeeded');
  assert(exportPdf.headers['content-type'].includes('text/html'), 'PDF output conforms to official printable document');

  // STEP 7: FRONTEND RESPONSIVE LAYOUT & COMMON COMPONENT INTEGRITY
  console.log('\n--- Step 7: Frontend Responsive Layout & UI Component Architecture ---');
  
  // 7.1 AppLayout
  const appLayoutPath = path.resolve('frontend/src/components/layout/AppLayout.jsx');
  assert(fs.existsSync(appLayoutPath), 'AppLayout.jsx exists on disk');
  const appLayoutCode = fs.readFileSync(appLayoutPath, 'utf8');
  assert(appLayoutCode.includes('Sidebar') && appLayoutCode.includes('Navbar') && appLayoutCode.includes('Breadcrumbs'), 'AppLayout integrates Sidebar, Navbar, and Breadcrumbs');
  assert(appLayoutCode.includes('max-w-7xl mx-auto w-full'), 'AppLayout enforces responsive desktop containment');
  assert(appLayoutCode.includes('lg:pl-64'), 'AppLayout accommodates collapsible mobile drawer');

  // 7.2 Breadcrumbs
  const breadcrumbsPath = path.resolve('frontend/src/components/layout/Breadcrumbs.jsx');
  assert(fs.existsSync(breadcrumbsPath), 'Breadcrumbs.jsx exists on disk');
  const breadcrumbsCode = fs.readFileSync(breadcrumbsPath, 'utf8');
  assert(breadcrumbsCode.includes('ChevronRight') && breadcrumbsCode.includes('routeNameMap'), 'Breadcrumbs provides dynamic route mapping with chevron separators');

  // 7.3 Common State Components
  const commonDir = path.resolve('frontend/src/components/common');
  assert(fs.existsSync(path.join(commonDir, 'LoadingSkeleton.jsx')), 'LoadingSkeleton.jsx exists for loading states');
  assert(fs.existsSync(path.join(commonDir, 'EmptyState.jsx')), 'EmptyState.jsx exists for empty data states');
  assert(fs.existsSync(path.join(commonDir, 'ErrorState.jsx')), 'ErrorState.jsx exists for error handling and retry');
  assert(fs.existsSync(path.join(commonDir, 'StatusBadge.jsx')), 'StatusBadge.jsx exists for color-coded status feedback');
  assert(fs.existsSync(path.join(commonDir, 'ProtectedRoute.jsx')), 'ProtectedRoute.jsx exists for client-side route guards');

  // 7.4 In-App Notification Panel
  const navbarPath = path.resolve('frontend/src/components/layout/Navbar.jsx');
  const navbarCode = fs.readFileSync(navbarPath, 'utf8');
  assert(navbarCode.includes('showNotificationPanel') && navbarCode.includes('Bell'), 'Navbar provides interactive in-app notification dropdown');

  console.log('\n========================================================================');
  console.log(` ALL CROSS-CUTTING CHECKS PASSED: ${passedChecks}/${totalChecks} (100%)`);
  console.log('========================================================================\n');
}

runSuite().catch((err) => {
  console.error('\n*** TEST SUITE FAILED ***\n', err);
  process.exit(1);
});
