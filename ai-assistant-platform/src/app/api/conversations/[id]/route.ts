/**
 * Single Conversation API Route
 * Handles operations on a specific conversation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { config } from '@/lib/config';
import type { APIError, Conversation, ConversationMetadata } from '@/types';

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

    // Get Supabase client and check authentication
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json<APIError>(
        {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
        { status: 401 }
      );
    }

    // Fetch conversation
    const { data: conversation, error: queryError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('user_id', user.id)
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
    const { title, status, metadata: customMetadata } = body;

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

    // Validate status if provided
    if (status !== undefined && !['active', 'archived', 'deleted'].includes(status)) {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid status. Must be one of: active, archived, deleted.',
        },
        { status: 400 }
      );
    }

    // Get Supabase client and check authentication
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json<APIError>(
        {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
        { status: 401 }
      );
    }

    // Verify conversation belongs to user and get current metadata
    const { data: existing, error: fetchError } = await supabase
      .from('conversations')
      .select('id, metadata')
      .eq('id', conversationId)
      .eq('user_id', user.id)
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

    if (status !== undefined) {
      updates.status = status;
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
      .eq('user_id', user.id)
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

    // Check for permanent deletion query param
    const { searchParams } = new URL(request.url);
    const permanent = searchParams.get('permanent') === 'true';

    // Get Supabase client and check authentication
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json<APIError>(
        {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
        { status: 401 }
      );
    }

    // Verify conversation exists and belongs to user
    const { data: existing, error: fetchError } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('user_id', user.id)
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
        .eq('user_id', user.id);

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
        .update({ status: 'archived', updated_at: new Date().toISOString() })
        .eq('id', conversationId)
        .eq('user_id', user.id);

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
