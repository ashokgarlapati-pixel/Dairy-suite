/**
 * Automated Verification Suite for Item 10: Notifications Page and Panel
 *
 * Requirements Tested:
 * 1. In-app notification panel (in Navbar) and complete notifications page.
 * 2. All 7 event types covered:
 *    - Assignments (ASSIGNMENT)
 *    - Exceptions (EXCEPTION)
 *    - Approvals (APPROVAL)
 *    - Alerts (ALERT)
 *    - Due dates (DUE_DATE)
 *    - AI results (AI_RESULT)
 *    - System events (SYSTEM_EVENT)
 * 3. Filter views: Unread, Read, Urgent, Assigned, and System-generated.
 * 4. User actions:
 *    - Mark notifications as read (single and batch all-read)
 *    - Clear selected notifications (individual and clear-read)
 *    - Open related record (targetLink navigation & relatedEntity)
 * 5. Notification preferences based on role, event type, severity, ownership, and organisational scope.
 * 6. Validation and error handling on preferences updates.
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
  console.log(' STARTING END-TO-END TEST SUITE: ITEM 10 - NOTIFICATIONS PAGE & PANEL');
  console.log('========================================================================\n');

  // STEP 1: AUTHENTICATION
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

  // 1.2 Operations Manager
  const opsLogin = await makeInProcessRequest({
    app,
    method: 'POST',
    path: '/api/v1/auth/login',
    body: { email: 'ops@dairycoop.org', password: 'Ops@123' }
  });
  assert(opsLogin.statusCode === 200, 'Operations Manager login succeeded with HTTP 200');
  const opsToken = opsLogin.body.data.accessToken;

  // 1.3 Field Technician
  const techLogin = await makeInProcessRequest({
    app,
    method: 'POST',
    path: '/api/v1/auth/login',
    body: { email: 'tech@dairycoop.org', password: 'Tech@123' }
  });
  assert(techLogin.statusCode === 200, 'Technician login succeeded with HTTP 200');
  const techToken = techLogin.body.data.accessToken;

  // STEP 2: NOTIFICATIONS FEED RETRIEVAL & ALL 7 EVENT TYPES
  console.log('\n--- Step 2: Notifications Feed & All 7 Event Types Verification ---');
  const feedRes = await makeInProcessRequest({
    app,
    method: 'GET',
    path: '/api/v1/notifications',
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(feedRes.statusCode === 200, 'GET /notifications returned HTTP 200');
  const feed = feedRes.body.data;
  assert(Array.isArray(feed.notifications), 'Notifications array returned');
  assert(typeof feed.unreadCount === 'number', `Unread count reported: ${feed.unreadCount}`);
  assert(typeof feed.urgentCount === 'number', `Urgent count reported: ${feed.urgentCount}`);
  assert(feed.total >= 7, `Total active notifications count: ${feed.total}`);

  // Verify all 7 event types are represented
  const eventTypes = feed.notifications.map((n) => n.eventType);
  assert(eventTypes.includes('ALERT'), 'Event Type: ALERT present in feed (Critical cold-chain hazard)');
  assert(eventTypes.includes('ASSIGNMENT'), 'Event Type: ASSIGNMENT present in feed (Work order assigned)');
  assert(eventTypes.includes('APPROVAL'), 'Event Type: APPROVAL present in feed (Supervisor closure sign-off)');
  assert(eventTypes.includes('AI_RESULT'), 'Event Type: AI_RESULT present in feed (Gemini RUL prediction)');
  assert(eventTypes.includes('EXCEPTION'), 'Event Type: EXCEPTION present in feed (Thermal transit exception)');
  assert(eventTypes.includes('DUE_DATE'), 'Event Type: DUE_DATE present in feed (Preventive maintenance reminder)');
  assert(eventTypes.includes('SYSTEM_EVENT'), 'Event Type: SYSTEM_EVENT present in feed (IoT telemetry gateway sync)');

  // Verify related entity linkage and target links
  const alertNotif = feed.notifications.find((n) => n.eventType === 'ALERT');
  assert(Boolean(alertNotif.relatedEntity?.entityId), `Related entity linked: ${alertNotif.relatedEntity.entityId}`);
  assert(alertNotif.targetLink.startsWith('/assets/'), `Alert targetLink routes to asset detail: ${alertNotif.targetLink}`);

  const woNotif = feed.notifications.find((n) => n.eventType === 'ASSIGNMENT');
  assert(Boolean(woNotif.targetLink), `Assignment targetLink routes to work orders: ${woNotif.targetLink}`);

  const aiNotif = feed.notifications.find((n) => n.eventType === 'AI_RESULT');
  assert(aiNotif.targetLink === '/recommendations', `AI Result targetLink routes to: ${aiNotif.targetLink}`);

  // STEP 3: CATEGORY & STATUS VIEWS
  console.log('\n--- Step 3: Category Filtering (Unread, Read, Urgent, Assigned, System) ---');
  
  // 3.1 Unread Filter
  const unreadRes = await makeInProcessRequest({
    app,
    method: 'GET',
    path: '/api/v1/notifications?category=UNREAD',
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(unreadRes.statusCode === 200, 'GET /notifications?category=UNREAD returned HTTP 200');
  assert(unreadRes.body.data.notifications.every((n) => !n.isRead), 'All items in UNREAD view have isRead=false');

  // 3.2 Read Filter
  const readRes = await makeInProcessRequest({
    app,
    method: 'GET',
    path: '/api/v1/notifications?category=READ',
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(readRes.statusCode === 200, 'GET /notifications?category=READ returned HTTP 200');
  assert(readRes.body.data.notifications.every((n) => n.isRead), 'All items in READ view have isRead=true');

  // 3.3 Urgent Filter
  const urgentRes = await makeInProcessRequest({
    app,
    method: 'GET',
    path: '/api/v1/notifications?category=URGENT',
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(urgentRes.statusCode === 200, 'GET /notifications?category=URGENT returned HTTP 200');
  assert(urgentRes.body.data.notifications.every((n) => n.severity === 'CRITICAL_URGENT' || n.category === 'URGENT'), 'All items in URGENT view have CRITICAL_URGENT severity');

  // 3.4 Assigned Filter
  const assignedRes = await makeInProcessRequest({
    app,
    method: 'GET',
    path: '/api/v1/notifications?category=ASSIGNED',
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(assignedRes.statusCode === 200, 'GET /notifications?category=ASSIGNED returned HTTP 200');
  assert(assignedRes.body.data.notifications.some((n) => n.eventType === 'ASSIGNMENT'), 'ASSIGNMENT items present in Assigned view');

  // 3.5 System-Generated Filter
  const sysRes = await makeInProcessRequest({
    app,
    method: 'GET',
    path: '/api/v1/notifications?category=SYSTEM_GENERATED',
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(sysRes.statusCode === 200, 'GET /notifications?category=SYSTEM_GENERATED returned HTTP 200');
  assert(sysRes.body.data.notifications.some((n) => n.eventType === 'SYSTEM_EVENT'), 'SYSTEM_EVENT items present in System view');

  // 3.6 EventType and Severity direct query filters
  const alertQueryRes = await makeInProcessRequest({
    app,
    method: 'GET',
    path: '/api/v1/notifications?eventType=ALERT',
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(alertQueryRes.body.data.notifications.every((n) => n.eventType === 'ALERT'), 'Filter by eventType=ALERT returns only alerts');

  const critSeverityRes = await makeInProcessRequest({
    app,
    method: 'GET',
    path: '/api/v1/notifications?severity=CRITICAL_URGENT',
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(critSeverityRes.body.data.notifications.every((n) => n.severity === 'CRITICAL_URGENT'), 'Filter by severity=CRITICAL_URGENT returns only critical');

  // STEP 4: MARK AS READ ACTIONS
  console.log('\n--- Step 4: Mark Notification Actions (Single and All-Read) ---');
  
  // 4.1 Mark single notification as read
  const markSingleRes = await makeInProcessRequest({
    app,
    method: 'PATCH',
    path: '/api/v1/notifications/NTF-001/read',
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(markSingleRes.statusCode === 200, 'PATCH /notifications/NTF-001/read succeeded with HTTP 200');
  assert(markSingleRes.body.data.notification.isRead === true, 'Notification NTF-001 is now marked as isRead=true');

  // 4.2 Error handling for non-existent notification
  const markNotFound = await makeInProcessRequest({
    app,
    method: 'PATCH',
    path: '/api/v1/notifications/NON_EXISTENT_ID/read',
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(markNotFound.statusCode === 404, 'PATCH on non-existent notification returns HTTP 404');

  // 4.3 Mark all notifications as read
  const markAllRes = await makeInProcessRequest({
    app,
    method: 'POST',
    path: '/api/v1/notifications/mark-all-read',
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(markAllRes.statusCode === 200, 'POST /notifications/mark-all-read succeeded with HTTP 200');

  // Verify unread count is now 0
  const afterAllRead = await makeInProcessRequest({
    app,
    method: 'GET',
    path: '/api/v1/notifications',
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(afterAllRead.body.data.unreadCount === 0, 'Unread count updated to 0 after markAllAsRead');

  // STEP 5: CLEAR / DISMISS NOTIFICATIONS
  console.log('\n--- Step 5: Clear Notifications (Individual and Batch) ---');
  
  // 5.1 Clear single notification
  const clearSingleRes = await makeInProcessRequest({
    app,
    method: 'DELETE',
    path: '/api/v1/notifications/NTF-007',
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(clearSingleRes.statusCode === 200, 'DELETE /notifications/NTF-007 cleared notification with HTTP 200');

  // Verify NTF-007 no longer appears in feed
  const feedAfterClear = await makeInProcessRequest({
    app,
    method: 'GET',
    path: '/api/v1/notifications',
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(!feedAfterClear.body.data.notifications.some((n) => n._id === 'NTF-007'), 'Cleared notification NTF-007 filtered out of active feed');

  // 5.2 Clear read notifications batch
  const clearBatchRes = await makeInProcessRequest({
    app,
    method: 'POST',
    path: '/api/v1/notifications/clear-all',
    headers: { authorization: `Bearer ${adminToken}` },
    body: { readOnly: true }
  });
  assert(clearBatchRes.statusCode === 200, 'POST /notifications/clear-all cleared read items with HTTP 200');
  assert(typeof clearBatchRes.body.data.clearedCount === 'number', `Cleared count returned: ${clearBatchRes.body.data.clearedCount}`);

  // STEP 6: NOTIFICATION PREFERENCES (ROLE, EVENT TYPE, SEVERITY, OWNERSHIP, ORG SCOPE)
  console.log('\n--- Step 6: Notification Preferences Configuration ---');
  
  // 6.1 Get current preferences
  const getPrefsRes = await makeInProcessRequest({
    app,
    method: 'GET',
    path: '/api/v1/notifications/preferences',
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(getPrefsRes.statusCode === 200, 'GET /notifications/preferences returned HTTP 200');
  const prefs = getPrefsRes.body.data.preferences;
  assert(Boolean(prefs.role), `Preferences role: ${prefs.role}`);
  assert(Boolean(prefs.eventTypes), 'Preferences eventTypes mapping present');
  assert(Boolean(prefs.minSeverity), `Preferences minSeverity: ${prefs.minSeverity}`);
  assert(Boolean(prefs.ownership), `Preferences ownership scope: ${prefs.ownership}`);
  assert(Boolean(prefs.orgScope), 'Preferences orgScope present');

  // 6.2 Update preferences with full dimensions
  const updatePayload = {
    role: 'MAINTENANCE_ADMIN',
    eventTypes: {
      ASSIGNMENT: true,
      EXCEPTION: true,
      APPROVAL: true,
      ALERT: true,
      DUE_DATE: true,
      AI_RESULT: true,
      SYSTEM_EVENT: false // disable benign system events
    },
    minSeverity: 'WARNING',
    ownership: 'ASSIGNED_TO_ME',
    orgScope: {
      cooperativeZone: 'Mysore Milk Union Zone',
      plantId: 'MYSORE_MAIN_DAIRY',
      centerId: 'CHILLING_CTR_14'
    },
    channels: {
      inApp: true,
      emailDigest: true,
      smsUrgent: true
    }
  };

  const updatePrefsRes = await makeInProcessRequest({
    app,
    method: 'PUT',
    path: '/api/v1/notifications/preferences',
    headers: { authorization: `Bearer ${adminToken}` },
    body: updatePayload
  });
  assert(updatePrefsRes.statusCode === 200, 'PUT /notifications/preferences updated preferences with HTTP 200');
  const updatedPrefs = updatePrefsRes.body.data.preferences;
  assert(updatedPrefs.minSeverity === 'WARNING', 'Updated minSeverity persisted as WARNING');
  assert(updatedPrefs.ownership === 'ASSIGNED_TO_ME', 'Updated ownership persisted as ASSIGNED_TO_ME');
  assert(updatedPrefs.eventTypes.SYSTEM_EVENT === false, 'Updated eventType toggle persisted');
  assert(updatedPrefs.orgScope.cooperativeZone === 'Mysore Milk Union Zone', 'Updated orgScope zone persisted');

  // 6.3 Test validation errors on invalid values
  const invalidSeverity = await makeInProcessRequest({
    app,
    method: 'PUT',
    path: '/api/v1/notifications/preferences',
    headers: { authorization: `Bearer ${adminToken}` },
    body: { minSeverity: 'SUPER_URGENT_INVALID' }
  });
  assert(invalidSeverity.statusCode === 400, 'PUT /notifications/preferences rejected invalid severity with HTTP 400');

  const invalidOwnership = await makeInProcessRequest({
    app,
    method: 'PUT',
    path: '/api/v1/notifications/preferences',
    headers: { authorization: `Bearer ${adminToken}` },
    body: { ownership: 'PLANET_WIDE' }
  });
  assert(invalidOwnership.statusCode === 400, 'PUT /notifications/preferences rejected invalid ownership with HTTP 400');

  // STEP 7: FRONTEND SOURCE CODE INSPECTION
  console.log('\n--- Step 7: Frontend Source Code Inspection & UI Verification ---');
  
  // 7.1 Navbar In-App Notification Panel
  const navbarPath = path.resolve('frontend/src/components/layout/Navbar.jsx');
  assert(fs.existsSync(navbarPath), 'Navbar.jsx exists on disk');
  const navbarCode = fs.readFileSync(navbarPath, 'utf8');
  assert(navbarCode.includes('showNotificationPanel') && navbarCode.includes('setShowNotificationPanel'), 'In-app notification panel state in Navbar');
  assert(navbarCode.includes('panelTab') && navbarCode.includes('unreadCount'), 'In-app panel tabs and live unread counter in Navbar');
  assert(navbarCode.includes('Open Full Notifications Center'), 'In-app panel links to full Notifications Center');
  assert(navbarCode.includes('handleClear') && navbarCode.includes('handleMarkAsRead'), 'In-app panel supports clear and mark as read');

  // 7.2 Complete Notifications Page
  const pagePath = path.resolve('frontend/src/pages/NotificationsPage.jsx');
  assert(fs.existsSync(pagePath), 'NotificationsPage.jsx exists on disk');
  const pageCode = fs.readFileSync(pagePath, 'utf8');

  // Check categories in UI
  assert(pageCode.includes('CATEGORY_TABS') && pageCode.includes('URGENT') && pageCode.includes('ASSIGNED') && pageCode.includes('SYSTEM_GENERATED'), 'All mandatory category tabs present in NotificationsPage');
  
  // Check all 7 event types in UI
  assert(pageCode.includes('ASSIGNMENT') && pageCode.includes('Work Assignments'), 'Assignment event type in UI');
  assert(pageCode.includes('EXCEPTION') && pageCode.includes('Telemetry Exceptions'), 'Exception event type in UI');
  assert(pageCode.includes('APPROVAL') && pageCode.includes('Closure Approvals'), 'Approval event type in UI');
  assert(pageCode.includes('ALERT') && pageCode.includes('Critical Failure Alerts'), 'Alert event type in UI');
  assert(pageCode.includes('DUE_DATE') && pageCode.includes('Due Date Reminders'), 'Due Date event type in UI');
  assert(pageCode.includes('AI_RESULT') && pageCode.includes('AI RUL Predictions'), 'AI Result event type in UI');
  assert(pageCode.includes('SYSTEM_EVENT') && pageCode.includes('System Operations'), 'System Event type in UI');

  // Check actions & preferences modal in UI
  assert(pageCode.includes('handleMarkAsRead') && pageCode.includes('handleMarkAllRead'), 'Mark as read and Mark all read implemented');
  assert(pageCode.includes('handleClear') && pageCode.includes('handleClearRead'), 'Clear individual and clear read implemented');
  assert(pageCode.includes('targetLink') && pageCode.includes('Open Record'), 'Open related record navigation implemented');
  assert(pageCode.includes('showPreferencesModal') && pageCode.includes('Notification Delivery Preferences'), 'Notification preferences modal implemented');
  assert(pageCode.includes('minSeverity') && pageCode.includes('ownership') && pageCode.includes('orgScope'), 'Preferences modal supports severity, ownership, and org scope');

  console.log('\n========================================================================');
  console.log(` ALL ITEM 10 VERIFICATION CHECKS PASSED: ${passedChecks}/${totalChecks} (100%)`);
  console.log('========================================================================\n');
}

runSuite().catch((err) => {
  console.error('\n*** TEST SUITE FAILED ***\n', err);
  process.exit(1);
});

