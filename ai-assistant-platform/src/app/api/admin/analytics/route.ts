/**
 * Admin Analytics API Route
 * Returns usage statistics for the admin dashboard
 * Supports filtering by company_id for company-specific analytics
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import type { APIError } from '@/types';

/**
 * Validate UUID format
 */
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Analytics response structure
 */
interface AnalyticsResponse {
  conversations: {
    total: number;
    active: number;
    archived: number;
  };
  messages: {
    total: number;
    user_messages: number;
    assistant_messages: number;
  };
  feedback: {
    total: number;
    positive: number;
    negative: number;
    positive_rate: number;
  };
  chatbots: {
    total: number;
    published: number;
    unpublished: number;
  };
  users: {
    total: number;
  };
  period: {
    start_date: string | null;
    end_date: string | null;
  };
  demo_mode: boolean;
}

/**
 * Parse and validate date string
 */
function parseDate(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * GET /api/admin/analytics
 * Returns usage statistics across all companies or filtered by company_id
 *
 * Query Parameters:
 * - company_id: Filter by specific company (optional)
 * - start_date: Filter from date (optional)
 * - end_date: Filter to date (optional)
 */
export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');
    const startDateStr = searchParams.get('start_date');
    const endDateStr = searchParams.get('end_date');

    const startDate = parseDate(startDateStr);
    const endDate = parseDate(endDateStr);

    // Validate company_id if provided
    if (companyId && !isValidUUID(companyId)) {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid company_id format',
        },
        { status: 400 }
      );
    }

    // Validate date range
    if (startDate && endDate && startDate > endDate) {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: 'start_date must be before or equal to end_date',
        },
        { status: 400 }
      );
    }

    // This app uses localStorage sessions, NOT Supabase Auth
    // Use admin client directly to bypass RLS (avoid auth.getUser() which can hang)
    let supabase;
    try {
      supabase = createAdminClient();
    } catch (error) {
      console.error('Failed to create admin client:', error);
      return NextResponse.json<APIError>(
        {
          code: 'CONFIG_ERROR',
          message: 'Server configuration error',
        },
        { status: 500 }
      );
    }
    // Not demo mode - we're querying real data from the database
    const isDemoMode = false;

    // Build date filter for queries
    const buildDateFilter = (query: ReturnType<typeof supabase.from>, dateColumn: string = 'created_at') => {
      let filteredQuery = query;
      if (startDate) {
        filteredQuery = filteredQuery.gte(dateColumn, startDate.toISOString());
      }
      if (endDate) {
        // Add one day to include the entire end date
        const endOfDay = new Date(endDate);
        endOfDay.setDate(endOfDay.getDate() + 1);
        filteredQuery = filteredQuery.lt(dateColumn, endOfDay.toISOString());
      }
      return filteredQuery;
    };

    // Fetch conversation stats - filter by company if specified, otherwise all
    let conversationsQuery = supabase
      .from('conversations')
      .select('id, is_archived', { count: 'exact' });

    if (companyId) {
      conversationsQuery = conversationsQuery.eq('tenant_id', companyId);
    }

    const { data: conversations, count: totalConversations } = await buildDateFilter(conversationsQuery);

    const activeConversations = conversations?.filter((c: { is_archived: boolean }) => !c.is_archived).length || 0;
    const archivedConversations = conversations?.filter((c: { is_archived: boolean }) => c.is_archived).length || 0;

    // Fetch message stats - need to join through conversations
    // First get conversation IDs (filtered by company if specified)
    let convQuery = supabase.from('conversations').select('id');
    if (companyId) {
      convQuery = convQuery.eq('tenant_id', companyId);
    }
    const { data: filteredConversations } = await convQuery;

    const conversationIds = filteredConversations?.map(c => c.id) || [];

    let totalMessages = 0;
    let userMessages = 0;
    let assistantMessages = 0;

    if (conversationIds.length > 0) {
      let messagesQuery = supabase
        .from('messages')
        .select('id, role', { count: 'exact' })
        .in('conversation_id', conversationIds);

      messagesQuery = buildDateFilter(messagesQuery);
      const { data: messages, count } = await messagesQuery;

      totalMessages = count || 0;
      userMessages = messages?.filter(m => m.role === 'user').length || 0;
      assistantMessages = messages?.filter(m => m.role === 'assistant').length || 0;
    }

    // Fetch feedback stats
    let totalFeedback = 0;
    let positiveFeedback = 0;
    let negativeFeedback = 0;

    // Get user IDs (filtered by company if specified)
    let usersQuery = supabase.from('users').select('id');
    if (companyId) {
      usersQuery = usersQuery.eq('tenant_id', companyId);
    }
    const { data: filteredUsers } = await usersQuery;

    const userIds = filteredUsers?.map(u => u.id) || [];

    if (userIds.length > 0) {
      let feedbackQuery = supabase
        .from('feedback')
        .select('id, rating', { count: 'exact' })
        .in('user_id', userIds);

      feedbackQuery = buildDateFilter(feedbackQuery);
      const { data: feedbackData, count } = await feedbackQuery;

      totalFeedback = count || 0;
      positiveFeedback = feedbackData?.filter(f => f.rating === 1).length || 0;
      negativeFeedback = feedbackData?.filter(f => f.rating === -1).length || 0;
    }

    const positiveRate = totalFeedback > 0
      ? Math.round((positiveFeedback / totalFeedback) * 100)
      : 0;

    // Fetch chatbot stats - filter by company if specified
    let chatbotsQuery = supabase
      .from('chatbots')
      .select('id, is_published', { count: 'exact' });

    if (companyId) {
      chatbotsQuery = chatbotsQuery.eq('tenant_id', companyId);
    }

    chatbotsQuery = buildDateFilter(chatbotsQuery);
    const { data: chatbots, count: totalChatbots } = await chatbotsQuery;

    const publishedChatbots = chatbots?.filter(c => c.is_published).length || 0;
    const unpublishedChatbots = chatbots?.filter(c => !c.is_published).length || 0;

    // Fetch user count - filter by company if specified
    let userCountQuery = supabase
      .from('users')
      .select('id', { count: 'exact', head: true });

    if (companyId) {
      userCountQuery = userCountQuery.eq('tenant_id', companyId);
    }
    const { count: totalUsers } = await userCountQuery;

    // Build response
    const response: AnalyticsResponse = {
      conversations: {
        total: totalConversations || 0,
        active: activeConversations,
        archived: archivedConversations,
      },
      messages: {
        total: totalMessages,
        user_messages: userMessages,
        assistant_messages: assistantMessages,
      },
      feedback: {
        total: totalFeedback,
        positive: positiveFeedback,
        negative: negativeFeedback,
        positive_rate: positiveRate,
      },
      chatbots: {
        total: totalChatbots || 0,
        published: publishedChatbots,
        unpublished: unpublishedChatbots,
      },
      users: {
        total: totalUsers || 0,
      },
      period: {
        start_date: startDate?.toISOString() || null,
        end_date: endDate?.toISOString() || null,
      },
      demo_mode: isDemoMode,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Admin analytics API error:', error);
    return NextResponse.json<APIError>(
      {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
