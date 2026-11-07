/**
 * Automated Verification Suite for Item 9: Reports and Analytics Page
 *
 * Requirements Tested:
 * 1. Asset Health and Reliability Dashboard across all 6 dairy equipment categories:
 *    Bulk Milk Coolers, Tankers, Homogenizers/Processing Lines, Pasteurisers, Cold Rooms, Packaging Equipment.
 * 2. Multi-dimensional visual analysis:
 *    - Failure-risk, anomaly, and RUL estimates
 *    - Maintenance work orders & technician execution
 *    - Downtime & cold-chain availability (MTBF, MTTR)
 *    - Maintenance cost & avoided milk souring loss (ROI)
 * 3. Date ranges (Today, 7D, MTD, YTD, Custom) and comparison periods (MoM, QoQ, YoY).
 * 4. Business filters (Category, Criticality, Facility) and Drill-down record inspections.
 * 5. Saved report configurations (GET & POST presets with validation).
 * 6. Report generation status and history ledger retrieval.
 * 7. Authorized export in CSV and PDF formats (with printable dairy union letterhead).
 * 8. Strict RBAC enforcement (Admin/Ops permitted, Technician forbidden with 403).
 */

import http from 'http';
import net from 'net';
import fs from 'fs';
import path from 'path';
import app from '../src/app.js';
import { ROLES } from '../src/config/constants.js';

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
          // keep as string
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
  console.log(' STARTING END-TO-END TEST SUITE: ITEM 9 - REPORTS & ANALYTICS PAGE');
  console.log('========================================================================\n');

  // STEP 1: AUTHENTICATION FOR ALL ROLES
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
  assert(Boolean(adminToken), 'Admin JWT access token issued');

  // 1.2 Operations Manager
  const opsLogin = await makeInProcessRequest({
    app,
    method: 'POST',
    path: '/api/v1/auth/login',
    body: { email: 'ops@dairycoop.org', password: 'Ops@123' }
  });
  assert(opsLogin.statusCode === 200, 'Operations Manager login succeeded with HTTP 200');
  const opsToken = opsLogin.body.data.accessToken;
  assert(Boolean(opsToken), 'Operations Manager JWT access token issued');

  // 1.3 Field Technician
  const techLogin = await makeInProcessRequest({
    app,
    method: 'POST',
    path: '/api/v1/auth/login',
    body: { email: 'tech@dairycoop.org', password: 'Tech@123' }
  });
  assert(techLogin.statusCode === 200, 'Technician login succeeded with HTTP 200');
  const techToken = techLogin.body.data.accessToken;
  assert(Boolean(techToken), 'Technician JWT access token issued');

  // STEP 2: DASHBOARD ANALYTICS & FLEET METRICS
  console.log('\n--- Step 2: Dashboard Reliability Analytics & Financial ROI ---');
  const analyticsRes = await makeInProcessRequest({
    app,
    method: 'GET',
    path: '/api/v1/analytics/dashboard',
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(analyticsRes.statusCode === 200, 'GET /analytics/dashboard returned HTTP 200');
  const dashboard = analyticsRes.body.data;
  assert(Boolean(dashboard.fleetSummary), 'Fleet summary metrics object present');
  assert(typeof dashboard.fleetSummary.mtbfHours === 'number', `MTBF metric verified: ${dashboard.fleetSummary.mtbfHours} hrs`);
  assert(typeof dashboard.fleetSummary.mttrHours === 'number', `MTTR metric verified: ${dashboard.fleetSummary.mttrHours} hrs`);
  assert(typeof dashboard.fleetSummary.totalAssets === 'number', `Total assets monitored: ${dashboard.fleetSummary.totalAssets}`);
  assert(typeof dashboard.fleetSummary.avgHealth === 'number', `Fleet average health index: ${dashboard.fleetSummary.avgHealth}%`);

  // Financial ROI
  assert(Boolean(dashboard.financialROI), 'Financial ROI metrics object present');
  assert(typeof dashboard.financialROI.totalMaintenanceCostINR === 'number', `Maintenance spend: ₹${dashboard.financialROI.totalMaintenanceCostINR}`);
  assert(typeof dashboard.financialROI.avoidedMilkLossINR === 'number', `Avoided milk souring loss: ₹${dashboard.financialROI.avoidedMilkLossINR}`);
  assert(dashboard.financialROI.netReliabilitySavingsINR > 0, `Net reliability savings positive: ₹${dashboard.financialROI.netReliabilitySavingsINR}`);
  assert(Boolean(dashboard.financialROI.roiMultiplier), `ROI multiplier reported: ${dashboard.financialROI.roiMultiplier}`);

  // Equipment Category Downtime Distribution (All 6 Classes)
  assert(Array.isArray(dashboard.downtimeByCategory), 'Downtime by category array present');
  const categoryNames = dashboard.downtimeByCategory.map(c => c.category);
  assert(categoryNames.some(c => c.includes('Bulk Milk Coolers')), 'Bulk Milk Coolers category present in downtime distribution');
  assert(categoryNames.some(c => c.includes('Pasteurizers')), 'Plate Pasteurizers category present in downtime distribution');
  assert(categoryNames.some(c => c.includes('Tankers')), 'Chilled Tankers category present in downtime distribution');
  assert(categoryNames.some(c => c.includes('Homogenizers')), 'Homogenizers category present in downtime distribution');
  assert(categoryNames.some(c => c.includes('Cold Storage')), 'Cold Storage Rooms category present in downtime distribution');
  assert(categoryNames.some(c => c.includes('Packaging')), 'Packaging Machines category present in downtime distribution');

  // STEP 3: SAVED REPORT CONFIGURATIONS
  console.log('\n--- Step 3: Saved Report Configurations (Presets) ---');
  // 3.1 Fetch pre-seeded configs
  const getConfigsRes = await makeInProcessRequest({
    app,
    method: 'GET',
    path: '/api/v1/analytics/reports/saved-configurations',
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(getConfigsRes.statusCode === 200, 'GET /reports/saved-configurations returned HTTP 200');
  const configs = getConfigsRes.body.data.configurations;
  assert(Array.isArray(configs) && configs.length >= 3, `Pre-seeded configurations loaded: count = ${configs.length}`);
  assert(Boolean(configs[0].name && configs[0].reportType), 'Saved configuration structure valid with name & reportType');

  // 3.2 Save a new custom configuration
  const newConfigPayload = {
    name: 'Weekly Homogenizer & Tanker Preventive Audit',
    reportType: 'MAINTENANCE',
    period: '7D',
    category: 'HOMOGENIZER',
    criticality: 'HIGH_P1'
  };
  const saveConfigRes = await makeInProcessRequest({
    app,
    method: 'POST',
    path: '/api/v1/analytics/reports/saved-configurations',
    headers: { authorization: `Bearer ${adminToken}` },
    body: newConfigPayload
  });
  assert(saveConfigRes.statusCode === 201, 'POST /reports/saved-configurations created preset with HTTP 201');
  assert(saveConfigRes.body.data.name === newConfigPayload.name, 'Saved preset name preserved');
  assert(saveConfigRes.body.data.category === 'HOMOGENIZER', 'Saved preset category preserved');

  // 3.3 Validate invalid payload rejection (missing name)
  const invalidConfigRes = await makeInProcessRequest({
    app,
    method: 'POST',
    path: '/api/v1/analytics/reports/saved-configurations',
    headers: { authorization: `Bearer ${adminToken}` },
    body: { name: '  ', reportType: 'ASSET_HEALTH' }
  });
  assert(invalidConfigRes.statusCode === 400, 'POST /reports/saved-configurations rejected blank name with HTTP 400');

  // STEP 4: REPORT HISTORY & AUDIT RETRIEVAL
  console.log('\n--- Step 4: Report Generation History & Audit Ledger ---');
  const historyRes = await makeInProcessRequest({
    app,
    method: 'GET',
    path: '/api/v1/analytics/reports/history',
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(historyRes.statusCode === 200, 'GET /reports/history returned HTTP 200');
  const historyList = historyRes.body.data.history;
  assert(Array.isArray(historyList) && historyList.length >= 3, `Report history loaded: count = ${historyList.length}`);
  const firstReport = historyList[0];
  assert(Boolean(firstReport._id && firstReport.reportName && firstReport.format && firstReport.status), 'Report history item contains all mandatory audit fields');
  assert(firstReport.status === 'COMPLETED', `Report execution status verified as '${firstReport.status}'`);

  // STEP 5: AUTHORIZED EXPORTS (CSV & PDF)
  console.log('\n--- Step 5: Authorized Reports Export (CSV & PDF Formats) ---');
  
  // 5.1 Export Asset Health (CSV)
  const exportHealthCsv = await makeInProcessRequest({
    app,
    method: 'GET',
    path: '/api/v1/analytics/export?reportType=ASSET_HEALTH&format=csv',
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(exportHealthCsv.statusCode === 200, 'Export ASSET_HEALTH (CSV) succeeded with HTTP 200');
  assert(exportHealthCsv.headers['content-type'].includes('text/csv'), 'Content-Type is text/csv');
  assert(exportHealthCsv.headers['content-disposition'].includes('attachment'), 'Content-Disposition specifies attachment download');
  assert(exportHealthCsv.body.includes('Asset Tag') && exportHealthCsv.body.includes('Health Index'), 'CSV body contains Asset Tag and Health Index headers');

  // 5.2 Export Failure Risk & RUL (CSV)
  const exportRiskCsv = await makeInProcessRequest({
    app,
    method: 'GET',
    path: '/api/v1/analytics/export?reportType=FAILURE_RISK&format=csv',
    headers: { authorization: `Bearer ${opsToken}` }
  });
  assert(exportRiskCsv.statusCode === 200, 'Export FAILURE_RISK (CSV) by Ops Manager succeeded with HTTP 200');
  assert(exportRiskCsv.body.includes('RUL (Days)') && exportRiskCsv.body.includes('Model Confidence'), 'CSV body contains RUL and Model Confidence headers');

  // 5.3 Export Maintenance Work Orders (CSV)
  const exportWoCsv = await makeInProcessRequest({
    app,
    method: 'GET',
    path: '/api/v1/analytics/export?reportType=WORK_ORDERS&format=csv',
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(exportWoCsv.statusCode === 200, 'Export WORK_ORDERS (CSV) succeeded with HTTP 200');
  assert(exportWoCsv.body.includes('Work Order #') && exportWoCsv.body.includes('Downtime'), 'CSV body contains Work Order headers');

  // 5.4 Export Cold-Chain Downtime (CSV)
  const exportDowntimeCsv = await makeInProcessRequest({
    app,
    method: 'GET',
    path: '/api/v1/analytics/export?reportType=DOWNTIME&format=csv',
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(exportDowntimeCsv.statusCode === 200, 'Export DOWNTIME (CSV) succeeded with HTTP 200');
  assert(exportDowntimeCsv.body.includes('Availability (%)') && exportDowntimeCsv.body.includes('MTBF'), 'CSV body contains Availability and MTBF headers');

  // 5.5 Export Maintenance Cost & ROI (CSV)
  const exportCostCsv = await makeInProcessRequest({
    app,
    method: 'GET',
    path: '/api/v1/analytics/export?reportType=MAINTENANCE_COST&format=csv',
    headers: { authorization: `Bearer ${opsToken}` }
  });
  assert(exportCostCsv.statusCode === 200, 'Export MAINTENANCE_COST (CSV) succeeded with HTTP 200');
  assert(exportCostCsv.body.includes('Avoided Milk Souring Loss (INR)'), 'CSV body contains Avoided Milk Souring Loss column');

  // 5.6 Export Official Letterhead PDF (HTML printable)
  const exportPdf = await makeInProcessRequest({
    app,
    method: 'GET',
    path: '/api/v1/analytics/export?reportType=ASSET_HEALTH&format=pdf',
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(exportPdf.statusCode === 200, 'Export ASSET_HEALTH (PDF) succeeded with HTTP 200');
  assert(exportPdf.headers['content-type'].includes('text/html'), 'PDF stream rendered as official printable document');
  assert(exportPdf.body.includes('Dairy Cooperative Union Federation'), 'Official union letterhead banner rendered');
  assert(exportPdf.body.includes('Electronic Verification Timestamp'), 'Audit timestamp rendered on official PDF report');

  // STEP 6: RBAC ENFORCEMENT ON EXPORT
  console.log('\n--- Step 6: Strict RBAC Access Control on Exports ---');
  const techExportAttempt = await makeInProcessRequest({
    app,
    method: 'GET',
    path: '/api/v1/analytics/export?reportType=ASSET_HEALTH&format=csv',
    headers: { authorization: `Bearer ${techToken}` }
  });
  assert(techExportAttempt.statusCode === 403, 'Technician export blocked with HTTP 403 Forbidden');
  assert(techExportAttempt.body.message.includes('Forbidden') || techExportAttempt.body.message.includes('Access denied'), 'Appropriate access restriction message returned');

  // Unauthenticated export attempt
  const unauthExportAttempt = await makeInProcessRequest({
    app,
    method: 'GET',
    path: '/api/v1/analytics/export?reportType=ASSET_HEALTH&format=csv'
  });
  assert(unauthExportAttempt.statusCode === 401, 'Unauthenticated export blocked with HTTP 401 Unauthorized');

  // STEP 7: VERIFY NEW EXPORTS RECORDED IN HISTORY
  console.log('\n--- Step 7: Verification of Auto-Appended Report History ---');
  const updatedHistoryRes = await makeInProcessRequest({
    app,
    method: 'GET',
    path: '/api/v1/analytics/reports/history',
    headers: { authorization: `Bearer ${adminToken}` }
  });
  const updatedHistory = updatedHistoryRes.body.data.history;
  assert(updatedHistory.length > historyList.length, `New exports successfully recorded into history ledger (now ${updatedHistory.length} entries)`);
  assert(updatedHistory[0].format === 'PDF', 'Most recent export in history is the PDF report generated');

  // STEP 8: FRONTEND COMPONENT INTEGRITY CHECKS
  console.log('\n--- Step 8: Frontend Source Code Inspection & UI Verification ---');
  const pagePath = path.resolve('frontend/src/pages/ReportsAnalyticsPage.jsx');
  assert(fs.existsSync(pagePath), 'ReportsAnalyticsPage.jsx exists on disk');
  const pageCode = fs.readFileSync(pagePath, 'utf8');

  // Check categories in UI
  assert(pageCode.includes('BULK_MILK_COOLER') && pageCode.includes('Bulk Milk Coolers'), 'Bulk Milk Coolers option in UI category filter');
  assert(pageCode.includes('CHILLED_TANKER') && pageCode.includes('Insulated Chilled Tankers'), 'Chilled Tankers option in UI category filter');
  assert(pageCode.includes('PASTEURIZER') && pageCode.includes('Plate Pasteurizers'), 'Pasteurizers option in UI category filter');
  assert(pageCode.includes('HOMOGENIZER') && pageCode.includes('High-Pressure Homogenizers'), 'Homogenizers option in UI category filter');
  assert(pageCode.includes('COLD_ROOM') && pageCode.includes('Mother Cold Storage Rooms'), 'Cold Rooms option in UI category filter');
  assert(pageCode.includes('PACKAGING_MACHINE') && pageCode.includes('Pouch Packaging Machines'), 'Packaging Machines option in UI category filter');

  // Check report types in UI
  assert(pageCode.includes('ASSET_HEALTH'), 'Asset health report subject supported');
  assert(pageCode.includes('FAILURE_RISK'), 'Failure risk & RUL report subject supported');
  assert(pageCode.includes('MAINTENANCE'), 'Maintenance work orders report subject supported');
  assert(pageCode.includes('DOWNTIME'), 'Cold-chain downtime report subject supported');
  assert(pageCode.includes('MAINTENANCE_COST'), 'Maintenance spend & ROI report subject supported');

  // Check date ranges & comparison periods
  assert(pageCode.includes('TODAY') && pageCode.includes('7D') && pageCode.includes('MTD') && pageCode.includes('YTD') && pageCode.includes('CUSTOM'), 'All 5 date ranges configured in UI');
  assert(pageCode.includes('MoM') && pageCode.includes('QoQ') && pageCode.includes('YoY'), 'All comparison periods supported (MoM, QoQ, YoY)');

  // Check Drill-Down Modal & Status
  assert(pageCode.includes('drillDownRecord') && pageCode.includes('Drill-Down Diagnostic Record'), 'Drill-down modal dialog implemented');
  assert(pageCode.includes('generationStatus') && pageCode.includes('Status:'), 'Report generation status badge implemented');
  assert(pageCode.includes('showHistoryModal') && pageCode.includes('Generated Reports Ledger & History'), 'Report generation history ledger modal implemented');
  assert(pageCode.includes('showSaveConfigModal') && pageCode.includes('Save Report Preset Configuration'), 'Saved preset configuration modal implemented');

  console.log('\n========================================================================');
  console.log(` ALL ITEM 9 VERIFICATION CHECKS PASSED: ${passedChecks}/${totalChecks} (100%)`);
  console.log('========================================================================\n');
}

runSuite().catch((err) => {
  console.error('\n*** TEST SUITE FAILED ***\n', err);
  process.exit(1);
});
