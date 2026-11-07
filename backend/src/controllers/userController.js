import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { recordAuditEvent } from '../utils/auditLogger.js';
import { ROLES } from '../config/constants.js';

// Pre-seeded role permissions matrix using least-privilege defaults
export let inMemoryRolePermissions = {
  MAINTENANCE_ADMIN: {
    roleName: 'Maintenance Admin',
    description: 'Full cooperative authority across all infrastructure, master data, RBAC, and security policies.',
    permissions: {
      users: ['read', 'write', 'status'],
      roles: ['view', 'assign'],
      masterData: ['read', 'write'],
      configuration: ['read', 'write'],
      securityPolicies: ['manage'],
      integrations: ['manage'],
      auditAccess: ['view', 'export']
    }
  },
  OPERATIONS_MANAGER: {
    roleName: 'Operations Manager',
    description: 'Operational plant supervision, work order sign-offs, AI recommendation reviews, and reports export.',
    permissions: {
      users: ['read'],
      roles: ['view'],
      masterData: ['read'],
      configuration: ['read'],
      securityPolicies: [],
      integrations: ['view'],
      auditAccess: ['view', 'export']
    }
  },
  TECHNICIAN: {
    roleName: 'Field Technician',
    description: 'Maintenance calendar execution, mobile evidence capture, parts planning, and task status updates.',
    permissions: {
      users: [],
      roles: [],
      masterData: ['read'],
      configuration: [],
      securityPolicies: [],
      integrations: [],
      auditAccess: []
    }
  },
  VENDOR: {
    roleName: 'Equipment Vendor',
    description: 'Assigned refrigeration chiller and bulk milk cooler servicing, warranty parts delivery.',
    permissions: {
      users: [],
      roles: [],
      masterData: ['read'],
      configuration: [],
      securityPolicies: [],
      integrations: [],
      auditAccess: []
    }
  }
};

// Demo users fallback list with rich access histories
const DEMO_USERS_LIST = [
  {
    _id: '67c7e0000000000000000001',
    fullName: 'Garlapati Ashok babu (Lead Admin)',
    email: 'admin@dairycoop.org',
    role: ROLES.MAINTENANCE_ADMIN,
    phone: '+91 98450 11001',
    accountStatus: 'ACTIVE',
    orgScope: {
      cooperativeZone: 'ALL',
      assignedPlants: ['Plant-Central (Mysore)', 'Plant-North (Hassan)'],
      assignedCenters: ['VCC-MYSORE-01', 'VCC-MANDYA-04']
    },
    lastLoginAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    lastLoginIp: '127.0.0.1',
    accessHistory: [
      {
        timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        ip: '127.0.0.1',
        userAgent: 'Chrome 122.0.0 / Windows 11 Enterprise',
        success: true
      },
      {
        timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
        ip: '127.0.0.1',
        userAgent: 'Chrome 122.0.0 / Windows 11 Enterprise',
        success: true
      },
      {
        timestamp: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
        ip: '192.168.1.105',
        userAgent: 'Firefox 123.0 / Linux Ubuntu',
        success: true
      }
    ]
  },
  {
    _id: '67c7e0000000000000000002',
    fullName: 'Ramesh Patel (Operations Manager)',
    email: 'ops@dairycoop.org',
    role: ROLES.OPERATIONS_MANAGER,
    phone: '+91 98450 22002',
    accountStatus: 'ACTIVE',
    orgScope: {
      cooperativeZone: 'Southern District Union',
      assignedPlants: ['Plant-Central (Mysore)'],
      assignedCenters: ['VCC-MYSORE-01', 'VCC-MANDYA-04']
    },
    lastLoginAt: new Date(Date.now() - 3600000).toISOString(),
    lastLoginIp: '127.0.0.1',
    accessHistory: [
      {
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        ip: '127.0.0.1',
        userAgent: 'Safari 17.2 / macOS Sonoma',
        success: true
      },
      {
        timestamp: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
        ip: '127.0.0.1',
        userAgent: 'Safari 17.2 / macOS Sonoma',
        success: true
      }
    ]
  },
  {
    _id: '67c7e0000000000000000003',
    fullName: 'Suresh Kumar (Senior Field Technician)',
    email: 'tech@dairycoop.org',
    role: ROLES.TECHNICIAN,
    phone: '+91 98450 33003',
    accountStatus: 'ACTIVE',
    orgScope: {
      cooperativeZone: 'Southern District Union',
      assignedPlants: ['Plant-Central (Mysore)'],
      assignedCenters: ['VCC-MYSORE-01']
    },
    lastLoginAt: new Date(Date.now() - 7200000).toISOString(),
    lastLoginIp: '127.0.0.1',
    accessHistory: [
      {
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        ip: '127.0.0.1',
        userAgent: 'Mobile Chrome / Android 14',
        success: true
      }
    ]
  },
  {
    _id: '67c7e0000000000000000004',
    fullName: 'CoolTech Industrial Chillers (Authorized Vendor)',
    email: 'vendor@cooltech.com',
    role: ROLES.VENDOR,
    phone: '+91 98450 44004',
    accountStatus: 'ACTIVE',
    orgScope: {
      cooperativeZone: 'Southern District Union',
      assignedPlants: ['Plant-Central (Mysore)'],
      assignedCenters: []
    },
    lastLoginAt: new Date(Date.now() - 86400000).toISOString(),
    lastLoginIp: '127.0.0.1',
    accessHistory: [
      {
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        ip: '127.0.0.1',
        userAgent: 'Edge 121.0 / Windows 10',
        success: true
      }
    ]
  }
];

