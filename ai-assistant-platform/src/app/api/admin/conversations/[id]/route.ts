/**
 * Single Conversation API Route
 * Handles fetching detailed conversation data including messages and feedback
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import type { APIError } from '@/types';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * Message with feedback
 */
interface MessageWithFeedback {
  id: string;
  role: string;
  content: string;
  created_at: string;
  token_count: number | null;
  latency_ms: number | null;
  model_used: string | null;
  feedback: {
    id: string;
    rating: number;
    notes: string | null;
    created_at: string;
  } | null;
}

/**
 * Detailed conversation response
 */
interface ConversationDetailResponse {
  conversation: {
    id: string;
    title: string;
    created_at: string;
    updated_at: string;
    is_archived: boolean;
    metadata: Record<string, unknown> | null;
    company: {
      id: string;
      name: string;
      slug: string;
    } | null;
    user: {
      id: string;
      email: string;
      name: string | null;
    } | null;
    chatbot: {
      id: string;
      name: string;
      model: string;
      description: string | null;
    } | null;
    messages: MessageWithFeedback[];
    feedback_summary: {
      positive: number;
      negative: number;
      total: number;
    };
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
 * GET /api/admin/conversations/[id]
 * Fetches a single conversation with full details
 *
 * Returns:
 * - Conversation metadata
 * - Company (tenant) information
 * - User information
 * - Chatbot configuration
 * - All messages with feedback
 * - Aggregated feedback summary
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: conversationId } = await params;

    // Validate conversation ID
    if (!conversationId) {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: 'Conversation ID is required',
        },
        { status: 400 }
      );
    }

    if (!isValidUUID(conversationId)) {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid conversation ID format',
        },
        { status: 400 }
      );
    }

    // Get Supabase client and check authentication
    const authClient = await createServerClient();
    const { data: { user } } = await authClient.auth.getUser();

    // Demo mode: use admin client to bypass RLS
    const isDemoMode = !user;

    // Use admin client in demo mode
    const supabase = isDemoMode ? createAdminClient() : authClient;

    // In authenticated mode, get user's tenant for authorization
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
      console.log('Admin conversation detail API: Using demo mode with admin client');
    }

    // Fetch the conversation
    let conversationQuery = supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId);

    // In authenticated mode, verify tenant access
    if (!isDemoMode && effectiveTenantId) {
      conversationQuery = conversationQuery.eq('tenant_id', effectiveTenantId);
    }

    const { data: conversation, error: conversationError } = await conversationQuery.single();

    if (conversationError || !conversation) {
      return NextResponse.json<APIError>(
        {
          code: 'NOT_FOUND',
          message: 'Conversation not found or access denied',
        },
        { status: 404 }
      );
    }

    // Fetch related entities in parallel
    const [tenantResult, userResult, chatbotResult, messagesResult] = await Promise.all([
      // Fetch tenant (company)
      supabase
        .from('tenants')
        .select('id, name, slug')
        .eq('id', conversation.tenant_id)
        .single(),

      // Fetch user
      supabase
        .from('users')
        .select('id, email, name')
        .eq('id', conversation.user_id)
        .single(),

      // Fetch chatbot (if exists)
      conversation.chatbot_id
        ? supabase
            .from('chatbots')
            .select('id, name, model, description')
            .eq('id', conversation.chatbot_id)
            .single()
        : Promise.resolve({ data: null, error: null }),

      // Fetch all messages for the conversation
      supabase
        .from('messages')
        .select('id, role, content, created_at, token_count, latency_ms, model_used')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true }),
    ]);

    // Get message IDs for feedback lookup
    const messages = messagesResult.data || [];
    const messageIds = messages.map(m => m.id);

    // Fetch feedback for all messages
    let feedbackData: { id: string; message_id: string; rating: number; notes: string | null; created_at: string }[] = [];
    if (messageIds.length > 0) {
      const { data: feedback } = await supabase
        .from('feedback')
        .select('id, message_id, rating, notes, created_at')
        .in('message_id', messageIds);
      feedbackData = feedback || [];
    }

    // Create feedback lookup map (message_id -> feedback)
    const feedbackMap = new Map(
      feedbackData.map(f => [f.message_id, {
        id: f.id,
        rating: f.rating,
        notes: f.notes,
        created_at: f.created_at,
      }])
    );

    // Build messages with feedback
    const messagesWithFeedback: MessageWithFeedback[] = messages.map(m => ({
      id: m.id,
      role: m.role,
      content: m.content,
      created_at: m.created_at,
      token_count: m.token_count,
      latency_ms: m.latency_ms,
      model_used: m.model_used,
      feedback: feedbackMap.get(m.id) || null,
    }));

    // Calculate feedback summary
    const feedbackSummary = feedbackData.reduce(
      (acc, f) => {
        acc.total += 1;
        if (f.rating === 1) {
          acc.positive += 1;
        } else if (f.rating === -1) {
          acc.negative += 1;
        }
        return acc;
      },
      { positive: 0, negative: 0, total: 0 }
    );

    // Build response
    const response: ConversationDetailResponse = {
      conversation: {
        id: conversation.id,
        title: conversation.title,
        created_at: conversation.created_at,
        updated_at: conversation.updated_at,
        is_archived: conversation.is_archived,
        metadata: conversation.metadata as Record<string, unknown> | null,
        company: tenantResult.data
          ? {
              id: tenantResult.data.id,
              name: tenantResult.data.name,
              slug: tenantResult.data.slug,
            }
          : null,
        user: userResult.data
          ? {
              id: userResult.data.id,
              email: userResult.data.email,
              name: userResult.data.name,
            }
          : null,
        chatbot: chatbotResult.data
          ? {
              id: chatbotResult.data.id,
              name: chatbotResult.data.name,
              model: chatbotResult.data.model,
              description: chatbotResult.data.description,
            }
          : null,
        messages: messagesWithFeedback,
        feedback_summary: feedbackSummary,
      },
      demo_mode: isDemoMode,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Admin conversation detail API error:', error);
    return NextResponse.json<APIError>(
      {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
