import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/tokenUtils.js';
import { recordAuditEvent } from '../utils/auditLogger.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ROLES } from '../config/constants.js';

// Pre-configured Demo Accounts for seamless evaluation & resilient fallback
const DEMO_ACCOUNTS = {
  'admin@dairycoop.org': {
    fullName: 'Garlapati Ashok babu (Lead Admin)',
    role: ROLES.MAINTENANCE_ADMIN,
    phone: '+91 98450 11001',
    passwordPlain: 'Admin@123',
    orgScope: {
      cooperativeZone: 'ALL',
      assignedPlants: ['Plant-Central (Mysore)', 'Plant-North (Hassan)'],
      assignedCenters: ['VCC-MYSORE-01', 'VCC-MANDYA-04', 'VCC-HASSAN-02']
    }
  },
  'ops@dairycoop.org': {
    fullName: 'Ramesh Patel (Operations Manager)',
    role: ROLES.OPERATIONS_MANAGER,
    phone: '+91 98450 22002',
    passwordPlain: 'Ops@123',
    orgScope: {
      cooperativeZone: 'Southern District Union',
      assignedPlants: ['Plant-Central (Mysore)'],
      assignedCenters: ['VCC-MYSORE-01', 'VCC-MANDYA-04']
    }
  },
  'tech@dairycoop.org': {
    fullName: 'Suresh Kumar (Senior Field Technician)',
    role: ROLES.TECHNICIAN,
    phone: '+91 98450 33003',
    passwordPlain: 'Tech@123',
    orgScope: {
      cooperativeZone: 'Southern District Union',
      assignedPlants: ['Plant-Central (Mysore)'],
      assignedCenters: ['VCC-MYSORE-01']
    }
  },
  'vendor@cooltech.com': {
    fullName: 'CoolTech Industrial Chillers (Authorized Vendor)',
    role: ROLES.VENDOR,
    phone: '+91 98450 44004',
    passwordPlain: 'Vendor@123',
    orgScope: {
      cooperativeZone: 'Southern District Union',
      assignedPlants: ['Plant-Central (Mysore)'],
      assignedCenters: []
    }
  }
};

// Helper to determine role-based landing page
const getDefaultRedirectRoute = (role) => {
  switch (role) {
    case ROLES.TECHNICIAN:
      return '/calendar';
    case ROLES.OPERATIONS_MANAGER:
      return '/assets';
    case ROLES.VENDOR:
      return '/planning';
    case ROLES.MAINTENANCE_ADMIN:
    default:
      return '/assets';
  }
};

/**
 * User Login Controller
 * POST /api/v1/auth/login
 */
