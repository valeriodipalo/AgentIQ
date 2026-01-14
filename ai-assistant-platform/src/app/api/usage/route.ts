/**
 * Usage API Route
 * Provides usage statistics and metrics for the authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import type { APIError } from '@/types';

// Demo user ID for session-based auth
const DEMO_USER_ID = '00000000-0000-0000-0000-000000000002';

/**
 * GET /api/usage
 * Fetches usage statistics for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date') || getDefaultStartDate();
    const endDate = searchParams.get('end_date') || new Date().toISOString().split('T')[0];
    const groupBy = searchParams.get('group_by') || 'day'; // day, week, month

    // Validate dates
    if (!isValidDate(startDate) || !isValidDate(endDate)) {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid date format. Use YYYY-MM-DD.',
        },
        { status: 400 }
      );
    }

    if (new Date(startDate) > new Date(endDate)) {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: 'start_date must be before or equal to end_date.',
        },
        { status: 400 }
      );
    }

    // Validate group_by
    if (!['day', 'week', 'month'].includes(groupBy)) {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: 'group_by must be one of: day, week, month.',
        },
        { status: 400 }
      );
    }

    // This app uses localStorage sessions, NOT Supabase Auth
    // Use admin client directly to bypass RLS
    let supabase;
    try {
      supabase = createAdminClient();
    } catch (error) {
      console.error('Failed to create admin client:', error);
      return NextResponse.json<APIError>(
        { code: 'CONFIG_ERROR', message: 'Server configuration error' },
        { status: 500 }
      );
    }
    console.log('Usage API: Using admin client with demo user');

    // Usage metrics table not yet implemented - return empty usage data
    // TODO: Create usage_metrics table and increment_usage_metrics function
    return formatUsageResponse([], startDate, endDate, groupBy);
  } catch (error) {
    console.error('Usage API error:', error);
    return NextResponse.json<APIError>(
      {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

/**
 * Helper to get default start date (30 days ago)
 */
function getDefaultStartDate(): string {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString().split('T')[0];
}

/**
 * Helper to validate date format
 */
function isValidDate(dateString: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * Format usage response with aggregations
 */
function formatUsageResponse(
  usage: Array<{
    date: string;
    model: string;
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens?: number;
    estimated_cost: number;
    request_count: number;
  }>,
  startDate: string,
  endDate: string,
  groupBy: string
): NextResponse {
  // Calculate totals
  const totals = {
    prompt_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0,
    estimated_cost: 0,
    request_count: 0,
  };

  const modelBreakdown: Record<string, {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    estimated_cost: number;
    request_count: number;
  }> = {};

  const dailyData: Record<string, {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    estimated_cost: number;
    request_count: number;
  }> = {};

  for (const record of usage) {
    const promptTokens = record.prompt_tokens || 0;
    const completionTokens = record.completion_tokens || 0;
    const totalTokens = record.total_tokens || (promptTokens + completionTokens);
    const cost = parseFloat(String(record.estimated_cost)) || 0;
    const requests = record.request_count || 0;

    // Update totals
    totals.prompt_tokens += promptTokens;
    totals.completion_tokens += completionTokens;
    totals.total_tokens += totalTokens;
    totals.estimated_cost += cost;
    totals.request_count += requests;

    // Update model breakdown
    const model = record.model || 'unknown';
    if (!modelBreakdown[model]) {
      modelBreakdown[model] = {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
        estimated_cost: 0,
        request_count: 0,
      };
    }
    modelBreakdown[model].prompt_tokens += promptTokens;
    modelBreakdown[model].completion_tokens += completionTokens;
    modelBreakdown[model].total_tokens += totalTokens;
    modelBreakdown[model].estimated_cost += cost;
    modelBreakdown[model].request_count += requests;

    // Update daily data
    const dateKey = getGroupKey(record.date, groupBy);
    if (!dailyData[dateKey]) {
      dailyData[dateKey] = {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
        estimated_cost: 0,
        request_count: 0,
      };
    }
    dailyData[dateKey].prompt_tokens += promptTokens;
    dailyData[dateKey].completion_tokens += completionTokens;
    dailyData[dateKey].total_tokens += totalTokens;
    dailyData[dateKey].estimated_cost += cost;
    dailyData[dateKey].request_count += requests;
  }

  // Round cost totals
  totals.estimated_cost = Math.round(totals.estimated_cost * 1000000) / 1000000;
  for (const model of Object.keys(modelBreakdown)) {
    modelBreakdown[model].estimated_cost = Math.round(modelBreakdown[model].estimated_cost * 1000000) / 1000000;
  }
  for (const date of Object.keys(dailyData)) {
    dailyData[date].estimated_cost = Math.round(dailyData[date].estimated_cost * 1000000) / 1000000;
  }

  // Convert daily data to sorted array
  const timeline = Object.entries(dailyData)
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Calculate averages
  const numDays = Object.keys(dailyData).length || 1;
  const averages = {
    tokens_per_request: totals.request_count > 0
      ? Math.round(totals.total_tokens / totals.request_count)
      : 0,
    cost_per_request: totals.request_count > 0
      ? Math.round((totals.estimated_cost / totals.request_count) * 1000000) / 1000000
      : 0,
    requests_per_day: Math.round((totals.request_count / numDays) * 100) / 100,
    tokens_per_day: Math.round(totals.total_tokens / numDays),
  };

  // Convert model breakdown to sorted array
  const modelStats = Object.entries(modelBreakdown)
    .map(([model, data]) => ({
      model,
      ...data,
      percentage: totals.total_tokens > 0
        ? Math.round((data.total_tokens / totals.total_tokens) * 10000) / 100
        : 0,
    }))
    .sort((a, b) => b.total_tokens - a.total_tokens);

  return NextResponse.json({
    period: {
      start: startDate,
      end: endDate,
      group_by: groupBy,
    },
    totals,
    averages,
    models: modelStats,
    timeline,
  });
}

/**
 * Get group key based on groupBy parameter
 */
function getGroupKey(dateStr: string, groupBy: string): string {
  const date = new Date(dateStr);

  switch (groupBy) {
    case 'week': {
      // Get the Monday of the week
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(date.setDate(diff));
      return monday.toISOString().split('T')[0];
    }
    case 'month':
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
    default:
      return dateStr;
  }
}
