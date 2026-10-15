/**
 * Single sink for unexpected client-side errors. Logs to the console today;
 * swap the body for an error-tracking SDK (Sentry, Datadog, ...) in production.
 */
export function reportError(error: unknown, context?: string): void {
  console.error(`[app error]${context ? ` ${context}:` : ''}`, error);
}

export function installGlobalErrorHandlers(): void {
  window.addEventListener('error', (event) => reportError(event.error ?? event.message, 'uncaught'));
  window.addEventListener('unhandledrejection', (event) => reportError(event.reason, 'unhandled rejection'));
}
