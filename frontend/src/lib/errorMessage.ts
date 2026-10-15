import { ApiError } from '../api/client';
import { reportError } from './reportError';

/**
 * Turns a failed action into a message safe to show the user, reporting it
 * when it is not a normal user-input error (validation, wrong password, ...).
 */
export function userFacingError(error: unknown, context: string): string {
  if (error instanceof ApiError) {
    if (error.isUnexpected) reportError(error, context);
    return error.requestId && error.status >= 500
      ? `${error.message} (Reference: ${error.requestId})`
      : error.message;
  }
  reportError(error, context);
  return 'Something went wrong. Please try again.';
}
