// ============================================================================
// Standard Error Shape — shared across all modules
// Single error contract for consistent API responses
// ============================================================================

export interface AppError {
  code: string; // machine-readable error code
  message: string; // user-facing or developer-facing message
  status: number; // HTTP status code (400, 409, 500)
  details?: Record<string, unknown>; // optional extra context
}

/**
 * Create a standardized AppError instance.
 */
export function createAppError(
  code: string,
  message: string,
  status: number = 400,
  details?: Record<string, unknown>
): AppError {
  return { code, message, status, details };
}

/**
 * Throw a "resource limit exceeded" error.
 */
export function createLimitExceededError(resource: string, limit: number): never {
  throw createAppError(
    'LIMIT_EXCEEDED',
    `Maximum ${limit} ${resource}(s) allowed (non-archived count reached)`,
    409,
    { resource, limit }
  );
}

/**
 * Throw a "not found" error.
 */
export function createNotFoundError(resource: string, id: string | number): never {
  throw createAppError(
    'NOT_FOUND',
    `${resource} with id ${id} not found`,
    404,
    { resource, id }
  );
}

/**
 * Throw a "validation failed" error.
 */
export function createValidationError(field: string, reason: string): never {
  throw createAppError(
    'VALIDATION_ERROR',
    `Invalid value for field "${field}": ${reason}`,
    400,
    { field, reason }
  );
}

/**
 * Return a standardized server error (500). Used by `toAppError()` for non-AppError values.
 * Note: This returns an AppError — it does NOT throw. Callers decide whether to throw.
 */
export function createServerError(originalError?: unknown): AppError {
  const message =
    typeof originalError === 'string'
      ? originalError
      : originalError instanceof Error
        ? originalError.message
        : 'An unexpected server error occurred';

  return createAppError(
    'INTERNAL_ERROR',
    'Something went wrong on the server. Please try again later.',
    500,
    { message }
  );
}

/**
 * Type guard: check if a caught value is an AppError.
 */
export function isAppError(error: unknown): error is AppError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    'status' in error
  );
}

/**
 * Convert any caught error to an AppError for API responses.
 */
export function toAppError(error: unknown): AppError {
  if (isAppError(error)) return error;
  return createServerError(error);
}