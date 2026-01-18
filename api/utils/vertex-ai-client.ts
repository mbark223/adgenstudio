import { VertexAI } from '@google-cloud/vertexai';

let vertexAIInstance: VertexAI | null = null;

/**
 * Get or create a singleton Vertex AI client instance
 *
 * Environment variables required:
 * - GOOGLE_CLOUD_PROJECT_ID: Your Google Cloud project ID
 * - GOOGLE_CLOUD_LOCATION: Region (default: us-central1)
 * - GOOGLE_SERVICE_ACCOUNT_KEY: Service account JSON as string (for Vercel)
 *   OR
 * - GOOGLE_APPLICATION_CREDENTIALS: Path to service account JSON file (for local dev)
 */
export function getVertexAI(): VertexAI {
  if (vertexAIInstance) {
    return vertexAIInstance;
  }

  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
  const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';

  if (!projectId) {
    throw new Error('GOOGLE_CLOUD_PROJECT_ID environment variable is required');
  }

  // Parse service account credentials from environment
  let credentials;

  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    // Vercel deployment: credentials stored as JSON string
    try {
      credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    } catch (error) {
      throw new Error('Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY. Ensure it contains valid JSON.');
    }
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // Local development: credentials path
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      credentials = require(process.env.GOOGLE_APPLICATION_CREDENTIALS);
    } catch (error) {
      throw new Error(
        `Failed to load credentials from GOOGLE_APPLICATION_CREDENTIALS path: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`
      );
    }
  } else {
    throw new Error(
      'Either GOOGLE_SERVICE_ACCOUNT_KEY or GOOGLE_APPLICATION_CREDENTIALS environment variable is required'
    );
  }

  // Initialize Vertex AI client
  // Note: The credentials are typically set via GOOGLE_APPLICATION_CREDENTIALS env var
  // or automatically detected in Google Cloud environments
  vertexAIInstance = new VertexAI({
    project: projectId,
    location: location,
  });

  return vertexAIInstance;
}

/**
 * Reset the Vertex AI client instance (useful for testing)
 */
export function resetVertexAI(): void {
  vertexAIInstance = null;
}
