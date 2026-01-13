/**
 * Usage Tracking Module
 * Handles token usage tracking and cost estimation for the AI platform
 */

import { config } from '@/lib/config';
import type { SupabaseServerClient } from '@/lib/supabase/server';

// ============================================================================
// Types
// ============================================================================

export interface UsageMetrics {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
  model: string;
}

export interface UsageTrackingParams {
  tenantId: string;
  userId: string;
  promptTokens: number;
  completionTokens: number;
  model: string;
}

export interface ModelPricing {
  prompt: number;  // Cost per 1000 tokens
  completion: number;  // Cost per 1000 tokens
}

// ============================================================================
// Pricing Data
// ============================================================================

/**
 * Model pricing lookup (per 1000 tokens in USD)
 * Sourced from OpenAI pricing page
 */
export const MODEL_PRICING: Record<string, ModelPricing> = {
  // GPT-4 Turbo
  'gpt-4-turbo-preview': { prompt: 0.01, completion: 0.03 },
  'gpt-4-turbo': { prompt: 0.01, completion: 0.03 },
  'gpt-4-1106-preview': { prompt: 0.01, completion: 0.03 },
  'gpt-4-0125-preview': { prompt: 0.01, completion: 0.03 },

  // GPT-4
  'gpt-4': { prompt: 0.03, completion: 0.06 },
  'gpt-4-0613': { prompt: 0.03, completion: 0.06 },
  'gpt-4-32k': { prompt: 0.06, completion: 0.12 },
  'gpt-4-32k-0613': { prompt: 0.06, completion: 0.12 },

  // GPT-4o
  'gpt-4o': { prompt: 0.005, completion: 0.015 },
  'gpt-4o-2024-05-13': { prompt: 0.005, completion: 0.015 },
  'gpt-4o-mini': { prompt: 0.00015, completion: 0.0006 },
  'gpt-4o-mini-2024-07-18': { prompt: 0.00015, completion: 0.0006 },

  // GPT-3.5 Turbo
  'gpt-3.5-turbo': { prompt: 0.0005, completion: 0.0015 },
  'gpt-3.5-turbo-0125': { prompt: 0.0005, completion: 0.0015 },
  'gpt-3.5-turbo-1106': { prompt: 0.001, completion: 0.002 },
  'gpt-3.5-turbo-16k': { prompt: 0.003, completion: 0.004 },

  // Default fallback
  'default': { prompt: 0.01, completion: 0.03 },
};

// ============================================================================
// Cost Calculation Functions
// ============================================================================

/**
 * Get pricing for a specific model
 */
export function getModelPricing(model: string): ModelPricing {
  return MODEL_PRICING[model] || MODEL_PRICING['default'];
}

/**
 * Calculate estimated cost for token usage
 */
export function calculateEstimatedCost(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const pricing = getModelPricing(model);
  const promptCost = (promptTokens / 1000) * pricing.prompt;
  const completionCost = (completionTokens / 1000) * pricing.completion;
  return Math.round((promptCost + completionCost) * 1000000) / 1000000; // Round to 6 decimal places
}

/**
 * Calculate usage metrics from token counts
 */
export function calculateUsageMetrics(
  model: string,
  promptTokens: number,
  completionTokens: number
): UsageMetrics {
  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    estimatedCost: calculateEstimatedCost(model, promptTokens, completionTokens),
    model,
  };
}

// ============================================================================
// Database Usage Tracking
// ============================================================================

/**
 * Track usage metrics in the database via Supabase function
 * This function is designed to be non-blocking and fail gracefully
 * TODO: Implement usage_metrics table and increment_usage_metrics RPC function
 */
export async function trackUsageMetrics(
  _supabase: SupabaseServerClient,
  params: UsageTrackingParams
): Promise<{ success: boolean; error?: string }> {
  const { promptTokens, completionTokens, model } = params;
  const estimatedCost = calculateEstimatedCost(model, promptTokens, completionTokens);

  // Usage metrics table not yet implemented - just log for now
  console.log('Usage metrics (not persisted):', {
    promptTokens,
    completionTokens,
    model,
    estimatedCost,
  });

  return { success: true };
}

/**
 * Track usage metrics asynchronously (fire and forget)
 * Use this when you don't need to wait for the tracking to complete
 */
export function trackUsageMetricsAsync(
  supabase: SupabaseServerClient,
  params: UsageTrackingParams
): void {
  trackUsageMetrics(supabase, params).catch((err) => {
    console.error('Async usage tracking failed:', err);
  });
}

// ============================================================================
// Token Estimation
// ============================================================================

/**
 * Rough estimation of token count from text
 * For accurate counts, use tiktoken library
 *
 * General rules of thumb:
 * - 1 token ~= 4 characters for English
 * - 1 token ~= 3/4 of a word
 * - 100 tokens ~= 75 words
 */
export function estimateTokenCount(text: string): number {
  if (!text) return 0;

  // Count words and characters
  const words = text.split(/\s+/).filter(Boolean).length;
  const chars = text.length;

  // Use average of character-based and word-based estimates
  const charBasedEstimate = Math.ceil(chars / 4);
  const wordBasedEstimate = Math.ceil(words * 1.33);

  return Math.ceil((charBasedEstimate + wordBasedEstimate) / 2);
}

/**
 * Estimate tokens for a conversation message array
 */
export function estimateConversationTokens(
  messages: Array<{ role: string; content: string }>
): number {
  let totalTokens = 0;

  for (const message of messages) {
    // Each message has overhead for formatting (~4 tokens per message)
    totalTokens += 4;
    totalTokens += estimateTokenCount(message.content);
    // Role token
    totalTokens += 1;
  }

  // Priming tokens (roughly 3 tokens)
  totalTokens += 3;

  return totalTokens;
}

// ============================================================================
// Usage Reporting Types
// ============================================================================

export interface DailyUsageReport {
  date: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  totalCost: number;
  requestCount: number;
  modelBreakdown: Record<string, {
    tokens: number;
    cost: number;
    requests: number;
  }>;
}

export interface UsageSummary {
  period: {
    start: string;
    end: string;
  };
  totals: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    totalCost: number;
    requestCount: number;
  };
  averages: {
    tokensPerRequest: number;
    costPerRequest: number;
    requestsPerDay: number;
  };
  topModels: Array<{
    model: string;
    tokens: number;
    cost: number;
    percentage: number;
  }>;
}
