/**
 * Extracts a human-readable error message from an Axios error.
 * Handles HTTP status codes, backend error shapes, and network failures.
 *
 * @param {Error} err - The caught Axios error
 * @param {Object} [context] - Optional per-action overrides for specific status codes or keywords
 * @returns {string} A message suitable for displaying to the user
 */
export function parseApiError(err, context = {}) {
  // No response at all — network issue or CORS
  if (!err.response) {
    if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
      return 'The request timed out. Please try again.';
    }
    return 'Connection failed. Please check your internet connection and try again.';
  }

  const status = err.response.status;
  const data = err.response.data || {};

  // Extract whatever message the backend sent
  const backendMsg = data.error || data.message || data.detail || null;

  // Status-specific messages take priority — users need to know what action to take
  if (status === 401) {
    return context[401] || 'Your session has expired. Please sign in again.';
  }
  if (status === 403) {
    return context[403] || backendMsg || 'You do not have permission to perform this action.';
  }
  if (status === 429) {
    return context[429] || 'Too many attempts. Please wait a few minutes and try again.';
  }
  if (status === 409) {
    return backendMsg || context[409] || 'A conflict occurred. This record may already exist.';
  }
  if (status === 404) {
    return backendMsg || context[404] || 'The requested record was not found.';
  }
  if (status === 400) {
    return backendMsg || context[400] || 'Please check your input and try again.';
  }
  if (status === 402) {
    return context[402] || 'Insufficient wallet balance. Please top up to continue running analyses.';
  }
  if (status >= 500) {
    return context[500] || 'The service is temporarily unavailable. Please try again shortly.';
  }
  if (status === 502 || status === 503 || status === 504) {
    return 'The service is temporarily unavailable. Please try again shortly.';
  }

  // Use the backend message if it's clear, otherwise the caller's fallback
  return backendMsg || context.default || 'Something went wrong. Please try again.';
}

/**
 * Returns true if the error is a 401 (session expired).
 * Use this to trigger a logout/redirect.
 */
export function isUnauthorized(err) {
  return err?.response?.status === 401;
}