export let inMemoryUsers = [...DEMO_USERS_LIST];

/**
 * GET /api/v1/users
 * Lists users with roles, account status, and access history (Admin Only)
 */
export const getUsers = async (req, res) => {
  try {
    const { role, status, search } = req.query;
    const query = { isDeleted: false };

    if (role) query.role = role;
    if (status) query.accountStatus = status;
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [{ fullName: searchRegex }, { email: searchRegex }, { phone: searchRegex }];
    }

    let users = [];
    if (mongoose.connection.readyState === 1) {
      users = await User.find(query)
        .select('-passwordHash')
        .sort({ createdAt: -1 });
    } else {
      let filtered = inMemoryUsers.filter((u) => !u.isDeleted);
      if (role) filtered = filtered.filter((u) => u.role === role);
      if (status) filtered = filtered.filter((u) => u.accountStatus === status);
      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(
          (u) =>
            u.fullName.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q) ||
            (u.phone && u.phone.toLowerCase().includes(q))
        );
      }
      users = filtered;
    }

    return ApiResponse.success(res, { users, count: users.length });
  } catch (error) {
    console.error('[User Controller Error] getUsers:', error);
    return ApiResponse.error(res, error.message || 'Failed to retrieve users', 500);
  }
};

/**
 * GET /api/v1/users/:id
 * Retrieve specific user details and access history (Admin Only)
 */
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    let user = null;

    if (mongoose.connection.readyState === 1) {
      user = await User.findById(id).select('-passwordHash');
    } else {
      user = inMemoryUsers.find((u) => u._id === id || u.email === id);
    }

    if (!user) {
      return ApiResponse.error(res, `User '${id}' not found.`, 404);
    }

    return ApiResponse.success(res, user);
  } catch (error) {
    console.error('[User Controller Error] getUserById:', error);
    return ApiResponse.error(res, error.message || 'Failed to fetch user', 500);
  }
};

/**
 * POST /api/v1/users
 * Register new user with RBAC role and organizational scope (Admin Only)
 */
export const createUser = async (req, res) => {
  try {
    const { fullName, email, password, role, phone, orgScope } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    if (mongoose.connection.readyState === 1) {
      const existing = await User.findOne({ email: normalizedEmail });
      if (existing) {
        return ApiResponse.error(res, `User with email '${normalizedEmail}' already exists.`, 409);
      }
    } else {
      const existing = inMemoryUsers.find((u) => u.email === normalizedEmail && !u.isDeleted);
      if (existing) {
        return ApiResponse.error(res, `User with email '${normalizedEmail}' already exists.`, 409);
      }
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    let newUser = null;

    if (mongoose.connection.readyState === 1) {
      newUser = await User.create({
        fullName: fullName.trim(),
        email: normalizedEmail,
        passwordHash,
        role,
        phone,
        orgScope: orgScope || { cooperativeZone: 'Southern District Union' },
        accountStatus: 'ACTIVE',
        accessHistory: []
      });
    } else {
      newUser = {
        _id: new mongoose.Types.ObjectId().toString(),
        fullName: fullName.trim(),
        email: normalizedEmail,
        role,
        phone,
        orgScope: orgScope || { cooperativeZone: 'Southern District Union' },
        accountStatus: 'ACTIVE',
        accessHistory: [
          {
            timestamp: new Date().toISOString(),
            ip: '127.0.0.1',
            userAgent: 'Cooperative Provisioning Service',
            success: true
          }
        ],
        createdAt: new Date().toISOString()
      };
      inMemoryUsers.unshift(newUser);
    }

    // Record Immutable Audit Log
    await recordAuditEvent({
      req,
      action: 'CREATE',
      resourceType: 'User',
      resourceId: newUser.email,
      orgScope: newUser.orgScope,
      outcome: 'SUCCESS',
      newState: { fullName: newUser.fullName, role: newUser.role, email: newUser.email },
      reason: `Maintenance Admin provisioned new cooperative user account [${newUser.role}]`
    });

    return ApiResponse.success(res, newUser, 'User provisioned successfully', 201);
  } catch (error) {
    console.error('[User Controller Error] createUser:', error);
    return ApiResponse.error(res, error.message || 'Failed to create user', 500);
  }
};

/**
 * PUT /api/v1/users/:id
 * Edit existing user details, role, and organizational access (Admin Only)
 */
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, phone, role, orgScope, accountStatus } = req.body;

    let user = null;
    if (mongoose.connection.readyState === 1) {
      user = await User.findById(id);
    } else {
      user = inMemoryUsers.find((u) => u._id === id || u.email === id);
    }

    if (!user) {
      return ApiResponse.error(res, `User '${id}' not found.`, 404);
    }

    const previousState = {
      fullName: user.fullName,
      role: user.role,
      phone: user.phone,
      orgScope: user.orgScope,
      accountStatus: user.accountStatus
    };

    if (fullName) user.fullName = fullName.trim();
    if (phone) user.phone = phone.trim();
    if (role && Object.values(ROLES).includes(role)) user.role = role;
    if (orgScope) user.orgScope = { ...user.orgScope, ...orgScope };
    if (accountStatus && ['ACTIVE', 'DEACTIVATED', 'SUSPENDED'].includes(accountStatus)) {
      user.accountStatus = accountStatus;
    }

    if (mongoose.connection.readyState === 1) {
      await user.save();
    }

    // Record Immutable Audit Log
    await recordAuditEvent({
      req,
      action: 'MODIFY',
      resourceType: 'User',
      resourceId: user.email,
      orgScope: user.orgScope,
      outcome: 'SUCCESS',
      previousState,
      newState: {
        fullName: user.fullName,
        role: user.role,
        phone: user.phone,
        orgScope: user.orgScope,
        accountStatus: user.accountStatus
      },
      reason: `Maintenance Admin updated user profile [${user.email}]`
    });

    return ApiResponse.success(res, user, 'User details updated successfully');
  } catch (error) {
    console.error('[User Controller Error] updateUser:', error);
    return ApiResponse.error(res, error.message || 'Failed to update user', 500);
  }
};

