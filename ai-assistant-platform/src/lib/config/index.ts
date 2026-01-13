/**
 * Application configuration
 * Centralizes environment variable access and configuration
 */

// ============================================================================
// Environment Validation
// ============================================================================

function getEnvVar(key: string, required: boolean = true): string {
  const value = process.env[key];

  if (required && !value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value || '';
}

function getPublicEnvVar(key: string, required: boolean = true): string {
  // For client-side access, use NEXT_PUBLIC_ prefix
  const value = process.env[key];

  if (required && !value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value || '';
}

// ============================================================================
// Configuration Object
// ============================================================================

export const config = {
  // Supabase Configuration
  supabase: {
    url: getPublicEnvVar('NEXT_PUBLIC_SUPABASE_URL'),
    anonKey: getPublicEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    serviceRoleKey: getEnvVar('SUPABASE_SERVICE_ROLE_KEY', false), // Only on server
  },

  // OpenAI Configuration
  openai: {
    apiKey: getEnvVar('OPENAI_API_KEY', false), // Only on server
    defaultModel: getEnvVar('OPENAI_MODEL', false) || 'gpt-4-turbo-preview',
    defaultMaxTokens: 4096,
    defaultTemperature: 0.7,
  },

  // Tenant Configuration
  tenant: {
    slug: getEnvVar('TENANT_SLUG', false) || 'default',
  },

  // Application Configuration
  app: {
    url: getPublicEnvVar('NEXT_PUBLIC_APP_URL', false) || 'http://localhost:3000',
    name: 'AI Assistant Platform',
    version: '0.1.0',
  },

  // Feature Flags
  features: {
    feedbackEnabled: true,
    fileUploadsEnabled: false,
    conversationHistoryEnabled: true,
    streamingEnabled: true,
  },

  // Default AI Settings
  ai: {
    systemPrompt: `You are a helpful AI assistant for corporate users. You provide clear, accurate, and professional responses. Be concise but thorough. If you're unsure about something, say so rather than making assumptions.`,
    maxConversationMessages: 50, // Maximum messages to include in context
    maxTokensPerRequest: 4096,
  },

  // Model pricing (per 1000 tokens in USD)
  modelPricing: {
    'gpt-5.1': { prompt: 0.02, completion: 0.06 },
    'gpt-4-turbo-preview': { prompt: 0.01, completion: 0.03 },
    'gpt-4-turbo': { prompt: 0.01, completion: 0.03 },
    'gpt-4': { prompt: 0.03, completion: 0.06 },
    'gpt-4-32k': { prompt: 0.06, completion: 0.12 },
    'gpt-3.5-turbo': { prompt: 0.0005, completion: 0.0015 },
    'gpt-3.5-turbo-16k': { prompt: 0.003, completion: 0.004 },
    'gpt-4o': { prompt: 0.005, completion: 0.015 },
    'gpt-4o-mini': { prompt: 0.00015, completion: 0.0006 },
  } as Record<string, { prompt: number; completion: number }>,
} as const;

// ============================================================================
// Type Exports
// ============================================================================

export type Config = typeof config;

// ============================================================================
// Validation Helper
// ============================================================================

/**
 * Validates that all required configuration is present
 * Call this during app initialization
 */
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check Supabase config
  if (!config.supabase.url) {
    errors.push('NEXT_PUBLIC_SUPABASE_URL is required');
  }
  if (!config.supabase.anonKey) {
    errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is required');
  }

  // Server-side only checks
  if (typeof window === 'undefined') {
    if (!config.openai.apiKey) {
      errors.push('OPENAI_API_KEY is required for server-side operations');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