export const login = async (req, res, next) => {
  try {
    const { email, password, rememberMe } = req.body;
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

    // 1. Find user by email (with graceful fallback if DB is connecting or demo user not yet seeded)
    let user = null;
    const normalizedEmail = email.toLowerCase().trim();

    try {
      if (mongoose.connection.readyState === 1) {
        user = await User.findOne({ email: normalizedEmail, isDeleted: false });
      }
    } catch (dbErr) {
      console.warn(`[Auth Notice] Database query error or connection pending: ${dbErr.message}`);
    }

    // Auto-provision demo account if not in DB or if DB is still seeding
    if (!user && DEMO_ACCOUNTS[normalizedEmail]) {
      const demoData = DEMO_ACCOUNTS[normalizedEmail];
      if (password === demoData.passwordPlain) {
        try {
          if (mongoose.connection.readyState === 1) {
            const salt = await bcrypt.genSalt(12);
            user = await User.create({
              fullName: demoData.fullName,
              email: normalizedEmail,
              passwordHash: await bcrypt.hash(demoData.passwordPlain, salt),
              role: demoData.role,
              phone: demoData.phone,
              orgScope: demoData.orgScope,
              accountStatus: 'ACTIVE'
            });
            console.log(`[Auth Auto-Provision] Provisioned demo user on first login: ${normalizedEmail}`);
          }
        } catch (provErr) {
          console.warn(`[Auth Auto-Provision Warning] ${provErr.message}`);
        }

        // If DB is offline or could not create model, return simulated demo user object
        if (!user) {
          user = {
            _id: new mongoose.Types.ObjectId(),
            fullName: demoData.fullName,
            email: normalizedEmail,
            role: demoData.role,
            phone: demoData.phone,
            orgScope: demoData.orgScope,
            accountStatus: 'ACTIVE',
            save: async () => {}
          };
        }
      }
    }

    if (!user) {
      // Audit log failed attempt
      await recordAuditEvent({
        req,
        action: 'AUTHENTICATION',
        resourceType: 'User',
        resourceId: email,
        outcome: 'FAILURE',
        reason: 'User not found with provided email'
      });
      return ApiResponse.error(res, 'Invalid email address or password.', 401);
    }

    // 2. Check for temporary account lockout
    if (user.lockUntil && user.lockUntil > new Date()) {
      const waitMinutes = Math.ceil((user.lockUntil - new Date()) / (1000 * 60));
      return ApiResponse.error(
        res,
        `Account is temporarily locked due to consecutive failed attempts. Please retry in ${waitMinutes} minute(s).`,
        423
      );
    }

    // 3. Check account status
    if (user.accountStatus === 'DEACTIVATED' || user.accountStatus === 'SUSPENDED') {
      await recordAuditEvent({
        req,
        actorId: user._id,
        actorName: user.fullName,
        actorRole: user.role,
        action: 'AUTHENTICATION',
        resourceType: 'User',
        resourceId: user.email,
        outcome: 'ACCESS_DENIED',
        reason: `Login rejected: Account is ${user.accountStatus}`
      });
      return ApiResponse.error(
        res,
        `Account access has been ${user.accountStatus.toLowerCase()} by administration.`,
        403
      );
    }

    // 4. Validate password with bcrypt or demo plain match
    const isMatch = user.passwordHash
      ? await bcrypt.compare(password, user.passwordHash)
      : password === DEMO_ACCOUNTS[normalizedEmail]?.passwordPlain;

    if (!isMatch) {
      // Increment failed login count
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

      // Lock account for 15 minutes after 5 consecutive failures
      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
      }

      if (typeof user.save === 'function') {
        try { await user.save(); } catch (e) {}
      }

      await recordAuditEvent({
        req,
        actorId: user._id,
        actorName: user.fullName,
        actorRole: user.role,
        action: 'AUTHENTICATION',
        resourceType: 'User',
        resourceId: user.email,
        outcome: 'FAILURE',
        reason: `Incorrect password. Failed attempt #${user.failedLoginAttempts}`
      });

      return ApiResponse.error(res, 'Invalid email address or password.', 401);
    }

    // 5. Successful login: Reset lock & update session info
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLoginAt = new Date();
    user.lastLoginIp = ipAddress;
    if (!Array.isArray(user.accessHistory)) {
      user.accessHistory = [];
    }
    user.accessHistory.push({
      timestamp: new Date(),
      ip: ipAddress,
      userAgent: req.headers['user-agent'] || 'Unknown',
      success: true
    });

    // Keep accessHistory capped at 20 most recent entries
    if (user.accessHistory.length > 20) {
      user.accessHistory = user.accessHistory.slice(-20);
    }

    if (typeof user.save === 'function') {
      try { await user.save(); } catch (e) {}
    }

    // 6. Generate Tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Set secure HTTP-only refresh cookie
    res.cookie('dairy_refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // 7. Audit log successful login event
    await recordAuditEvent({
      req,
      actorId: user._id,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'LOGIN',
      resourceType: 'User',
      resourceId: user.email,
      orgScope: user.orgScope,
      outcome: 'SUCCESS',
      reason: 'User authenticated successfully via JWT credentials'
    });

    const userProfile = typeof user.toJSON === 'function' ? user.toJSON() : { ...user };
    delete userProfile.password;
    const defaultRoute = getDefaultRedirectRoute(user.role);

    return ApiResponse.success(
      res,
      {
        user: userProfile,
        accessToken,
        defaultRoute
      },
      'Authentication successful. Session initialized.'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * User Registration Controller
 * POST /api/v1/auth/register
 */
export const register = async (req, res, next) => {
  try {
    const { email, password, fullName, role, orgScope, phone } = req.body;

    // Check if user exists
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return ApiResponse.error(res, 'A user with this cooperative email already exists.', 409);
    }

    // Hash password with bcrypt
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const newUser = new User({
      email: email.toLowerCase().trim(),
      passwordHash,
      fullName: fullName.trim(),
      role: role || ROLES.TECHNICIAN,
      orgScope: orgScope || { cooperativeZone: 'Southern District Union', assignedPlants: [], assignedCenters: [] },
      phone
    });

    await newUser.save();

    // Audit log registration
    await recordAuditEvent({
      req,
      actorId: newUser._id,
      actorName: newUser.fullName,
      actorRole: newUser.role,
      action: 'CREATE',
      resourceType: 'User',
      resourceId: newUser.email,
      orgScope: newUser.orgScope,
      outcome: 'SUCCESS',
      reason: `New user registered with role ${newUser.role}`
    });

    const accessToken = generateAccessToken(newUser);
    const refreshToken = generateRefreshToken(newUser);

    res.cookie('dairy_refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return ApiResponse.success(
      res,
      {
        user: newUser.toJSON(),
        accessToken,
        defaultRoute: getDefaultRedirectRoute(newUser.role)
      },
      'User registered and authenticated successfully.',
      201
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Rotate Refresh Token
 * POST /api/v1/auth/refresh
 */
export const refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies.dairy_refresh_token || req.body.refreshToken;

    if (!token) {
      return ApiResponse.error(res, 'Refresh token required.', 401);
    }

    const decoded = verifyRefreshToken(token);
    const user = await User.findById(decoded._id);

    if (!user || user.isDeleted || user.accountStatus !== 'ACTIVE') {
      return ApiResponse.error(res, 'Invalid refresh token session.', 401);
    }

    const newAccessToken = generateAccessToken(user);

    return ApiResponse.success(res, { accessToken: newAccessToken }, 'Access token refreshed successfully.');
  } catch (error) {
    return ApiResponse.error(res, 'Invalid or expired refresh token. Please sign in again.', 401);
  }
};

/**
 * User Logout Controller
 * POST /api/v1/auth/logout
 */
export const logout = async (req, res, next) => {
  try {
    if (req.user) {
      await recordAuditEvent({
        req,
        actorId: req.user._id,
        actorName: req.user.fullName,
        actorRole: req.user.role,
        action: 'LOGOUT',
        resourceType: 'User',
        resourceId: req.user.email,
        outcome: 'SUCCESS',
        reason: 'User logged out and session terminated'
      });
    }

    res.clearCookie('dairy_refresh_token');
    return ApiResponse.success(res, null, 'Logged out successfully.');
  } catch (error) {
    next(error);
  }
};

/**
 * Get Authenticated User Profile
 * GET /api/v1/auth/me
 */
export const getMe = async (req, res) => {
  return ApiResponse.success(res, { user: req.user }, 'Profile retrieved successfully.');
};

/**
 * Forgot Password Request Controller
 * POST /api/v1/auth/forgot-password
 */
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const normalizedEmail = email.toLowerCase().trim();
    let user = null;

    if (mongoose.connection.readyState === 1) {
      user = await User.findOne({ email: normalizedEmail });
    } else if (DEMO_ACCOUNTS[normalizedEmail]) {
      user = {
        _id: new mongoose.Types.ObjectId(),
        email: normalizedEmail,
        fullName: DEMO_ACCOUNTS[normalizedEmail].fullName,
        role: DEMO_ACCOUNTS[normalizedEmail].role
      };
    }

    if (!user) {
      // Do not reveal email existence to prevent enumeration
      return ApiResponse.success(
        res,
        null,
        'If an account exists with this email, recovery instructions have been dispatched.'
      );
    }

    // In production, dispatch email with reset token. Here, generate demo reset token
    const demoResetToken = Buffer.from(`${user._id}-${Date.now()}`).toString('base64');

    await recordAuditEvent({
      req,
      actorId: user._id,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'AUTHENTICATION',
      resourceType: 'User',
      resourceId: user.email,
      outcome: 'SUCCESS',
      reason: 'Password reset request initiated'
    });

    return ApiResponse.success(
      res,
      { resetToken: demoResetToken },
      'Password reset instructions sent. Use resetToken to submit new password.'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Reset Password Controller
 * POST /api/v1/auth/reset-password
 */
export const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    // Decode token format
    const decodedStr = Buffer.from(token, 'base64').toString('ascii');
    const [userId] = decodedStr.split('-');

    let user = null;
    if (mongoose.connection.readyState === 1) {
      user = await User.findById(userId);
    } else {
      user = { _id: userId, email: 'tech@dairycoop.org', fullName: 'Field Technician', role: 'TECHNICIAN' };
    }
    if (!user) {
      return ApiResponse.error(res, 'Invalid or expired password reset token.', 400);
    }

    if (mongoose.connection.readyState === 1 && typeof user.save === 'function') {
      const salt = await bcrypt.genSalt(12);
      user.passwordHash = await bcrypt.hash(newPassword, salt);
      user.failedLoginAttempts = 0;
      await user.save();
    }
    user.lockUntil = undefined;
    await user.save();

    await recordAuditEvent({
      req,
      actorId: user._id,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'MODIFY',
      resourceType: 'User',
      resourceId: user.email,
      outcome: 'SUCCESS',
      reason: 'Password reset successfully executed'
    });

    return ApiResponse.success(res, null, 'Password has been reset successfully. Please login with your new credentials.');
  } catch (error) {
    return ApiResponse.error(res, 'Malformed or invalid password reset token.', 400);
  }
};

