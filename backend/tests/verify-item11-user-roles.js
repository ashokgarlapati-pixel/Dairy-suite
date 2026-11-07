/**
 * Automated Verification Suite for Item 11: User and Role Management Page
 *
 * Requirements Tested:
 * 1. Project roles: Maintenance Admin, Technician, Operations Manager, Vendor:
 *    manage users, roles, master data, configuration, security policies, integrations, and audit access.
 * 2. Administrator capabilities: create, view, edit, activate, deactivate, and search users.
 * 3. Role & permission governance and least-privilege defaults.
 * 4. Display account status, assigned role, last login, and access history.
 * 5. Security & RBAC enforcement: Admin-only access, forbidden (HTTP 403) for non-admins.
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
  console.log(' STARTING END-TO-END TEST SUITE: ITEM 11 - USER & ROLE MANAGEMENT');
  console.log('========================================================================\n');

  // STEP 1: AUTHENTICATION FOR ALL 4 PROJECT ROLES
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

  // 1.4 Equipment Vendor
  const vendorLogin = await makeInProcessRequest({
    app,
    method: 'POST',
    path: '/api/v1/auth/login',
    body: { email: 'vendor@cooltech.com', password: 'Vendor@123' }
  });
  assert(vendorLogin.statusCode === 200, 'Vendor login succeeded with HTTP 200');
  const vendorToken = vendorLogin.body.data.accessToken;

  // STEP 2: RBAC ENFORCEMENT ON USER DIRECTORY
  console.log('\n--- Step 2: RBAC Least-Privilege Access Control Enforcement ---');
  
  // 2.1 Admin access succeeds
  const adminGetUsers = await makeInProcessRequest({
    app,
    method: 'GET',
    path: '/api/v1/users',
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(adminGetUsers.statusCode === 200, 'Admin can list users with HTTP 200');

  // 2.2 Technician attempt blocked
  const techGetUsers = await makeInProcessRequest({
    app,
    method: 'GET',
    path: '/api/v1/users',
    headers: { authorization: `Bearer ${techToken}` }
  });
  assert(techGetUsers.statusCode === 403, 'Technician blocked from user management with HTTP 403 Forbidden');

  // 2.3 Vendor attempt blocked
  const vendorGetUsers = await makeInProcessRequest({
    app,
    method: 'GET',
    path: '/api/v1/users',
    headers: { authorization: `Bearer ${vendorToken}` }
  });
  assert(vendorGetUsers.statusCode === 403, 'Vendor blocked from user management with HTTP 403 Forbidden');

  // 2.4 Unauthenticated attempt blocked
  const unauthGetUsers = await makeInProcessRequest({
    app,
    method: 'GET',
    path: '/api/v1/users'
  });
  assert(unauthGetUsers.statusCode === 401, 'Unauthenticated user blocked with HTTP 401 Unauthorized');

  // STEP 3: PRE-SEEDED USERS VERIFICATION ACROSS ALL 4 ROLES
  console.log('\n--- Step 3: Pre-Seeded Users & Field Integrity Verification ---');
  const usersList = adminGetUsers.body.data.users;
  assert(Array.isArray(usersList) && usersList.length >= 4, `Pre-seeded users count: ${usersList.length}`);

  const adminUser = usersList.find((u) => u.role === ROLES.MAINTENANCE_ADMIN);
  assert(Boolean(adminUser), 'Maintenance Admin user present in directory');
  assert(adminUser.accountStatus === 'ACTIVE', 'Admin account status is ACTIVE');
  assert(Boolean(adminUser.lastLoginAt), 'Admin lastLoginAt timestamp present');
  assert(Array.isArray(adminUser.accessHistory) && adminUser.accessHistory.length > 0, 'Admin access history entries present');

  const opsUser = usersList.find((u) => u.role === ROLES.OPERATIONS_MANAGER);
  assert(Boolean(opsUser), 'Operations Manager user present in directory');
  assert(Boolean(opsUser.orgScope?.cooperativeZone), 'Operations Manager organizational zone present');

  const techUser = usersList.find((u) => u.role === ROLES.TECHNICIAN);
  assert(Boolean(techUser), 'Field Technician user present in directory');

  const vendorUser = usersList.find((u) => u.role === ROLES.VENDOR);
  assert(Boolean(vendorUser), 'Equipment Vendor user present in directory');

  // STEP 4: SEARCH AND FILTERING CAPABILITIES
  console.log('\n--- Step 4: User Search and Multi-Dimensional Filtering ---');
  
  // 4.1 Search by name
  const searchNameRes = await makeInProcessRequest({
    app,
    method: 'GET',
    path: '/api/v1/users?search=Suresh',
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(searchNameRes.statusCode === 200, 'Search by name returned HTTP 200');
  assert(searchNameRes.body.data.users.some((u) => u.fullName.includes('Suresh')), 'Search found technician Suresh Kumar');

  // 4.2 Search by email
  const searchEmailRes = await makeInProcessRequest({
    app,
    method: 'GET',
    path: '/api/v1/users?search=ops@dairycoop.org',
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(searchEmailRes.body.data.users.some((u) => u.email === 'ops@dairycoop.org'), 'Search by email found ops manager');

  // 4.3 Filter by role
  const filterRoleRes = await makeInProcessRequest({
    app,
    method: 'GET',
    path: '/api/v1/users?role=TECHNICIAN',
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(filterRoleRes.body.data.users.every((u) => u.role === 'TECHNICIAN'), 'Filter by role=TECHNICIAN returns only technicians');

  // 4.4 Filter by account status
  const filterStatusRes = await makeInProcessRequest({
    app,
    method: 'GET',
    path: '/api/v1/users?status=ACTIVE',
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(filterStatusRes.body.data.users.every((u) => u.accountStatus === 'ACTIVE'), 'Filter by status=ACTIVE returns only active accounts');

  // STEP 5: PROVISION NEW USER (CREATE)
  console.log('\n--- Step 5: Provision New Cooperative User (Create Action) ---');
  const newUserPayload = {
    fullName: 'Ananya Sharma (Plant Technician)',
    email: 'ananya.tech@dairycoop.org',
    password: 'DairyTech@2026',
    role: ROLES.TECHNICIAN,
    phone: '+91 98450 77007',
    orgScope: {
      cooperativeZone: 'Southern District Union',
      assignedPlants: ['Plant-North (Hassan)'],
      assignedCenters: ['VCC-HASSAN-02']
    }
  };

  // 5.1 Admin creates user successfully
  const createUserRes = await makeInProcessRequest({
    app,
    method: 'POST',
    path: '/api/v1/users',
    headers: { authorization: `Bearer ${adminToken}` },
    body: newUserPayload
  });
  assert(createUserRes.statusCode === 201, 'POST /users provisioned user with HTTP 201 Created');
  const createdUser = createUserRes.body.data;
  assert(createdUser.fullName === newUserPayload.fullName, 'Provisioned user fullName preserved');
  assert(createdUser.email === newUserPayload.email, 'Provisioned user email preserved');
  assert(!createdUser.passwordHash && !createdUser.password, 'Security check: password/passwordHash never exposed to client');
  assert(createdUser.accountStatus === 'ACTIVE', 'Provisioned user status initialized as ACTIVE');
  assert(createdUser.orgScope.assignedPlants.includes('Plant-North (Hassan)'), 'Assigned plant preserved');

  // 5.2 Duplicate email rejected with HTTP 409
  const duplicateUserRes = await makeInProcessRequest({
    app,
    method: 'POST',
    path: '/api/v1/users',
    headers: { authorization: `Bearer ${adminToken}` },
    body: newUserPayload
  });
  assert(duplicateUserRes.statusCode === 409, 'Duplicate user creation rejected with HTTP 409 Conflict');

  // 5.3 Non-admin creation attempt blocked
  const techCreateAttempt = await makeInProcessRequest({
    app,
    method: 'POST',
    path: '/api/v1/users',
    headers: { authorization: `Bearer ${techToken}` },
    body: { ...newUserPayload, email: 'rogue@dairycoop.org' }
  });
  assert(techCreateAttempt.statusCode === 403, 'Technician blocked from creating user with HTTP 403 Forbidden');

  // STEP 6: VIEW USER DETAILS & ACCESS HISTORY
  console.log('\n--- Step 6: View User Details & Access History ---');
  const viewUserRes = await makeInProcessRequest({
    app,
    method: 'GET',
    path: `/api/v1/users/${createdUser._id}`,
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(viewUserRes.statusCode === 200, 'GET /users/:id returned HTTP 200');
  assert(viewUserRes.body.data.email === createdUser.email, 'User details match target account');

  const notFoundUserRes = await makeInProcessRequest({
    app,
    method: 'GET',
    path: '/api/v1/users/NON_EXISTENT_USER_ID',
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(notFoundUserRes.statusCode === 404, 'Non-existent user query returns HTTP 404 Not Found');

  // STEP 7: EDIT USER DETAILS & ORGANISATIONAL SCOPE
  console.log('\n--- Step 7: Edit User Account & Organizational Scope ---');
  const updatePayload = {
    fullName: 'Ananya Sharma (Senior Plant Specialist)',
    phone: '+91 98450 88008',
    role: ROLES.OPERATIONS_MANAGER,
    orgScope: {
      cooperativeZone: 'Mysore District Union',
      assignedPlants: ['Plant-Central (Mysore)'],
      assignedCenters: ['VCC-MYSORE-01']
    }
  };

  const updateUserRes = await makeInProcessRequest({
    app,
    method: 'PUT',
    path: `/api/v1/users/${createdUser._id}`,
    headers: { authorization: `Bearer ${adminToken}` },
    body: updatePayload
  });
  assert(updateUserRes.statusCode === 200, 'PUT /users/:id updated user profile with HTTP 200');
  const updatedUser = updateUserRes.body.data;
  assert(updatedUser.fullName === updatePayload.fullName, 'Updated fullName persisted');
  assert(updatedUser.phone === updatePayload.phone, 'Updated phone persisted');
  assert(updatedUser.role === ROLES.OPERATIONS_MANAGER, 'Promoted role to OPERATIONS_MANAGER persisted');
  assert(updatedUser.orgScope.cooperativeZone === 'Mysore District Union', 'Updated cooperative zone persisted');

  // Non-admin edit attempt blocked
  const techEditAttempt = await makeInProcessRequest({
    app,
    method: 'PUT',
    path: `/api/v1/users/${createdUser._id}`,
    headers: { authorization: `Bearer ${techToken}` },
    body: { fullName: 'Hacked Name' }
  });
  assert(techEditAttempt.statusCode === 403, 'Non-admin edit attempt blocked with HTTP 403 Forbidden');

  // STEP 8: DEACTIVATE AND REACTIVATE USER
  console.log('\n--- Step 8: Deactivate and Activate User Account Lifecycle ---');
  
  // 8.1 Deactivate account
  const deactivateRes = await makeInProcessRequest({
    app,
    method: 'PATCH',
    path: `/api/v1/users/${createdUser._id}/status`,
    headers: { authorization: `Bearer ${adminToken}` },
    body: { status: 'DEACTIVATED', reason: 'Temporary seasonal leave' }
  });
  assert(deactivateRes.statusCode === 200, 'PATCH /users/:id/status deactivated account with HTTP 200');
  assert(deactivateRes.body.data.accountStatus === 'DEACTIVATED', 'Account status confirmed as DEACTIVATED');

  // 8.2 Reactivate account
  const reactivateRes = await makeInProcessRequest({
    app,
    method: 'PATCH',
    path: `/api/v1/users/${createdUser._id}/status`,
    headers: { authorization: `Bearer ${adminToken}` },
    body: { status: 'ACTIVE', reason: 'Resumed duty' }
  });
  assert(reactivateRes.statusCode === 200, 'PATCH /users/:id/status reactivated account with HTTP 200');
  assert(reactivateRes.body.data.accountStatus === 'ACTIVE', 'Account status confirmed as ACTIVE');

  // STEP 9: ROLE & PERMISSION GOVERNANCE (LEAST-PRIVILEGE MATRIX)
  console.log('\n--- Step 9: Role & Permission Governance Matrix ---');
  
  // 9.1 Fetch role permissions matrix
  const getPermsRes = await makeInProcessRequest({
    app,
    method: 'GET',
    path: '/api/v1/users/roles/permissions',
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert(getPermsRes.statusCode === 200, 'GET /users/roles/permissions returned HTTP 200');
  const rolesMatrix = getPermsRes.body.data.roles;

  // Validate all 4 project roles present in matrix
  assert(Boolean(rolesMatrix.MAINTENANCE_ADMIN), 'Role Governance: MAINTENANCE_ADMIN defined in matrix');
  assert(Boolean(rolesMatrix.OPERATIONS_MANAGER), 'Role Governance: OPERATIONS_MANAGER defined in matrix');
  assert(Boolean(rolesMatrix.TECHNICIAN), 'Role Governance: TECHNICIAN defined in matrix');
  assert(Boolean(rolesMatrix.VENDOR), 'Role Governance: VENDOR defined in matrix');

  // Validate least-privilege defaults across domains
  const adminPerms = rolesMatrix.MAINTENANCE_ADMIN.permissions;
  assert(adminPerms.users.includes('write'), 'Maintenance Admin has user management write authority');
  assert(adminPerms.securityPolicies.includes('manage'), 'Maintenance Admin has security policies authority');
  assert(adminPerms.integrations.includes('manage'), 'Maintenance Admin has integrations authority');
  assert(adminPerms.configuration.includes('write'), 'Maintenance Admin has configuration authority');

  const techPerms = rolesMatrix.TECHNICIAN.permissions;
  assert(techPerms.users.length === 0, 'Least-privilege: Field Technician has NO user management write access');
  assert(techPerms.securityPolicies.length === 0, 'Least-privilege: Field Technician has NO security policy management access');
  assert(techPerms.configuration.length === 0, 'Least-privilege: Field Technician has NO configuration change access');

  // 9.2 Update role permissions
  const updatePermRes = await makeInProcessRequest({
    app,
    method: 'PUT',
    path: '/api/v1/users/roles/permissions',
    headers: { authorization: `Bearer ${adminToken}` },
    body: {
      role: 'OPERATIONS_MANAGER',
      permissions: {
        masterData: ['read', 'write']
      }
    }
  });
  assert(updatePermRes.statusCode === 200, 'PUT /users/roles/permissions updated role permissions with HTTP 200');
  assert(updatePermRes.body.data.role.permissions.masterData.includes('write'), 'Updated masterData permission persisted');

  // Invalid role check
  const invalidRolePermRes = await makeInProcessRequest({
    app,
    method: 'PUT',
    path: '/api/v1/users/roles/permissions',
    headers: { authorization: `Bearer ${adminToken}` },
    body: { role: 'FAKE_ROLE', permissions: {} }
  });
  assert(invalidRolePermRes.statusCode === 400, 'Rejected invalid role in permissions update with HTTP 400');

  // STEP 10: FRONTEND SOURCE CODE INSPECTION
  console.log('\n--- Step 10: Frontend Source Code Inspection & UI Verification ---');
  const pagePath = path.resolve('frontend/src/pages/UserManagementPage.jsx');
  assert(fs.existsSync(pagePath), 'UserManagementPage.jsx exists on disk');
  const pageCode = fs.readFileSync(pagePath, 'utf8');

  // Verify UI displays
  assert(pageCode.includes('MAINTENANCE_ADMIN') && pageCode.includes('Maintenance Admins'), 'Maintenance Admin role counter in UI');
  assert(pageCode.includes('OPERATIONS_MANAGER') && pageCode.includes('Operations Managers'), 'Operations Manager role counter in UI');
  assert(pageCode.includes('TECHNICIAN') && pageCode.includes('Field Technicians'), 'Field Technician role counter in UI');
  assert(pageCode.includes('VENDOR') && pageCode.includes('Equipment Vendors'), 'Equipment Vendor role counter in UI');
  assert(pageCode.includes('Role Permissions Matrix') && pageCode.includes('showPermissionsMatrix'), 'Role permissions matrix dialog in UI');
  assert(pageCode.includes('User Account Profile & Access History') && pageCode.includes('accessHistory'), 'User login access history modal in UI');
  assert(pageCode.includes('handleToggleStatus') && pageCode.includes('Deactivate'), 'Activate / Deactivate account action in UI');
  assert(pageCode.includes('handleOpenEditModal') && pageCode.includes('selectedUserToEdit'), 'Edit user modal in UI');

  const modalPath = path.resolve('frontend/src/components/users/UserFormModal.jsx');
  assert(fs.existsSync(modalPath), 'UserFormModal.jsx exists on disk');
  const modalCode = fs.readFileSync(modalPath, 'utf8');
  assert(modalCode.includes('isEditMode') && modalCode.includes('Update User Account'), 'Modal supports both create and edit modes');
  assert(modalCode.includes('orgScope') && modalCode.includes('cooperativeZone'), 'Modal manages organizational scope access');

  console.log('\n========================================================================');
  console.log(` ALL ITEM 11 VERIFICATION CHECKS PASSED: ${passedChecks}/${totalChecks} (100%)`);
  console.log('========================================================================\n');
}

runSuite().catch((err) => {
  console.error('\n*** TEST SUITE FAILED ***\n', err);
  process.exit(1);
});

