/**
 * Single Conversation API Route
 * Handles operations on a specific conversation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { config } from '@/lib/config';
import type { APIError, ConversationMetadata } from '@/types';

// Demo mode constants (used as fallback only if no user_id provided)
const DEMO_USER_ID = '00000000-0000-0000-0000-000000000002';

/**
 * Validate UUID format
 */
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/conversations/[id]
 * Fetches a specific conversation with its details
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: conversationId } = await params;

    if (!conversationId) {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: 'Conversation ID is required',
        },
        { status: 400 }
      );
    }

    // Get user_id from query params
    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get('user_id')?.trim();

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

    console.log('Conversation API GET: Using user_id:', effectiveUserId);

    // Fetch conversation
    const { data: conversation, error: queryError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('user_id', effectiveUserId)
      .single();

    if (queryError || !conversation) {
      return NextResponse.json<APIError>(
        {
          code: 'NOT_FOUND',
          message: 'Conversation not found or access denied',
        },
        { status: 404 }
      );
    }

    // Get message count and last message
    const { data: lastMessage } = await supabase
      .from('messages')
      .select('content, created_at, role')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const metadata = conversation.metadata as ConversationMetadata | null;

    return NextResponse.json({
      ...conversation,
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
      last_message_at: lastMessage?.created_at || conversation.updated_at,
    });
  } catch (error) {
    console.error('Conversation API error:', error);
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
 * PATCH /api/conversations/[id]
 * Updates a specific conversation
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: conversationId } = await params;

    if (!conversationId) {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: 'Conversation ID is required',
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { title, is_archived, metadata: customMetadata, user_id: userIdParam } = body;

    // Validate title length if provided
    if (title !== undefined && title.length > 255) {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: 'Title must be 255 characters or less',
        },
        { status: 400 }
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

    console.log('Conversation API PATCH: Using user_id:', effectiveUserId);

    // Verify conversation belongs to user and get current metadata
    const { data: existing, error: fetchError } = await supabase
      .from('conversations')
      .select('id, metadata')
      .eq('id', conversationId)
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
      .eq('id', conversationId)
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
    console.error('Conversation API error:', error);
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
 * DELETE /api/conversations/[id]
 * Deletes or archives a specific conversation
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: conversationId } = await params;

    if (!conversationId) {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: 'Conversation ID is required',
        },
        { status: 400 }
      );
    }

    // Check for permanent deletion and user_id query params
    const { searchParams } = new URL(request.url);
    const permanent = searchParams.get('permanent') === 'true';
    const userIdParam = searchParams.get('user_id')?.trim();

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

    console.log('Conversation API DELETE: Using user_id:', effectiveUserId);

    // Verify conversation exists and belongs to user
    const { data: existing, error: fetchError } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
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

    if (permanent) {
      // Permanently delete conversation (cascades to messages)
      const { error: deleteError } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId)
        .eq('user_id', effectiveUserId);

      if (deleteError) {
        console.error('Error deleting conversation:', deleteError);
        return NextResponse.json<APIError>(
          {
            code: 'SUPABASE_ERROR',
            message: 'Error deleting conversation',
            details: { error: deleteError.message },
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        action: 'deleted',
        conversation_id: conversationId,
      });
    } else {
      // Archive conversation (soft delete)
      const { error: updateError } = await supabase
        .from('conversations')
        .update({ is_archived: true, updated_at: new Date().toISOString() })
        .eq('id', conversationId)
        .eq('user_id', effectiveUserId);

      if (updateError) {
        console.error('Error archiving conversation:', updateError);
        return NextResponse.json<APIError>(
          {
            code: 'SUPABASE_ERROR',
            message: 'Error archiving conversation',
            details: { error: updateError.message },
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        action: 'archived',
        conversation_id: conversationId,
      });
    }
  } catch (error) {
    console.error('Conversation API error:', error);
    return NextResponse.json<APIError>(
      {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
