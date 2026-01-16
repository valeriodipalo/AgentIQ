/**
 * Single Chatbot API Route
 * GET /api/chatbots/[id]
 * Returns a specific chatbot's public info
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
 * Validate UUID format
 */
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: chatbotId } = await params;

    if (!chatbotId || !isValidUUID(chatbotId)) {
      return NextResponse.json<APIError>(
        { code: 'VALIDATION_ERROR', message: 'Invalid chatbot ID' },
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
    console.log('Chatbot API: Using admin client');

    // Fetch chatbot with public fields only
    const { data: chatbot, error: queryError } = await supabase
      .from('chatbots')
      .select('id, name, description, model, is_published, created_at')
      .eq('id', chatbotId)
      .eq('is_published', true)
      .single();

    if (queryError || !chatbot) {
      return NextResponse.json<APIError>(
        { code: 'NOT_FOUND', message: 'Chatbot not found or not published' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: chatbot.id,
      name: chatbot.name,
      description: chatbot.description,
      model: chatbot.model,
      created_at: chatbot.created_at,
    });
  } catch (error) {
    console.error('Chatbot API error:', error);
    return NextResponse.json<APIError>(
      { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
