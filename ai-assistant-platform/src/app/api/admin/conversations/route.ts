/**
 * Admin Conversations API Route
 * Handles listing conversations with filters for admin users
 * Supports cross-tenant queries using admin client in demo mode
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import type { APIError } from '@/types';

/**
 * Conversation with related entities
 */
interface ConversationWithRelations {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
  company: {
    id: string;
    name: string;
  } | null;
  user: {
    id: string;
    email: string;
    name: string | null;
  } | null;
  chatbot: {
    id: string;
    name: string;
  } | null;
  message_count: number;
  feedback_summary: {
    positive: number;
    negative: number;
    total: number;
  };
}

/**
 * List response structure
 */
interface ConversationListResponse {
  conversations: ConversationWithRelations[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
  demo_mode: boolean;
}

/**
 * Validate UUID format
 */
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Parse boolean query parameter
 */
function parseBoolean(value: string | null): boolean | null {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return null;
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
 * GET /api/admin/conversations
 * Lists all conversations with filters
 *
 * Query Parameters:
 * - company_id: Filter by tenant (company)
 * - chatbot_id: Filter by chatbot/agent
 * - user_id: Filter by user
 * - search: Search in conversation title
 * - has_feedback: Filter conversations with/without feedback (true/false)
 * - page: Page number (default: 1)
 * - per_page: Items per page (default: 20, max: 100)
 * - sort_by: Sort field (created_at, updated_at) (default: created_at)
 * - sort_order: Sort direction (asc, desc) (default: desc)
 */
export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');
    const chatbotId = searchParams.get('chatbot_id');
    const userId = searchParams.get('user_id');
    const search = searchParams.get('search')?.trim();
    const hasFeedback = parseBoolean(searchParams.get('has_feedback'));
    const page = parseInt(searchParams.get('page') || '1', 10);
    const perPage = parseInt(searchParams.get('per_page') || '20', 10);
    const sortBy = searchParams.get('sort_by') || 'created_at';
    const sortOrder = searchParams.get('sort_order') || 'desc';

    // Validate pagination
    if (page < 1 || perPage < 1 || perPage > 100) {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid pagination parameters. Page must be >= 1, per_page must be between 1 and 100.',
        },
        { status: 400 }
      );
    }

    // Validate sort parameters
    const validSortFields = ['created_at', 'updated_at'];
    if (!validSortFields.includes(sortBy)) {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: `Invalid sort_by parameter. Must be one of: ${validSortFields.join(', ')}`,
        },
        { status: 400 }
      );
    }

    if (!['asc', 'desc'].includes(sortOrder)) {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid sort_order parameter. Must be asc or desc.',
        },
        { status: 400 }
      );
    }

    // Validate UUID parameters if provided
    if (companyId && !isValidUUID(companyId)) {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid company_id format',
        },
        { status: 400 }
      );
    }

    if (chatbotId && !isValidUUID(chatbotId)) {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid chatbot_id format',
        },
        { status: 400 }
      );
    }

    if (userId && !isValidUUID(userId)) {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid user_id format',
        },
        { status: 400 }
      );
    }

    // Get Supabase client and check authentication
    const authClient = await createServerClient();
    const { data: { user } } = await authClient.auth.getUser();

    // Demo mode: use admin client to bypass RLS
    const isDemoMode = !user;

    // Use admin client in demo mode to query across all data
    const supabase = isDemoMode ? createAdminClient() : authClient;

    // In demo mode, if no company_id filter is provided, default to demo tenant
    // In authenticated mode, get user's tenant for filtering
    let effectiveTenantId: string | null = null;

    if (!isDemoMode && user) {
      effectiveTenantId = await getUserTenantId(supabase, user.id);
      if (!effectiveTenantId) {
        return NextResponse.json<APIError>(
          {
            code: 'VALIDATION_ERROR',
            message: 'User tenant not configured',
          },
          { status: 400 }
        );
      }
    }

    if (isDemoMode) {
      console.log('Admin conversations API: Using demo mode with admin client');
    }

    // Calculate offset for pagination
    const offset = (page - 1) * perPage;

    // Build base query for conversations
    let query = supabase
      .from('conversations')
      .select('*', { count: 'exact' })
      .order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply filters
    // In authenticated mode, always filter by user's tenant
    if (!isDemoMode && effectiveTenantId) {
      query = query.eq('tenant_id', effectiveTenantId);
    } else if (companyId) {
      // In demo mode, filter by company_id if provided
      query = query.eq('tenant_id', companyId);
    }

    if (chatbotId) {
      query = query.eq('chatbot_id', chatbotId);
    }

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (search) {
      query = query.ilike('title', `%${search}%`);
    }

    // Execute query with pagination
    const { data: conversations, error: queryError, count } = await query
      .range(offset, offset + perPage - 1);

    if (queryError) {
      console.error('Error fetching conversations:', queryError);
      return NextResponse.json<APIError>(
        {
          code: 'SUPABASE_ERROR',
          message: 'Error fetching conversations',
          details: { error: queryError.message },
        },
        { status: 500 }
      );
    }

    if (!conversations || conversations.length === 0) {
      return NextResponse.json<ConversationListResponse>({
        conversations: [],
        pagination: {
          page,
          per_page: perPage,
          total: 0,
          total_pages: 0,
        },
        demo_mode: isDemoMode,
      });
    }

    // Get unique IDs for batch lookups
    const conversationIds = conversations.map(c => c.id);
    const tenantIds = [...new Set(conversations.map(c => c.tenant_id))];
    const userIds = [...new Set(conversations.map(c => c.user_id))];
    const chatbotIds = [...new Set(conversations.filter(c => c.chatbot_id).map(c => c.chatbot_id as string))];

    // Batch fetch related entities
    const [tenantsResult, usersResult, chatbotsResult, messagesResult, feedbackResult] = await Promise.all([
      // Fetch tenants
      supabase
        .from('tenants')
        .select('id, name')
        .in('id', tenantIds),

      // Fetch users
      supabase
        .from('users')
        .select('id, email, name')
        .in('id', userIds),

      // Fetch chatbots (only if there are any)
      chatbotIds.length > 0
        ? supabase
            .from('chatbots')
            .select('id, name')
            .in('id', chatbotIds)
        : Promise.resolve({ data: [], error: null }),

      // Fetch message counts per conversation
      supabase
        .from('messages')
        .select('conversation_id')
        .in('conversation_id', conversationIds),

      // Fetch feedback through messages
      supabase
        .from('messages')
        .select('id, conversation_id')
        .in('conversation_id', conversationIds),
    ]);

    // Create lookup maps
    const tenantsMap = new Map(
      (tenantsResult.data || []).map(t => [t.id, { id: t.id, name: t.name }])
    );
    const usersMap = new Map(
      (usersResult.data || []).map(u => [u.id, { id: u.id, email: u.email, name: u.name }])
    );
    const chatbotsMap = new Map(
      (chatbotsResult.data || []).map(c => [c.id, { id: c.id, name: c.name }])
    );

    // Count messages per conversation
    const messageCounts = new Map<string, number>();
    (messagesResult.data || []).forEach(m => {
      const count = messageCounts.get(m.conversation_id) || 0;
      messageCounts.set(m.conversation_id, count + 1);
    });

    // Get message IDs to fetch feedback
    const messageIds = (feedbackResult.data || []).map(m => m.id);
    const messageToConversation = new Map(
      (feedbackResult.data || []).map(m => [m.id, m.conversation_id])
    );

    // Fetch feedback for all messages
    let feedbackData: { message_id: string; rating: number }[] = [];
    if (messageIds.length > 0) {
      const { data: feedback } = await supabase
        .from('feedback')
        .select('message_id, rating')
        .in('message_id', messageIds);
      feedbackData = feedback || [];
    }

    // Aggregate feedback per conversation
    const feedbackSummary = new Map<string, { positive: number; negative: number; total: number }>();
    feedbackData.forEach(f => {
      const conversationId = messageToConversation.get(f.message_id);
      if (conversationId) {
        const current = feedbackSummary.get(conversationId) || { positive: 0, negative: 0, total: 0 };
        current.total += 1;
        if (f.rating === 1) {
          current.positive += 1;
        } else if (f.rating === -1) {
          current.negative += 1;
        }
        feedbackSummary.set(conversationId, current);
      }
    });

    // Filter by has_feedback if specified
    let filteredConversations = conversations;
    if (hasFeedback !== null) {
      filteredConversations = conversations.filter(c => {
        const summary = feedbackSummary.get(c.id);
        const hasFb = summary && summary.total > 0;
        return hasFeedback ? hasFb : !hasFb;
      });
    }

    // Build enriched response
    const enrichedConversations: ConversationWithRelations[] = filteredConversations.map(c => ({
      id: c.id,
      title: c.title,
      created_at: c.created_at,
      updated_at: c.updated_at,
      is_archived: c.is_archived,
      company: tenantsMap.get(c.tenant_id) || null,
      user: usersMap.get(c.user_id) || null,
      chatbot: c.chatbot_id ? chatbotsMap.get(c.chatbot_id) || null : null,
      message_count: messageCounts.get(c.id) || 0,
      feedback_summary: feedbackSummary.get(c.id) || { positive: 0, negative: 0, total: 0 },
    }));

    // Calculate total (accounting for has_feedback filter applied in memory)
    const totalCount = hasFeedback !== null ? enrichedConversations.length : (count || 0);
    const totalPages = Math.ceil(totalCount / perPage);

    return NextResponse.json<ConversationListResponse>({
      conversations: enrichedConversations,
      pagination: {
        page,
        per_page: perPage,
        total: totalCount,
        total_pages: totalPages,
      },
      demo_mode: isDemoMode,
    });
  } catch (error) {
    console.error('Admin conversations API error:', error);
    return NextResponse.json<APIError>(
      {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
