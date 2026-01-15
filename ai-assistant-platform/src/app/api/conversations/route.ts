/**
 * Conversations API Route
 * Handles CRUD operations for conversations with message count and preview
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { config } from '@/lib/config';
import type { APIError, Conversation, ConversationListResponse, ConversationMetadata } from '@/types';

// Demo mode constants (used as fallback only if no user_id provided)
const DEMO_USER_ID = '00000000-0000-0000-0000-000000000002';
const DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Validate UUID format
 */
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Extended conversation type with additional computed fields
 */
interface ConversationWithPreview extends Conversation {
  last_message_preview?: string;
  last_message_at?: string;
}

/**
 * GET /api/conversations
 * Lists conversations for the authenticated user with message count and preview
 */
export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const perPage = parseInt(searchParams.get('per_page') || '20', 10);
    const archived = searchParams.get('archived') === 'true';
    const search = searchParams.get('search')?.trim();
    const userIdParam = searchParams.get('user_id')?.trim();

    // Validate user_id if provided
    if (userIdParam && !isValidUUID(userIdParam)) {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid user_id format',
        },
        { status: 400 }
      );
    }

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

    // Use provided user_id or fall back to demo user
    const effectiveUserId = userIdParam || DEMO_USER_ID;

    // Validate user exists in database if not using demo user
    if (userIdParam) {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('id', userIdParam)
        .single();

      if (userError || !user) {
        return NextResponse.json<APIError>(
          {
            code: 'VALIDATION_ERROR',
            message: 'User not found',
          },
          { status: 400 }
        );
      }
    }

    console.log('Conversations API: Using user_id:', effectiveUserId);

    // Query conversations with count
    const offset = (page - 1) * perPage;
    let query = supabase
      .from('conversations')
      .select('*', { count: 'exact' })
      .eq('user_id', effectiveUserId)
      .eq('is_archived', archived)
      .order('updated_at', { ascending: false });

    // Add search filter if provided
    if (search) {
      query = query.ilike('title', `%${search}%`);
    }

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

    // Fetch last message for each conversation for preview
    const conversationsWithPreview: ConversationWithPreview[] = await Promise.all(
      (conversations || []).map(async (conv) => {
        const { data: lastMessage } = await supabase
          .from('messages')
          .select('content, created_at, role')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        const metadata = conv.metadata as ConversationMetadata | null;

        return {
          ...conv,
          metadata: {
            message_count: metadata?.message_count || 0,
            total_tokens: metadata?.total_tokens || 0,
            model: metadata?.model || config.openai.defaultModel,
            tags: metadata?.tags,
            custom: metadata?.custom,
          },
          last_message_preview: lastMessage?.content
            ? lastMessage.content.slice(0, 100) + (lastMessage.content.length > 100 ? '...' : '')
            : undefined,
          last_message_at: lastMessage?.created_at || conv.updated_at,
        } as ConversationWithPreview;
      })
    );

    const response: ConversationListResponse & { conversations: ConversationWithPreview[] } = {
      conversations: conversationsWithPreview,
      pagination: {
        total: count || 0,
        page,
        per_page: perPage,
        has_more: (count || 0) > offset + perPage,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Conversations API error:', error);
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
 * POST /api/conversations
 * Creates a new conversation
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, model, metadata: customMetadata, user_id: userIdParam } = body;

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

    // Validate user_id format if provided
    if (userIdParam && !isValidUUID(userIdParam)) {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid user_id format',
        },
        { status: 400 }
      );
    }

    // Use provided user_id or fall back to demo user
    let effectiveUserId = DEMO_USER_ID;
    let tenantId = DEMO_TENANT_ID;

    // If user_id provided, validate and get their tenant
    if (userIdParam) {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, tenant_id')
        .eq('id', userIdParam)
        .single();

      if (userError || !user) {
        return NextResponse.json<APIError>(
          {
            code: 'VALIDATION_ERROR',
            message: 'User not found',
          },
          { status: 400 }
        );
      }

      effectiveUserId = user.id;
      tenantId = user.tenant_id;
    }

    console.log('Conversations API POST: Using user_id:', effectiveUserId);

    // Validate title length if provided
    if (title && title.length > 255) {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: 'Title must be 255 characters or less',
        },
        { status: 400 }
      );
    }

    // Create conversation
    const { data: conversation, error: insertError } = await supabase
      .from('conversations')
      .insert({
        tenant_id: tenantId,
        user_id: effectiveUserId,
        title: title || 'New Conversation',
        is_archived: false,
        metadata: {
          message_count: 0,
          total_tokens: 0,
          model: model || config.openai.defaultModel,
          ...customMetadata,
        },
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating conversation:', insertError);
      return NextResponse.json<APIError>(
        {
          code: 'SUPABASE_ERROR',
          message: 'Error creating conversation',
          details: { error: insertError.message },
        },
        { status: 500 }
      );
    }

    return NextResponse.json(conversation, { status: 201 });
  } catch (error) {
    console.error('Conversations API error:', error);
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
 * PATCH /api/conversations
 * Updates a conversation (title, status, etc.)
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversation_id, title, is_archived, metadata: customMetadata, user_id: userIdParam } = body;

    if (!conversation_id) {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: 'conversation_id is required',
        },
        { status: 400 }
      );
    }

    // Validate title length if provided
    if (title && title.length > 255) {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: 'Title must be 255 characters or less',
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

    // Validate user_id format if provided
    if (userIdParam && !isValidUUID(userIdParam)) {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid user_id format',
        },
        { status: 400 }
      );
    }

    // Use provided user_id or fall back to demo user
    let effectiveUserId = DEMO_USER_ID;

    // Validate user exists if provided
    if (userIdParam) {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('id', userIdParam)
        .single();

      if (userError || !user) {
        return NextResponse.json<APIError>(
          {
            code: 'VALIDATION_ERROR',
            message: 'User not found',
          },
          { status: 400 }
        );
      }
      effectiveUserId = user.id;
    }

    console.log('Conversations API PATCH: Using user_id:', effectiveUserId);

    // Verify conversation belongs to user
    const { data: existing, error: fetchError } = await supabase
      .from('conversations')
      .select('id, metadata')
      .eq('id', conversation_id)
      .eq('user_id', effectiveUserId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json<APIError>(
        {
          code: 'NOT_FOUND',
          message: 'Conversation not found or access denied',
        },
        { status: 404 }
      );
    }

    // Build update object
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (title !== undefined) {
      updates.title = title;
    }

    if (is_archived !== undefined) {
      updates.is_archived = is_archived;
    }

    if (customMetadata !== undefined) {
      const existingMetadata = existing.metadata as Record<string, unknown> || {};
      updates.metadata = {
        ...existingMetadata,
        ...customMetadata,
      };
    }

    // Update conversation
    const { data: conversation, error: updateError } = await supabase
      .from('conversations')
      .update(updates)
      .eq('id', conversation_id)
      .eq('user_id', effectiveUserId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating conversation:', updateError);
      return NextResponse.json<APIError>(
        {
          code: 'SUPABASE_ERROR',
          message: 'Error updating conversation',
          details: { error: updateError.message },
        },
        { status: 500 }
      );
    }

    return NextResponse.json(conversation);
  } catch (error) {
    console.error('Conversations API error:', error);
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
 * DELETE /api/conversations
 * Archives or deletes multiple conversations
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversation_ids, permanent = false, user_id: userIdParam } = body;

    if (!Array.isArray(conversation_ids) || conversation_ids.length === 0) {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: 'conversation_ids array is required and must not be empty',
        },
        { status: 400 }
      );
    }

    // Validate array length to prevent abuse
    if (conversation_ids.length > 100) {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: 'Cannot delete more than 100 conversations at once',
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

    // Validate user_id format if provided
    if (userIdParam && !isValidUUID(userIdParam)) {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid user_id format',
        },
        { status: 400 }
      );
    }

    // Use provided user_id or fall back to demo user
    let effectiveUserId = DEMO_USER_ID;

    // Validate user exists if provided
    if (userIdParam) {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('id', userIdParam)
        .single();

      if (userError || !user) {
        return NextResponse.json<APIError>(
          {
            code: 'VALIDATION_ERROR',
            message: 'User not found',
          },
          { status: 400 }
        );
      }
      effectiveUserId = user.id;
    }

    console.log('Conversations API DELETE: Using user_id:', effectiveUserId);

    // Count how many conversations actually belong to the user
    const { count: existingCount, error: countError } = await supabase
      .from('conversations')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', effectiveUserId)
      .in('id', conversation_ids);

    if (countError) {
      console.error('Error counting conversations:', countError);
      return NextResponse.json<APIError>(
        {
          code: 'SUPABASE_ERROR',
          message: 'Error verifying conversations',
        },
        { status: 500 }
      );
    }

    if (existingCount === 0) {
      return NextResponse.json<APIError>(
        {
          code: 'NOT_FOUND',
          message: 'No matching conversations found',
        },
        { status: 404 }
      );
    }

    if (permanent) {
      // Permanently delete conversations (and cascade to messages via FK)
      const { error: deleteError } = await supabase
        .from('conversations')
        .delete()
        .eq('user_id', effectiveUserId)
        .in('id', conversation_ids);

      if (deleteError) {
        console.error('Error deleting conversations:', deleteError);
        return NextResponse.json<APIError>(
          {
            code: 'SUPABASE_ERROR',
            message: 'Error deleting conversations',
            details: { error: deleteError.message },
          },
          { status: 500 }
        );
      }
    } else {
      // Archive conversations (soft delete)
      const { error: updateError } = await supabase
        .from('conversations')
        .update({ is_archived: true, updated_at: new Date().toISOString() })
        .eq('user_id', effectiveUserId)
        .in('id', conversation_ids);

      if (updateError) {
        console.error('Error archiving conversations:', updateError);
        return NextResponse.json<APIError>(
          {
            code: 'SUPABASE_ERROR',
            message: 'Error archiving conversations',
            details: { error: updateError.message },
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      action: permanent ? 'deleted' : 'archived',
      count: existingCount,
    });
  } catch (error) {
    console.error('Conversations API error:', error);
    return NextResponse.json<APIError>(
      {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
