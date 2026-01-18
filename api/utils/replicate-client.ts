import Replicate from 'replicate';

let replicateInstance: Replicate | null = null;

/**
 * Get or create a singleton Replicate client instance
 *
 * Environment variables required:
 * - REPLICATE_API_TOKEN: Your Replicate API token from replicate.com/account/api-tokens
 */
export function getReplicate(): Replicate {
  if (replicateInstance) {
    return replicateInstance;
  }

  const apiToken = process.env.REPLICATE_API_TOKEN;

  if (!apiToken) {
    throw new Error('REPLICATE_API_TOKEN environment variable is required');
  }

  replicateInstance = new Replicate({
    auth: apiToken,
  });

  return replicateInstance;
}

/**
 * Reset the Replicate client instance (useful for testing)
 */
export function resetReplicate(): void {
  replicateInstance = null;
}
