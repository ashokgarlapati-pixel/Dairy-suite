import jwt from 'jsonwebtoken';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'dairy_super_secret_jwt_access_key_2026_xyz';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dairy_super_secret_jwt_refresh_key_2026_abc';
const ACCESS_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

/**
 * Generate Access Token (short-lived, 15 minutes)
 */
export const generateAccessToken = (user) => {
  return jwt.sign(
    {
      userId: user.userId,
      _id: user._id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      orgScope: user.orgScope
    },
    ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRES_IN }
  );
};

/**
 * Generate Refresh Token (longer-lived, 7 days)
 */
export const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      userId: user.userId,
      _id: user._id
    },
    REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRES_IN }
  );
};

/**
 * Verify Access Token
 */
export const verifyAccessToken = (token) => {
  return jwt.verify(token, ACCESS_SECRET);
};

/**
 * Verify Refresh Token
 */
export const verifyRefreshToken = (token) => {
  return jwt.verify(token, REFRESH_SECRET);
};

