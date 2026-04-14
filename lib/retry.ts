/**
 * Utility to run an async function with exponential backoff retry.
 * Especially useful for handling transient 429 (Rate Limit) errors from APIs.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    factor?: number;
  } = {}
): Promise<T> {
  const {
    maxRetries = 4,
    initialDelay = 1000,
    maxDelay = 10000,
    factor = 2,
  } = options;

  let lastError: any;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Only retry on 429 (Rate Limit) or 503 (Service Unavailable)
      const status = error?.status || error?.response?.status;
      const isRetryable = status === 429 || status === 503 || error?.message?.includes('429') || error?.message?.includes('Too Many Requests');

      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }

      console.warn(`[Retry Helper] Attempt ${attempt + 1} failed with status ${status}. Retrying in ${delay}ms...`);
      
      await new Promise((resolve) => setTimeout(resolve, delay));
      
      // Exponential backoff
      delay = Math.min(delay * factor, maxDelay);
    }
  }

  throw lastError;
}
