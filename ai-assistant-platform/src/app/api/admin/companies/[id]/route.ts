/**
 * Single Company API Route
 * Handles operations on a specific company/tenant (GET, PUT, DELETE)
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

    // Get Supabase client and check authentication
    const authClient = await createServerClient();
    const { data: { user } } = await authClient.auth.getUser();

    // Demo mode: use admin client to bypass RLS
    const isDemoMode = !user;
    const supabase = isDemoMode ? createAdminClient() : authClient;

    if (isDemoMode) {
      console.log('Admin companies API: Using demo mode');
    }

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

    // Get Supabase client and check authentication
    const authClient = await createServerClient();
    const { data: { user } } = await authClient.auth.getUser();

    // Demo mode: use admin client to bypass RLS
    const isDemoMode = !user;
    const supabase = isDemoMode ? createAdminClient() : authClient;

    if (isDemoMode) {
      console.log('Admin companies API: Using demo mode for update');
    }

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
 * Deletes a specific company (checks for existing data first)
 */
export async function DELETE(
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
      console.log('Admin companies API: Using demo mode for deletion');
    }

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

    const hasData = (userCount || 0) > 0 || (chatbotCount || 0) > 0 || (conversationCount || 0) > 0;

    if (hasData) {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: 'Cannot delete company with existing data. Please delete all users, chatbots, and conversations first.',
          details: {
            user_count: userCount || 0,
            chatbot_count: chatbotCount || 0,
            conversation_count: conversationCount || 0,
          },
        },
        { status: 409 }
      );
    }

    // Delete company
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
