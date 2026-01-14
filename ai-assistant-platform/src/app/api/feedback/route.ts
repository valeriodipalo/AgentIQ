/**
 * Feedback API Route
 * Handles user feedback on AI responses with ownership validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import type { APIError, FeedbackRequest, FeedbackRating } from '@/types';

// Demo user ID for unauthenticated testing
const DEMO_USER_ID = '00000000-0000-0000-0000-000000000002';

/**
 * Validate feedback rating
 */
function isValidRating(rating: unknown): rating is FeedbackRating {
  return rating === 'positive' || rating === 'negative';
}

/**
 * Convert rating string to database integer (-1 or 1)
 */
function ratingToInt(rating: FeedbackRating): number {
  return rating === 'positive' ? 1 : -1;
}

/**
 * Convert database integer to rating string
 */
function intToRating(value: number): FeedbackRating {
  return value === 1 ? 'positive' : 'negative';
}

/**
 * Verify user has access to a message (message must be in a conversation they own)
 */
async function verifyMessageAccess(
  supabase: ReturnType<typeof createAdminClient>,
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
    const body = await request.json();
    const { message_id, rating, comment, notes, conversation_id } = body as FeedbackRequest & { conversation_id?: string };

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

    // Validate comment length if provided
    if (comment && comment.length > 5000) {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: 'comment must be 5000 characters or less',
        },
        { status: 400 }
      );
    }

    // Validate notes length if provided
    if (notes && notes.length > 5000) {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: 'notes must be 5000 characters or less',
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
    const effectiveUserId = DEMO_USER_ID;
    console.log('Feedback API: Using admin client with demo user');

    // Try to find the message - first by ID, then fallback to conversation lookup
    let actualMessageId = message_id;
    let accessResult = await verifyMessageAccess(supabase, message_id, effectiveUserId);

    // If message not found by ID and we have conversation_id, try to find the most recent assistant message
    // This handles the case where AI SDK generates client-side IDs that don't match database UUIDs
    if (!accessResult.valid && conversation_id) {
      console.log('Message not found by ID, trying fallback lookup by conversation_id');

      const { data: recentMessage } = await supabase
        .from('messages')
        .select('id, role, conversation_id')
        .eq('conversation_id', conversation_id)
        .eq('role', 'assistant')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (recentMessage) {
        console.log('Found message via fallback:', recentMessage.id);
        actualMessageId = recentMessage.id;
        // Re-verify with the actual message ID
        accessResult = await verifyMessageAccess(supabase, actualMessageId, effectiveUserId);
      }
    }

    if (!accessResult.valid) {
      return NextResponse.json<APIError>(
        {
          code: 'NOT_FOUND',
          message: accessResult.error || 'Message not found',
        },
        { status: 404 }
      );
    }

    // Only allow feedback on assistant messages
    if (accessResult.messageRole !== 'assistant') {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: 'Feedback can only be provided on assistant messages',
        },
        { status: 400 }
      );
    }

    // Check if feedback already exists for this message from this user
    const { data: existingFeedback } = await supabase
      .from('feedback')
      .select('id')
      .eq('message_id', actualMessageId)
      .eq('user_id', effectiveUserId)
      .single();

    if (existingFeedback) {
      // Update existing feedback
      const { data: updatedFeedback, error: updateError } = await supabase
        .from('feedback')
        .update({
          rating: ratingToInt(rating),
          notes: notes || comment || null,
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
        ...updatedFeedback,
        rating: intToRating(updatedFeedback.rating),
        updated: true,
      });
    }

    // Create new feedback
    const { data: feedback, error: insertError } = await supabase
      .from('feedback')
      .insert({
        message_id: actualMessageId,
        user_id: effectiveUserId,
        rating: ratingToInt(rating),
        notes: notes || comment || null,
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
        ...feedback,
        rating: intToRating(feedback.rating),
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
    const effectiveUserId = DEMO_USER_ID;
    console.log('Feedback API GET: Using admin client with demo user');

    // If message_id is provided, get feedback for that specific message
    if (messageId) {
      // First verify user has access to the message
      const accessResult = await verifyMessageAccess(supabase, messageId, effectiveUserId);

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
        .eq('user_id', effectiveUserId)
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

      // Convert rating to string format
      const formattedFeedback = feedback ? {
        ...feedback,
        rating: intToRating(feedback.rating),
      } : null;

      return NextResponse.json({
        feedback: formattedFeedback,
        message_id: messageId,
      });
    }

    // Build query for listing feedback
    const offset = (page - 1) * perPage;
    const { data: feedbackList, error: queryError, count } = await supabase
      .from('feedback')
      .select('*', { count: 'exact' })
      .eq('user_id', effectiveUserId)
      .order('created_at', { ascending: false })
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
      positive: feedbackList?.filter((f) => f.rating === 1).length || 0,
      negative: feedbackList?.filter((f) => f.rating === -1).length || 0,
    };

    // Convert ratings to string format
    const formattedFeedback = feedbackList?.map((f) => ({
      ...f,
      rating: intToRating(f.rating),
    })) || [];

    return NextResponse.json({
      feedback: formattedFeedback,
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
    const effectiveUserId = DEMO_USER_ID;
    console.log('Feedback API DELETE: Using admin client with demo user');

    let deleteQuery = supabase.from('feedback').delete().eq('user_id', effectiveUserId);

    if (feedbackId) {
      deleteQuery = deleteQuery.eq('id', feedbackId);
    } else if (messageId) {
      // Verify user has access to the message first
      const accessResult = await verifyMessageAccess(supabase, messageId, effectiveUserId);

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
