/**
 * Company Stats API Route
 * Returns detailed statistics for a specific company
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
 * Conversations by agent stat
 */
interface ConversationsByAgent {
  chatbot_id: string;
  name: string;
  count: number;
}

/**
 * Conversations by user stat
 */
interface ConversationsByUser {
  user_id: string;
  email: string;
  count: number;
}

/**
 * Recent conversation info
 */
interface RecentConversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
  chatbot: {
    id: string;
    name: string;
  } | null;
  message_count: number;
}

/**
 * Stats response structure
 */
interface StatsResponse {
  company: {
    id: string;
    name: string;
    slug: string;
  };
  conversations_by_agent: ConversationsByAgent[];
  conversations_by_user: ConversationsByUser[];
  feedback_summary: {
    positive: number;
    negative: number;
    total: number;
    rate: number;
  };
  recent_conversations: RecentConversation[];
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
 * GET /api/admin/companies/[id]/stats
 * Returns detailed stats for a company
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: companyId } = await params;

    if (!companyId) {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: 'Company ID is required',
        },
        { status: 400 }
      );
    }

    if (!isValidUUID(companyId)) {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid company ID format',
        },
        { status: 400 }
      );
    }

    // Get Supabase client and check authentication
    const authClient = await createServerClient();
    const { data: { user } } = await authClient.auth.getUser();

    // Demo mode: use admin client to bypass RLS
    const isDemoMode = !user;
    const supabase = isDemoMode ? createAdminClient() : authClient;

    if (isDemoMode) {
      console.log('Admin company stats API: Using demo mode');
    }

    // Verify company exists
    const { data: company, error: companyError } = await supabase
      .from('tenants')
      .select('id, name, slug')
      .eq('id', companyId)
      .single();

    if (companyError || !company) {
      return NextResponse.json<APIError>(
        {
          code: 'NOT_FOUND',
          message: 'Company not found',
        },
        { status: 404 }
      );
    }

    // Get conversations by agent (chatbot)
    const { data: conversations } = await supabase
      .from('conversations')
      .select('id, chatbot_id, user_id')
      .eq('tenant_id', companyId);

    // Get chatbots for this company
    const { data: chatbots } = await supabase
      .from('chatbots')
      .select('id, name')
      .eq('tenant_id', companyId);

    const chatbotMap = new Map(chatbots?.map(c => [c.id, c.name]) || []);

    // Calculate conversations by agent
    const agentCounts = new Map<string, number>();
    (conversations || []).forEach(conv => {
      if (conv.chatbot_id) {
        agentCounts.set(conv.chatbot_id, (agentCounts.get(conv.chatbot_id) || 0) + 1);
      }
    });

    const conversationsByAgent: ConversationsByAgent[] = Array.from(agentCounts.entries())
      .map(([chatbotId, count]) => ({
        chatbot_id: chatbotId,
        name: chatbotMap.get(chatbotId) || 'Unknown',
        count,
      }))
      .sort((a, b) => b.count - a.count);

    // Get users for this company
    const { data: users } = await supabase
      .from('users')
      .select('id, email')
      .eq('tenant_id', companyId);

    const userMap = new Map(users?.map(u => [u.id, u.email]) || []);
    const userIds = users?.map(u => u.id) || [];

    // Calculate conversations by user
    const userCounts = new Map<string, number>();
    (conversations || []).forEach(conv => {
      if (conv.user_id) {
        userCounts.set(conv.user_id, (userCounts.get(conv.user_id) || 0) + 1);
      }
    });

    const conversationsByUser: ConversationsByUser[] = Array.from(userCounts.entries())
      .map(([userId, count]) => ({
        user_id: userId,
        email: userMap.get(userId) || 'Unknown',
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 users

    // Get feedback summary
    let positiveFeedback = 0;
    let negativeFeedback = 0;

    if (userIds.length > 0) {
      const { data: feedbackData } = await supabase
        .from('feedback')
        .select('rating')
        .in('user_id', userIds);

      (feedbackData || []).forEach(f => {
        if (f.rating === 1) positiveFeedback++;
        else if (f.rating === -1) negativeFeedback++;
      });
    }

    const totalFeedback = positiveFeedback + negativeFeedback;
    const feedbackRate = totalFeedback > 0
      ? Math.round((positiveFeedback / totalFeedback) * 100)
      : 0;

    // Get recent conversations with user and chatbot info
    const { data: recentConvs } = await supabase
      .from('conversations')
      .select(`
        id,
        title,
        created_at,
        updated_at,
        user_id,
        chatbot_id
      `)
      .eq('tenant_id', companyId)
      .order('updated_at', { ascending: false })
      .limit(5);

    // Get message counts for recent conversations
    const recentConvIds = recentConvs?.map(c => c.id) || [];
    const messageCounts = new Map<string, number>();

    if (recentConvIds.length > 0) {
      const { data: messages } = await supabase
        .from('messages')
        .select('conversation_id')
        .in('conversation_id', recentConvIds);

      (messages || []).forEach(m => {
        messageCounts.set(m.conversation_id, (messageCounts.get(m.conversation_id) || 0) + 1);
      });
    }

    // Build recent conversations with full info
    const { data: usersForRecent } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('tenant_id', companyId);

    const userFullMap = new Map(usersForRecent?.map(u => [u.id, { email: u.email, name: u.name }]) || []);

    const recentConversations: RecentConversation[] = (recentConvs || []).map(conv => {
      const userInfo = userFullMap.get(conv.user_id) || { email: 'Unknown', name: null };
      const chatbotName = conv.chatbot_id ? chatbotMap.get(conv.chatbot_id) : null;

      return {
        id: conv.id,
        title: conv.title,
        created_at: conv.created_at,
        updated_at: conv.updated_at,
        user: {
          id: conv.user_id,
          email: userInfo.email,
          name: userInfo.name,
        },
        chatbot: conv.chatbot_id ? {
          id: conv.chatbot_id,
          name: chatbotName || 'Unknown',
        } : null,
        message_count: messageCounts.get(conv.id) || 0,
      };
    });

    const response: StatsResponse = {
      company: {
        id: company.id,
        name: company.name,
        slug: company.slug,
      },
      conversations_by_agent: conversationsByAgent,
      conversations_by_user: conversationsByUser,
      feedback_summary: {
        positive: positiveFeedback,
        negative: negativeFeedback,
        total: totalFeedback,
        rate: feedbackRate,
      },
      recent_conversations: recentConversations,
      demo_mode: isDemoMode,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Admin company stats API error:', error);
    return NextResponse.json<APIError>(
      {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
