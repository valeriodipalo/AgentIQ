/**
 * Feedback API Route
 * Handles user feedback on AI responses with ownership validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import type { APIError, FeedbackRequest, Feedback, FeedbackRating, FeedbackCategory } from '@/types';

/**
 * Valid feedback categories
 */
const VALID_CATEGORIES: FeedbackCategory[] = [
  'helpful',
  'accurate',
  'creative',
  'unhelpful',
  'inaccurate',
  'inappropriate',
  'other',
];

/**
 * Validate feedback rating
 */
function isValidRating(rating: unknown): rating is FeedbackRating {
  return rating === 'positive' || rating === 'negative';
}

/**
 * Validate feedback category
 */
function isValidCategory(category: unknown): category is FeedbackCategory {
  return VALID_CATEGORIES.includes(category as FeedbackCategory);
}

/**
 * Verify user has access to a message (message must be in a conversation they own)
 */
async function verifyMessageAccess(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  messageId: string,
  userId: string
): Promise<{
  valid: boolean;
  conversationId?: string;
  tenantId?: string;
  messageRole?: string;
  error?: string;
}> {
  // Query message with conversation join to verify ownership
  const { data: message, error } = await supabase
    .from('messages')
    .select(`
      id,
      role,
      conversation_id,
      conversations!inner (
        id,
        user_id,
        tenant_id
      )
    `)
    .eq('id', messageId)
    .single();

  if (error || !message) {
    return { valid: false, error: 'Message not found' };
  }

  // Type assertion for nested query
  const conversation = message.conversations as unknown as {
    id: string;
    user_id: string;
    tenant_id: string;
  } | null;

  if (!conversation) {
    return { valid: false, error: 'Conversation not found' };
  }

  // Verify the user owns the conversation
  if (conversation.user_id !== userId) {
    return { valid: false, error: 'Access denied to this message' };
  }

  return {
    valid: true,
    conversationId: conversation.id,
    tenantId: conversation.tenant_id,
    messageRole: message.role,
  };
}

/**
 * POST /api/feedback
 * Submits feedback for a message
 */
