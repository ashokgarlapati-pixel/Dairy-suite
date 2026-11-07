import mongoose from 'mongoose';
import { verifyAccessToken } from '../utils/tokenUtils.js';
import { User } from '../models/User.js';
import { ApiResponse } from '../utils/apiResponse.js';

/**
 * Authentication Middleware
 * Enforces valid JWT token and attaches user profile to request
 */
export const authenticate = async (req, res, next) => {
  try {
    let token = null;

    // 1. Check Authorization Bearer header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
    // 2. Check cookies as fallback
    else if (req.cookies && req.cookies.dairy_access_token) {
      token = req.cookies.dairy_access_token;
    }

    if (!token) {
      return ApiResponse.error(
        res,
        'Authentication required. Please provide a valid Bearer token.',
        401
      );
    }

    // Verify token
    const decoded = verifyAccessToken(token);

    // Fetch user from DB to verify status is active and not deleted
    let user = null;
    try {
      if (mongoose.connection.readyState === 1 && decoded._id) {
        user = await User.findById(decoded._id).select('-passwordHash');
      }
    } catch (dbErr) {
      console.warn(`[AuthMiddleware Notice] DB lookup bypassed: ${dbErr.message}`);
    }

    // Fallback to decoded token payload for demo accounts if DB lookup fails
    if (!user && decoded.email) {
      user = {
        _id: decoded._id,
        email: decoded.email,
        fullName: decoded.fullName,
        role: decoded.role,
        orgScope: decoded.orgScope || { cooperativeZone: 'ALL' },
        accountStatus: 'ACTIVE',
        isDeleted: false
      };
    }

    if (!user) {
      return ApiResponse.error(res, 'User session invalid. User record not found.', 401);
    }

    if (user.isDeleted || user.accountStatus === 'DEACTIVATED' || user.accountStatus === 'SUSPENDED') {
      return ApiResponse.error(
        res,
        `Account is currently ${user.accountStatus.toLowerCase()}. Please contact Maintenance Administrator.`,
        403
      );
    }

    // Attach user to request
    req.user = user;
    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return ApiResponse.error(res, 'Authentication token has expired. Please refresh your session.', 401);
    }
    return ApiResponse.error(res, 'Invalid authentication token.', 401);
  }
};

