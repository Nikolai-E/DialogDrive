/**
 * Structured error logging utility for development debugging.
 * Provides consistent error tracking without polluting production builds.
 */

/**
 * Logs errors silently in development mode for debugging purposes.
 * In production, errors are swallowed silently to avoid user-facing noise.
 * 
 * @param context - Descriptive context string (e.g., 'promptStorage.add', 'chatStorage.update')
 * @param error - The caught error object
 * 
 * @example
 * ```ts
 * try {
 *   await storage.set('key', value);
 * } catch (error) {
 *   logSilentError('storage.set', error);
 * }
 * ```
 */
export function logSilentError(context: string, error: unknown): void {
  if (import.meta.env.DEV) {
    console.debug(`[Silent Error: ${context}]`, error);
  }
  // In production, fail silently - intentional no-op
}

/**
 * Logs errors with additional metadata in development mode.
 * Useful for tracking error patterns and debugging complex flows.
 * 
 * @param context - Descriptive context string
 * @param error - The caught error object
 * @param metadata - Additional context (e.g., { promptId: '123', operation: 'delete' })
 * 
 * @example
 * ```ts
 * try {
 *   await deletePrompt(promptId);
 * } catch (error) {
 *   logSilentErrorWithMeta('promptDelete', error, { promptId });
 * }
 * ```
 */
export function logSilentErrorWithMeta(
  context: string,
  error: unknown,
  metadata?: Record<string, unknown>
): void {
  if (import.meta.env.DEV) {
    console.debug(`[Silent Error: ${context}]`, {
      error,
      metadata,
      timestamp: new Date().toISOString(),
    });
  }
  // In production, fail silently - intentional no-op
}
