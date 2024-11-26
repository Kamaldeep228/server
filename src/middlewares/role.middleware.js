// middlewares/roleMiddleware.js
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Middleware to protect routes based on roles
export const authorizeRoles = (...allowedRoles) => {
  return asyncHandler((req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      throw new ApiError(403, `Role ${req.user.role} is not authorized to access this route`);
    }
    next();
  });
};