export async function POST(request: NextRequest) {
  try {
    const body: FeedbackRequest = await request.json();
    const { message_id, rating, comment, category } = body;

    // Validate required fields
    if (!message_id || typeof message_id !== 'string') {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: 'message_id is required and must be a string',
        },
        { status: 400 }
      );
    }

    if (!isValidRating(rating)) {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: 'rating must be "positive" or "negative"',
        },
        { status: 400 }
      );
    }

    // Validate category if provided
    if (category !== undefined && !isValidCategory(category)) {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: `category must be one of: ${VALID_CATEGORIES.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Validate comment length if provided
    if (comment && comment.length > 2000) {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: 'comment must be 2000 characters or less',
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

    // Verify user has access to the message
    const accessResult = await verifyMessageAccess(supabase, message_id, user.id);

    if (!accessResult.valid) {
      return NextResponse.json<APIError>(
        {
          code: 'NOT_FOUND',
          message: accessResult.error || 'Message not found',
        },
        { status: 404 }
      );
    }

    // Optional: Only allow feedback on assistant messages
    if (accessResult.messageRole !== 'assistant') {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: 'Feedback can only be provided on assistant messages',
        },
        { status: 400 }
      );
    }

    const { conversationId, tenantId } = accessResult;

    // Check if feedback already exists for this message from this user
    const { data: existingFeedback } = await supabase
      .from('feedback')
      .select('id')
      .eq('message_id', message_id)
      .eq('user_id', user.id)
      .single();

    if (existingFeedback) {
      // Update existing feedback
      const { data: updatedFeedback, error: updateError } = await supabase
        .from('feedback')
        .update({
          rating,
          comment: comment || null,
          category: category || null,
          metadata: {
            user_agent: request.headers.get('user-agent') || undefined,
            updated_at: new Date().toISOString(),
          },
        })
        .eq('id', existingFeedback.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating feedback:', updateError);
        return NextResponse.json<APIError>(
          {
            code: 'SUPABASE_ERROR',
            message: 'Error updating feedback',
            details: { error: updateError.message },
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        ...(updatedFeedback as unknown as Feedback),
        updated: true,
      });
    }

    // Create new feedback
    const { data: feedback, error: insertError } = await supabase
      .from('feedback')
      .insert({
        message_id,
        conversation_id: conversationId!,
        user_id: user.id,
        tenant_id: tenantId!,
        rating,
        comment: comment || null,
        category: category || null,
        metadata: {
          user_agent: request.headers.get('user-agent') || undefined,
          created_at: new Date().toISOString(),
        },
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating feedback:', insertError);
      return NextResponse.json<APIError>(
        {
          code: 'SUPABASE_ERROR',
          message: 'Error creating feedback',
          details: { error: insertError.message },
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ...(feedback as unknown as Feedback),
        created: true,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Feedback API error:', error);
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
 * GET /api/feedback
 * Gets feedback for a specific message or lists user's feedback
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('message_id');
    const conversationId = searchParams.get('conversation_id');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const perPage = parseInt(searchParams.get('per_page') || '50', 10);

    // Validate pagination
    if (page < 1 || perPage < 1 || perPage > 100) {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid pagination parameters',
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

    // If message_id is provided, get feedback for that specific message
    if (messageId) {
      // First verify user has access to the message
      const accessResult = await verifyMessageAccess(supabase, messageId, user.id);

      if (!accessResult.valid) {
        return NextResponse.json<APIError>(
          {
            code: 'NOT_FOUND',
            message: accessResult.error || 'Message not found',
          },
          { status: 404 }
        );
      }

      // Get feedback for this message
      const { data: feedback, error: queryError } = await supabase
        .from('feedback')
        .select('*')
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .single();

      if (queryError && queryError.code !== 'PGRST116') {
        // PGRST116 is "no rows returned"
        console.error('Error fetching feedback:', queryError);
        return NextResponse.json<APIError>(
          {
            code: 'SUPABASE_ERROR',
            message: 'Error fetching feedback',
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        feedback: feedback || null,
        message_id: messageId,
      });
    }

    // If conversation_id is provided, verify ownership first
    if (conversationId) {
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('id')
        .eq('id', conversationId)
        .eq('user_id', user.id)
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
    }

    // Build query for listing feedback
    const offset = (page - 1) * perPage;
    let query = supabase
      .from('feedback')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (conversationId) {
      query = query.eq('conversation_id', conversationId);
    }

    const { data: feedbackList, error: queryError, count } = await query
      .range(offset, offset + perPage - 1);

    if (queryError) {
      console.error('Error fetching feedback:', queryError);
      return NextResponse.json<APIError>(
        {
          code: 'SUPABASE_ERROR',
          message: 'Error fetching feedback',
        },
        { status: 500 }
      );
    }

    // Calculate statistics
    const stats = {
      total: count || 0,
      positive: feedbackList?.filter((f) => f.rating === 'positive').length || 0,
      negative: feedbackList?.filter((f) => f.rating === 'negative').length || 0,
      by_category: {} as Record<string, number>,
    };

    // Count by category
    feedbackList?.forEach((f) => {
      if (f.category) {
        stats.by_category[f.category] = (stats.by_category[f.category] || 0) + 1;
      }
    });

    return NextResponse.json({
      feedback: feedbackList || [],
      stats,
      pagination: {
        total: count || 0,
        page,
        per_page: perPage,
        has_more: (count || 0) > offset + perPage,
      },
    });
  } catch (error) {
    console.error('Feedback API error:', error);
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
 * DELETE /api/feedback
 * Deletes feedback for a message
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('message_id');
    const feedbackId = searchParams.get('feedback_id');

    if (!messageId && !feedbackId) {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: 'message_id or feedback_id is required',
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

    let deleteQuery = supabase.from('feedback').delete().eq('user_id', user.id);

    if (feedbackId) {
      deleteQuery = deleteQuery.eq('id', feedbackId);
    } else if (messageId) {
      // Verify user has access to the message first
      const accessResult = await verifyMessageAccess(supabase, messageId, user.id);

      if (!accessResult.valid) {
        return NextResponse.json<APIError>(
          {
            code: 'NOT_FOUND',
            message: accessResult.error || 'Message not found',
          },
          { status: 404 }
        );
      }

      deleteQuery = deleteQuery.eq('message_id', messageId);
    }

    const { error: deleteError, count } = await deleteQuery;

    if (deleteError) {
      console.error('Error deleting feedback:', deleteError);
      return NextResponse.json<APIError>(
        {
          code: 'SUPABASE_ERROR',
          message: 'Error deleting feedback',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deleted_count: count || 0,
    });
  } catch (error) {
    console.error('Feedback API error:', error);
    return NextResponse.json<APIError>(
      {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
