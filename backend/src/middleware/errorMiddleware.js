import { ApiResponse } from '../utils/apiResponse.js';

/**
 * 404 Route Not Found Handler
 */
export const notFoundHandler = (req, res, next) => {
  return ApiResponse.error(res, `Endpoint not found: ${req.method} ${req.originalUrl}`, 404);
};

/**
 * Centralized Global Error Handler Middleware
 */
export const globalErrorHandler = (err, req, res, next) => {
  console.error(`[Error] ${req.method} ${req.originalUrl} -`, err);

  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = err.errors || [];

  // Mongoose CastError (Invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid resource identifier: ${err.value}`;
  }

  // Mongoose Duplicate Key Error (E11000)
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `Duplicate value entered for ${field}. A record with this ${field} already exists.`;
  }

  // JWT Errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token. Please sign in again.';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication session has expired. Please sign in again.';
  }

  return ApiResponse.error(
    res,
    message,
    statusCode,
    process.env.NODE_ENV === 'development' ? errors.concat({ stack: err.stack }) : errors
  );
};

