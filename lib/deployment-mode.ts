/**
 * Deployment mode utilities
 * Determines if the app is running in cloud (Vercel) or local mode
 */

export type DeploymentMode = 'cloud' | 'local';

/**
 * Get the current deployment mode
 * Cloud mode: Running on Vercel (SaaS)
 * Local mode: Self-hosted or development
 */
export function getDeploymentMode(): DeploymentMode {
  // Check if running on Vercel
  if (process.env.VERCEL === '1' || process.env.NEXT_PUBLIC_VERCEL_ENV) {
    return 'cloud';
  }
  
  return 'local';
}

/**
 * Check if running in cloud mode
 */
export function isCloudMode(): boolean {
  return getDeploymentMode() === 'cloud';
}

/**
 * Check if running in local mode
 */
export function isLocalMode(): boolean {
  return getDeploymentMode() === 'local';
}

/**
 * Get the base URL for the application
 */
export function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  }
  
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
}
