/**
 * GitHub Integration Detection Service
 * Auto-detects GitHub integrations linked to Supabase projects
 */

export interface GitHubIntegration {
  hasGitHub: boolean;
  repoUrl?: string;
  defaultBranch?: string;
  integrationId?: string;
  organizationSlug?: string;
}

interface SupabaseIntegration {
  id: string;
  type: string;
  metadata?: {
    repository?: string;
    owner?: string;
    default_branch?: string;
  };
}

/**
 * NOTE: Supabase GitHub integration is a Dashboard-only feature
 * There is no public API to detect it programmatically
 * 
 * This function is kept for potential future API support
 * Current implementation: Manual repo URL input by user
 * 
 * @deprecated - Use manual GitHub URL input instead
 */
export async function detectGitHubIntegration(
  projectRef: string,
  serviceRoleKey: string
): Promise<GitHubIntegration> {
  // GitHub integration is not exposed via public API
  // Users need to manually provide their repository URL
  console.warn(
    'GitHub integration detection via API is not supported. ' +
    'Supabase GitHub integration is configured through Dashboard UI only.'
  );
  
  return { 
    hasGitHub: false,
  };
}

/**
 * Validate and normalize a GitHub repository URL
 * @param repoUrl - GitHub repository URL provided by user
 * @returns Validated GitHub integration details
 */
export function validateGitHubUrl(repoUrl: string): GitHubIntegration {
  try {
    const parsed = parseGitHubUrl(repoUrl);
    
    if (!parsed) {
      return { hasGitHub: false };
    }

    return {
      hasGitHub: true,
      repoUrl: `https://github.com/${parsed.owner}/${parsed.repo}`,
      defaultBranch: 'main', // Default, users can override
      organizationSlug: parsed.owner,
    };
  } catch (error) {
    console.error('Failed to validate GitHub URL:', error);
    return { hasGitHub: false };
  }
}

/**
 * Extract project reference from Supabase URL
 * @param supabaseUrl - Full Supabase project URL (e.g., https://xxx.supabase.co)
 * @returns Project reference ID
 */
export function extractProjectRef(supabaseUrl: string): string | null {
  try {
    const url = new URL(supabaseUrl);
    const hostname = url.hostname;
    
    // Extract project ref from hostname (xxx.supabase.co)
    const match = hostname.match(/^([a-z0-9]+)\.supabase\.co$/);
    if (match) {
      return match[1];
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Parse GitHub repo URL to extract owner and repo name
 * @param repoUrl - GitHub repository URL
 * @returns Owner and repo name
 */
export function parseGitHubUrl(repoUrl: string): {
  owner: string;
  repo: string;
} | null {
  try {
    // Support various GitHub URL formats
    const patterns = [
      /github\.com\/([^\/]+)\/([^\/\.]+)/,
      /github\.com:([^\/]+)\/([^\/\.]+)/,
    ];

    for (const pattern of patterns) {
      const match = repoUrl.match(pattern);
      if (match) {
        return {
          owner: match[1],
          repo: match[2].replace(/\.git$/, ''),
        };
      }
    }

    return null;
  } catch {
    return null;
  }
}

