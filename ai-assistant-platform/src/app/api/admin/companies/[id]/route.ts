/**
 * Single Company API Route
 * Handles operations on a specific company/tenant (GET, PUT, DELETE)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import type { APIError } from '@/types';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * Update company request body
 */
interface UpdateCompanyRequest {
  name?: string;
  slug?: string;
  branding?: Record<string, unknown> | null;
  is_active?: boolean;
}

/**
 * Validate UUID format
 */
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Validate company name
 */
function validateName(name: unknown): string | null {
  if (name === undefined) {
    return null; // Optional for updates
  }
  if (name === null || typeof name !== 'string') {
    return 'name must be a string';
  }
  if (name.trim().length === 0) {
    return 'name cannot be empty';
  }
  if (name.length > 255) {
    return 'name must be 255 characters or less';
  }
  return null;
}

/**
 * Validate slug format (URL-safe)
 */
function validateSlug(slug: unknown): string | null {
  if (slug === undefined) {
    return null; // Optional for updates
  }
  if (slug === null || typeof slug !== 'string') {
    return 'slug must be a string';
  }
  if (slug.trim().length === 0) {
    return 'slug cannot be empty';
  }
  if (slug.length > 100) {
    return 'slug must be 100 characters or less';
  }
  // URL-safe: only lowercase letters, numbers, and hyphens
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  if (!slugRegex.test(slug)) {
    return 'slug must be URL-safe (lowercase letters, numbers, and hyphens only, no leading/trailing hyphens)';
  }
  return null;
}

/**
 * GET /api/admin/companies/[id]
 * Fetches a specific company by ID with stats
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
    const isDemoMode = true;
    console.log('Admin companies API: Using demo mode');

    // Fetch company
    const { data: company, error: queryError } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', companyId)
      .single();

    if (queryError || !company) {
      return NextResponse.json<APIError>(
        {
          code: 'NOT_FOUND',
          message: 'Company not found',
        },
        { status: 404 }
      );
    }

    // Get user count
    const { count: userCount } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', companyId);

    // Get chatbot counts
    const { data: chatbots } = await supabase
      .from('chatbots')
      .select('id, is_published')
      .eq('tenant_id', companyId);

    const chatbotCount = chatbots?.length || 0;
    const publishedChatbotCount = chatbots?.filter(c => c.is_published).length || 0;

    // Get conversation counts
    const { data: conversations } = await supabase
      .from('conversations')
      .select('id, is_archived')
      .eq('tenant_id', companyId);

    const conversationCount = conversations?.length || 0;
    const activeConversationCount = conversations?.filter(c => !c.is_archived).length || 0;

    // Get message count
    const conversationIds = conversations?.map(c => c.id) || [];
    let totalMessages = 0;
    if (conversationIds.length > 0) {
      const { count: messageCount } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .in('conversation_id', conversationIds);
      totalMessages = messageCount || 0;
    }

    // Get feedback stats
    const userIds = await supabase
      .from('users')
      .select('id')
      .eq('tenant_id', companyId);

    let feedbackPositiveRate = 0;
    if (userIds.data && userIds.data.length > 0) {
      const ids = userIds.data.map(u => u.id);
      const { data: feedbackData } = await supabase
        .from('feedback')
        .select('rating')
        .in('user_id', ids);

      if (feedbackData && feedbackData.length > 0) {
        const positive = feedbackData.filter(f => f.rating === 1).length;
        feedbackPositiveRate = Math.round((positive / feedbackData.length) * 100);
      }
    }

    // Get recent conversations with user and chatbot info
    // Note: chatbot_id is nullable, so we use left join (no !inner)
    const { data: recentConversations } = await supabase
      .from('conversations')
      .select(`
        id,
        title,
        updated_at,
        users!inner (email, name),
        chatbots (name)
      `)
      .eq('tenant_id', companyId)
      .order('updated_at', { ascending: false })
      .limit(5);

    // Get message counts for recent conversations
    const recentConvWithCounts = await Promise.all(
      (recentConversations || []).map(async (conv) => {
        const { count } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', conv.id);

        return {
          id: conv.id,
          title: conv.title || 'Untitled conversation',
          user_email: (conv.users as { email: string } | null)?.email || 'Unknown',
          chatbot_name: (conv.chatbots as { name: string } | null)?.name || 'General Assistant',
          message_count: count || 0,
          updated_at: conv.updated_at,
        };
      })
    );

    return NextResponse.json({
      company: {
        id: company.id,
        name: company.name,
        slug: company.slug,
        is_active: company.is_active ?? true,
        created_at: company.created_at,
        branding: company.branding || null,
      },
      stats: {
        user_count: userCount || 0,
        chatbot_count: chatbotCount,
        published_chatbot_count: publishedChatbotCount,
        conversation_count: conversationCount,
        active_conversation_count: activeConversationCount,
        feedback_positive_rate: feedbackPositiveRate,
        total_messages: totalMessages,
      },
      recent_conversations: recentConvWithCounts,
      demo_mode: isDemoMode,
    });
  } catch (error) {
    console.error('Admin company API error:', error);
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
 * PUT /api/admin/companies/[id]
 * Updates a specific company
 */