/**
 * PATCH /api/v1/users/:id/status
 * Activate or Deactivate user account (Admin Only)
 */
export const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason = 'Administrative account status change' } = req.body;

    let user = null;
    if (mongoose.connection.readyState === 1) {
      user = await User.findById(id);
    } else {
      user = inMemoryUsers.find((u) => u._id === id || u.email === id);
    }

    if (!user) {
      return ApiResponse.error(res, `User '${id}' not found.`, 404);
    }

    const prevStatus = user.accountStatus;
    user.accountStatus = status;

    if (mongoose.connection.readyState === 1) {
      await user.save();
    }

    // Record Immutable Audit Log
    await recordAuditEvent({
      req,
      action: 'MODIFY',
      resourceType: 'User',
      resourceId: user.email,
      orgScope: user.orgScope,
      outcome: 'SUCCESS',
      previousState: { accountStatus: prevStatus },
      newState: { accountStatus: status },
      reason: `Account status updated from ${prevStatus} to ${status}: ${reason}`
    });

    return ApiResponse.success(res, { email: user.email, accountStatus: status }, `User status updated to ${status}`);
  } catch (error) {
    console.error('[User Controller Error] toggleUserStatus:', error);
    return ApiResponse.error(res, error.message || 'Status toggle failed', 500);
  }
};

/**
 * GET /api/v1/users/roles/permissions
 * Retrieve RBAC permissions matrix across all roles (Admin Only)
 */
export const getRolePermissions = async (req, res) => {
  try {
    return ApiResponse.success(res, { roles: inMemoryRolePermissions });
  } catch (error) {
    console.error('[User Controller Error] getRolePermissions:', error);
    return ApiResponse.error(res, error.message || 'Failed to fetch role permissions', 500);
  }
};

/**
 * PUT /api/v1/users/roles/permissions
 * Update role permission capabilities using least-privilege principles (Admin Only)
 */
export const updateRolePermissions = async (req, res) => {
  try {
    const { role, permissions } = req.body;

    if (!role || !inMemoryRolePermissions[role]) {
      return ApiResponse.error(res, `Role '${role}' is not a valid project role.`, 400);
    }

    if (!permissions || typeof permissions !== 'object') {
      return ApiResponse.error(res, 'Valid permissions object is required.', 400);
    }

    inMemoryRolePermissions[role].permissions = {
      ...inMemoryRolePermissions[role].permissions,
      ...permissions
    };

    // Record Immutable Audit Log
    await recordAuditEvent({
      req,
      action: 'CONFIG_CHANGE',
      resourceType: 'RolePermissions',
      resourceId: role,
      outcome: 'SUCCESS',
      newState: inMemoryRolePermissions[role].permissions,
      reason: `Updated least-privilege permissions matrix for role [${role}]`
    });

    return ApiResponse.success(
      res,
      { role: inMemoryRolePermissions[role] },
      `Permissions updated for ${role}`
    );
  } catch (error) {
    console.error('[User Controller Error] updateRolePermissions:', error);
    return ApiResponse.error(res, error.message || 'Failed to update role permissions', 500);
  }
};
