/**
 * Standardized API Response Structure
 */
export class ApiResponse {
  static success(res, data = {}, message = 'Success', statusCode = 200, meta = null) {
    const payload = {
      success: true,
      statusCode,
      message,
      data
    };
    if (meta) {
      payload.meta = meta;
    }
    return res.status(statusCode).json(payload);
  }

  static error(res, message = 'Internal Server Error', statusCode = 500, errors = null) {
    const payload = {
      success: false,
      statusCode,
      message,
      errors: errors || []
    };
    return res.status(statusCode).json(payload);
  }
}

