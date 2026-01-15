/**
 * Messages API Route
 * Handles fetching messages for a specific conversation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import type { APIError, Message } from '@/types';

// Demo mode constants (used as fallback only if no user_id provided)
const DEMO_USER_ID = '00000000-0000-0000-0000-000000000002';

/**
 * Validate UUID format
 */
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/conversations/[id]/messages
 * Fetches messages for a specific conversation
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

    // Get query parameters for pagination and user
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const perPage = parseInt(searchParams.get('per_page') || '50', 10);
    const order = searchParams.get('order') || 'asc'; // asc = oldest first, desc = newest first
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

    // Validate order
    if (!['asc', 'desc'].includes(order)) {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid order parameter. Must be "asc" or "desc".',
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

    console.log('Messages API: Using user_id:', effectiveUserId);

    // Verify user owns the conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id, user_id, title, is_archived')
      .eq('id', conversationId)
      .eq('user_id', effectiveUserId)
      .single();

    if (convError || !conversation) {
      return NextResponse.json<APIError>(
        {
          code: 'NOT_FOUND',
          message: 'Conversation not found or access denied',
        },
        { status: 404 }
      );
    }

    // Fetch messages with pagination and feedback data
    const offset = (page - 1) * perPage;
    const { data: messages, error: queryError, count } = await supabase
      .from('messages')
      .select(`
        *,
        feedback (
          id,
          rating,
          notes,
          created_at
        )
      `, { count: 'exact' })
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: order === 'asc' })
      .range(offset, offset + perPage - 1);

    if (queryError) {
      console.error('Error fetching messages:', queryError);
      return NextResponse.json<APIError>(
        {
          code: 'SUPABASE_ERROR',
          message: 'Error fetching messages',
          details: { error: queryError.message },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      conversation: {
        id: conversation.id,
        title: conversation.title,
        is_archived: conversation.is_archived,
      },
      messages: (messages || []) as unknown as Message[],
      pagination: {
        total: count || 0,
        page,
        per_page: perPage,
        has_more: (count || 0) > offset + perPage,
      },
    });
  } catch (error) {
    console.error('Messages API error:', error);
    return NextResponse.json<APIError>(
      {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
