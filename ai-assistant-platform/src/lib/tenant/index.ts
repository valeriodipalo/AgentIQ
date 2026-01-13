/**
 * Tenant Configuration Loader
 * Loads and validates tenant-specific configuration
 */

import defaultConfig from '@/config/tenant.default.json';

// ============================================================================
// Types
// ============================================================================

export interface TenantBranding {
  primaryColor: string;
  accentColor: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  companyName: string;
}

export interface TenantLLMConfig {
  provider: 'openai' | 'anthropic' | 'azure';
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
}

export interface TenantFeatures {
  streaming: boolean;
  conversationHistory: boolean;
  feedback: boolean;
  fileUploads: boolean;
  codeExecution: boolean;
  webSearch: boolean;
}

export interface TenantLimits {
  rateLimit: {
    requestsPerMinute: number;
    tokensPerDay: number;
  };
  conversation: {
    maxMessages: number;
    maxMessageLength: number;
  };
}

export interface TenantUI {
  welcomeMessage: string;
  placeholderText: string;
  showPoweredBy: boolean;
}

export interface TenantConfig {
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
  branding: TenantBranding;
  llm: TenantLLMConfig;
  features: TenantFeatures;
  limits: TenantLimits;
  ui: TenantUI;
}

// ============================================================================
// Singleton Cache
// ============================================================================

let cachedConfig: TenantConfig | null = null;

// ============================================================================
// Configuration Loader
// ============================================================================

/**
 * Get the current tenant configuration
 * Loads from default config file, can be extended to load from database
 */
export function getTenantConfig(): TenantConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  // Start with default config
  const config = defaultConfig as TenantConfig;

  // Apply environment variable overrides
  const envOverrides = getEnvironmentOverrides();
  cachedConfig = mergeConfigs(config, envOverrides);

  return cachedConfig;
}

/**
 * Get environment variable overrides for tenant config
 */
function getEnvironmentOverrides(): Partial<TenantConfig> {
  const overrides: Partial<TenantConfig> = {};

  // Tenant identification
  const tenantSlug = process.env.TENANT_SLUG;
  if (tenantSlug) {
    overrides.tenant = {
      ...defaultConfig.tenant,
      slug: tenantSlug,
    };
  }

  // LLM configuration
  const openaiModel = process.env.OPENAI_MODEL;
  if (openaiModel) {
    overrides.llm = {
      ...(defaultConfig.llm as TenantLLMConfig),
      model: openaiModel,
    };
  }

  return overrides;
}

/**
 * Deep merge two config objects
 */
function mergeConfigs(
  base: TenantConfig,
  overrides: Partial<TenantConfig>
): TenantConfig {
  return {
    tenant: { ...base.tenant, ...overrides.tenant },
    branding: { ...base.branding, ...overrides.branding },
    llm: { ...base.llm, ...overrides.llm },
    features: { ...base.features, ...overrides.features },
    limits: {
      rateLimit: {
        ...base.limits.rateLimit,
        ...overrides.limits?.rateLimit,
      },
      conversation: {
        ...base.limits.conversation,
        ...overrides.limits?.conversation,
      },
    },
    ui: { ...base.ui, ...overrides.ui },
  };
}

/**
 * Validate tenant configuration
 */
export function validateTenantConfig(config: TenantConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate tenant info
  if (!config.tenant.id) errors.push('Tenant ID is required');
  if (!config.tenant.slug) errors.push('Tenant slug is required');

  // Validate LLM config
  if (!config.llm.provider) errors.push('LLM provider is required');
  if (!config.llm.model) errors.push('LLM model is required');
  if (config.llm.temperature < 0 || config.llm.temperature > 2) {
    errors.push('Temperature must be between 0 and 2');
  }
  if (config.llm.maxTokens < 1) {
    errors.push('Max tokens must be positive');
  }

  // Validate limits
  if (config.limits.rateLimit.requestsPerMinute < 1) {
    errors.push('Requests per minute must be positive');
  }
  if (config.limits.rateLimit.tokensPerDay < 1) {
    errors.push('Tokens per day must be positive');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Clear cached configuration (useful for testing)
 */
export function clearTenantConfigCache(): void {
  cachedConfig = null;
}
