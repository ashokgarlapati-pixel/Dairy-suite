import { ApiResponse } from '../utils/apiResponse.js';

/**
 * Zod Schema Validation Middleware
 * Validates request body, query, or params against a Zod schema
 */
export const validate = (schema, source = 'body') => {
  return async (req, res, next) => {
    try {
      const dataToValidate = req[source];
      const parsed = await schema.parseAsync(dataToValidate);
      req[source] = parsed; // Replace with sanitized/validated data
      return next();
    } catch (error) {
      if (error.errors) {
        const formattedErrors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message
        }));
        return ApiResponse.error(res, 'Request validation failed', 400, formattedErrors);
      }
      return ApiResponse.error(res, 'Validation error', 400, [{ message: error.message }]);
    }
  };
};