export async function PUT(
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

    const body: UpdateCompanyRequest = await request.json();
    const { name, slug, branding, is_active } = body;

    // Validate fields
    const nameError = validateName(name);
    if (nameError) {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: nameError,
        },
        { status: 400 }
      );
    }

    const slugError = validateSlug(slug);
    if (slugError) {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: slugError,
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
    const isDemoMode = true;
    console.log('Admin companies API: Using demo mode for update');

    // Verify company exists
    const { data: existing, error: fetchError } = await supabase
      .from('tenants')
      .select('id, slug')
      .eq('id', companyId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json<APIError>(
        {
          code: 'NOT_FOUND',
          message: 'Company not found',
        },
        { status: 404 }
      );
    }

    // Check if new slug is unique (if changing)
    if (slug && slug.toLowerCase() !== existing.slug) {
      const { data: existingSlug } = await supabase
        .from('tenants')
        .select('id')
        .eq('slug', slug.toLowerCase())
        .neq('id', companyId)
        .single();

      if (existingSlug) {
        return NextResponse.json<APIError>(
          {
            code: 'VALIDATION_ERROR',
            message: 'A company with this slug already exists',
          },
          { status: 409 }
        );
      }
    }

    // Build update object
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) {
      updates.name = name.trim();
    }

    if (slug !== undefined) {
      updates.slug = slug.toLowerCase();
    }

    if (branding !== undefined) {
      updates.branding = branding ? JSON.parse(JSON.stringify(branding)) : null;
    }

    if (is_active !== undefined) {
      updates.is_active = is_active;
    }

    // Update company
    const { data: company, error: updateError } = await supabase
      .from('tenants')
      .update(updates)
      .eq('id', companyId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating company:', updateError);
      return NextResponse.json<APIError>(
        {
          code: 'SUPABASE_ERROR',
          message: 'Error updating company',
          details: { error: updateError.message },
        },
        { status: 500 }
      );
    }

    return NextResponse.json(company);
  } catch (error) {
    console.error('Admin company API error:', error);
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
 * DELETE /api/admin/companies/[id]
 * Deletes a specific company
 *
 * Query Parameters:
 * - force=true: Cascade delete all associated data (users, conversations, etc.)
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: companyId } = await params;
    const { searchParams } = new URL(request.url);
    const forceDelete = searchParams.get('force') === 'true';

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
    console.log('Admin companies API: Deleting company', companyId, 'force:', forceDelete);

    // Verify company exists
    const { data: existing, error: fetchError } = await supabase
      .from('tenants')
      .select('id, name, slug')
      .eq('id', companyId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json<APIError>(
        {
          code: 'NOT_FOUND',
          message: 'Company not found',
        },
        { status: 404 }
      );
    }

    // Check for existing data
    const { count: userCount } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', companyId);

    const { count: chatbotCount } = await supabase
      .from('chatbots')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', companyId);

    const { count: conversationCount } = await supabase
      .from('conversations')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', companyId);

    const { count: inviteCodeCount } = await supabase
      .from('invite_codes')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', companyId);

    const hasData = (userCount || 0) > 0 || (chatbotCount || 0) > 0 || (conversationCount || 0) > 0;

    // If not force delete and has data, return error with counts
    if (!forceDelete && hasData) {
      return NextResponse.json<APIError>(
        {
          code: 'HAS_ASSOCIATED_DATA',
          message: 'Company has associated data. Use force=true to delete all data.',
          details: {
            user_count: userCount || 0,
            chatbot_count: chatbotCount || 0,
            conversation_count: conversationCount || 0,
            invite_code_count: inviteCodeCount || 0,
          },
        },
        { status: 409 }
      );
    }

    // If force delete, cascade delete all associated data
    if (forceDelete && hasData) {
      console.log('Force deleting company with all associated data...');

      // Get all user IDs for this company (needed for feedback deletion)
      const { data: users } = await supabase
        .from('users')
        .select('id')
        .eq('tenant_id', companyId);
      const userIds = users?.map(u => u.id) || [];

      // Get all conversation IDs (needed for messages deletion)
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id')
        .eq('tenant_id', companyId);
      const conversationIds = conversations?.map(c => c.id) || [];

      // Delete in order to respect foreign key constraints:

      // 1. Delete feedback (references users and messages)
      if (userIds.length > 0) {
        const { error: feedbackError } = await supabase
          .from('feedback')
          .delete()
          .in('user_id', userIds);
        if (feedbackError) {
          console.error('Error deleting feedback:', feedbackError);
        }
      }

      // 2. Delete messages (references conversations)
      if (conversationIds.length > 0) {
        const { error: messagesError } = await supabase
          .from('messages')
          .delete()
          .in('conversation_id', conversationIds);
        if (messagesError) {
          console.error('Error deleting messages:', messagesError);
        }
      }

      // 3. Delete conversations (references tenant, user, chatbot)
      const { error: conversationsError } = await supabase
        .from('conversations')
        .delete()
        .eq('tenant_id', companyId);
      if (conversationsError) {
        console.error('Error deleting conversations:', conversationsError);
      }

      // 4. Delete invite_redemptions (references invite_codes and users)
      if (userIds.length > 0) {
        const { error: redemptionsError } = await supabase
          .from('invite_redemptions')
          .delete()
          .in('user_id', userIds);
        if (redemptionsError) {
          console.error('Error deleting invite redemptions:', redemptionsError);
        }
      }

      // 5. Delete invite_codes (references tenant)
      const { error: inviteCodesError } = await supabase
        .from('invite_codes')
        .delete()
        .eq('tenant_id', companyId);
      if (inviteCodesError) {
        console.error('Error deleting invite codes:', inviteCodesError);
      }

      // 6. Delete chatbots (references tenant)
      const { error: chatbotsError } = await supabase
        .from('chatbots')
        .delete()
        .eq('tenant_id', companyId);
      if (chatbotsError) {
        console.error('Error deleting chatbots:', chatbotsError);
      }

      // 7. Delete users (references tenant)
      const { error: usersError } = await supabase
        .from('users')
        .delete()
        .eq('tenant_id', companyId);
      if (usersError) {
        console.error('Error deleting users:', usersError);
        return NextResponse.json<APIError>(
          {
            code: 'SUPABASE_ERROR',
            message: 'Error deleting users',
            details: { error: usersError.message },
          },
          { status: 500 }
        );
      }
    }

    // 8. Finally delete the company/tenant
    const { error: deleteError } = await supabase
      .from('tenants')
      .delete()
      .eq('id', companyId);

    if (deleteError) {
      console.error('Error deleting company:', deleteError);
      return NextResponse.json<APIError>(
        {
          code: 'SUPABASE_ERROR',
          message: 'Error deleting company',
          details: { error: deleteError.message },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deleted_id: companyId,
      deleted_name: existing.name,
      deleted_slug: existing.slug,
      deleted_data: forceDelete ? {
        users: userCount || 0,
        chatbots: chatbotCount || 0,
        conversations: conversationCount || 0,
        invite_codes: inviteCodeCount || 0,
      } : null,
    });
  } catch (error) {
    console.error('Admin company API error:', error);
    return NextResponse.json<APIError>(
      {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
