/**
 * Admin Analytics API Route
 * Returns usage statistics for the admin dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import type { APIError } from '@/types';

// Demo mode constants
const DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000001';

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
 * Get user's tenant ID from their profile
 */
async function getUserTenantId(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  userId: string
): Promise<string | null> {
  const { data: userProfile, error } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', userId)
    .single();

  if (error || !userProfile) {
    console.warn('User profile not found');
    return null;
  }

  return userProfile.tenant_id;
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
 * Returns usage statistics for the tenant
 */
export async function GET(request: NextRequest) {
  try {
    // Get query parameters for date filtering
    const { searchParams } = new URL(request.url);
    const startDateStr = searchParams.get('start_date');
    const endDateStr = searchParams.get('end_date');

    const startDate = parseDate(startDateStr);
    const endDate = parseDate(endDateStr);

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

    // Get Supabase client and check authentication
    const authClient = await createServerClient();
    const { data: { user } } = await authClient.auth.getUser();

    // Demo mode: use demo tenant and admin client to bypass RLS
    const isDemoMode = !user;
    let tenantId: string | null = null;

    // Use admin client in demo mode to bypass RLS policies
    const supabase = isDemoMode ? createAdminClient() : authClient;

    if (user) {
      tenantId = await getUserTenantId(supabase, user.id);
    } else {
      tenantId = DEMO_TENANT_ID;
      console.log('Admin analytics API: Using demo mode with admin client');
    }

    if (!tenantId) {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: 'User tenant not configured',
        },
        { status: 400 }
      );
    }

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

    // Fetch conversation stats
    const conversationsQuery = supabase
      .from('conversations')
      .select('id, is_archived', { count: 'exact' })
      .eq('tenant_id', tenantId);

    const { data: conversations, count: totalConversations } = await buildDateFilter(conversationsQuery);

    const activeConversations = conversations?.filter((c: { is_archived: boolean }) => !c.is_archived).length || 0;
    const archivedConversations = conversations?.filter((c: { is_archived: boolean }) => c.is_archived).length || 0;

    // Fetch message stats - need to join through conversations
    // First get conversation IDs for the tenant
    const { data: tenantConversations } = await supabase
      .from('conversations')
      .select('id')
      .eq('tenant_id', tenantId);

    const conversationIds = tenantConversations?.map(c => c.id) || [];

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

    // Get user IDs for the tenant
    const { data: tenantUsers } = await supabase
      .from('users')
      .select('id')
      .eq('tenant_id', tenantId);

    const userIds = tenantUsers?.map(u => u.id) || [];

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

    // Fetch chatbot stats
    let chatbotsQuery = supabase
      .from('chatbots')
      .select('id, is_published', { count: 'exact' })
      .eq('tenant_id', tenantId);

    chatbotsQuery = buildDateFilter(chatbotsQuery);
    const { data: chatbots, count: totalChatbots } = await chatbotsQuery;

    const publishedChatbots = chatbots?.filter(c => c.is_published).length || 0;
    const unpublishedChatbots = chatbots?.filter(c => !c.is_published).length || 0;

    // Fetch user count
    const { count: totalUsers } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

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
