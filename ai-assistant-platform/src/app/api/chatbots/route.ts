/**
 * Public Chatbots API Route
 * Lists only published chatbots for users (non-admin endpoint)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import type { APIError } from '@/types';

// Demo mode constants
const DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Public chatbot response (excludes sensitive fields)
 */
interface PublicChatbot {
  id: string;
  name: string;
  description: string | null;
  model: string;
  created_at: string;
}

/**
 * GET /api/chatbots
 * Lists only published chatbots for the tenant (public endpoint for users)
 */
export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const perPage = parseInt(searchParams.get('per_page') || '20', 10);
    const search = searchParams.get('search')?.trim();

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

    const tenantId = DEMO_TENANT_ID;
    console.log('Public chatbots API: Using admin client with demo tenant');

    // Build query - only select published chatbots and public fields
    const offset = (page - 1) * perPage;
    let query = supabase
      .from('chatbots')
      .select('id, name, description, model, created_at', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .eq('is_published', true)
      .order('name', { ascending: true });

    // Add search filter if provided
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data: chatbots, error: queryError, count } = await query
      .range(offset, offset + perPage - 1);

    if (queryError) {
      console.error('Error fetching chatbots:', queryError);
      return NextResponse.json<APIError>(
        {
          code: 'SUPABASE_ERROR',
          message: 'Error fetching chatbots',
          details: { error: queryError.message },
        },
        { status: 500 }
      );
    }

    // Map to public chatbot format
    const publicChatbots: PublicChatbot[] = (chatbots || []).map(chatbot => ({
      id: chatbot.id,
      name: chatbot.name,
      description: chatbot.description,
      model: chatbot.model,
      created_at: chatbot.created_at,
    }));

    return NextResponse.json({
      chatbots: publicChatbots,
      pagination: {
        total: count || 0,
        page,
        per_page: perPage,
        has_more: (count || 0) > offset + perPage,
      },
      demo_mode: true,
    });
  } catch (error) {
    console.error('Public chatbots API error:', error);
    return NextResponse.json<APIError>(
      {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
