/**
 * Admin Chatbots API Route
 * Handles listing and creating chatbots for admin users
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import type { APIError } from '@/types';

// Demo mode constants (used as fallback for created_by)
const DEMO_USER_ID = '00000000-0000-0000-0000-000000000002';

/**
 * Chatbot type definition with company info
 */
export interface ChatbotWithCompany {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  system_prompt: string | null;
  model: string;
  temperature: number;
  max_tokens: number;
  settings: Record<string, unknown> | null;
  is_published: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  company?: {
    id: string;
    name: string;
    slug: string;
  };
}

/**
 * Create chatbot request body
 */
interface CreateChatbotRequest {
  tenant_id: string;
  name: string;
  description?: string;
  system_prompt?: string;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  settings?: Record<string, unknown>;
  is_published?: boolean;
}

/**
 * Validate chatbot name
 */
function validateName(name: unknown): string | null {
  if (!name || typeof name !== 'string') {
    return 'name is required and must be a string';
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
 * Validate temperature
 */
function validateTemperature(temperature: unknown): string | null {
  if (temperature === undefined || temperature === null) {
    return null;
  }
  if (typeof temperature !== 'number' || temperature < 0 || temperature > 2) {
    return 'temperature must be a number between 0 and 2';
  }
  return null;
}

/**
 * Validate max_tokens
 */
function validateMaxTokens(maxTokens: unknown): string | null {
  if (maxTokens === undefined || maxTokens === null) {
    return null;
  }
  if (typeof maxTokens !== 'number' || maxTokens < 1 || maxTokens > 128000) {
    return 'max_tokens must be a number between 1 and 128000';
  }
  return null;
}

/**
 * Validate UUID format
 */
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * GET /api/admin/chatbots
 * Lists all chatbots (admin sees all, including unpublished)
 * Supports filtering by tenant_id (company)
 */
export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const perPage = parseInt(searchParams.get('per_page') || '20', 10);
    const search = searchParams.get('search')?.trim();
    const publishedOnly = searchParams.get('published') === 'true';
    const tenantIdFilter = searchParams.get('tenant_id')?.trim();

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

    // Validate tenant_id format if provided
    if (tenantIdFilter && !isValidUUID(tenantIdFilter)) {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid tenant_id format',
        },
        { status: 400 }
      );
    }

    // Use admin client to bypass RLS for admin queries
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

    // Build query
    const offset = (page - 1) * perPage;
    let query = supabase
      .from('chatbots')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Filter by tenant_id if provided
    if (tenantIdFilter) {
      query = query.eq('tenant_id', tenantIdFilter);
    }

    // Filter by published status if requested
    if (publishedOnly) {
      query = query.eq('is_published', true);
    }

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

    // Fetch company info for each chatbot
    const chatbotsWithCompany: ChatbotWithCompany[] = await Promise.all(
      (chatbots || []).map(async (chatbot) => {
        const { data: tenant } = await supabase
          .from('tenants')
          .select('id, name, slug')
          .eq('id', chatbot.tenant_id)
          .single();

        return {
          ...chatbot,
          settings: chatbot.settings as Record<string, unknown> | null,
          company: tenant ? {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
          } : undefined,
        };
      })
    );

    return NextResponse.json({
      chatbots: chatbotsWithCompany,
      pagination: {
        total: count || 0,
        page,
        per_page: perPage,
        has_more: (count || 0) > offset + perPage,
      },
    });
  } catch (error) {
    console.error('Admin chatbots API error:', error);
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
 * POST /api/admin/chatbots
 * Creates a new chatbot
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateChatbotRequest = await request.json();
    const { tenant_id, name, description, system_prompt, model, temperature, max_tokens, settings, is_published } = body;

    // Validate tenant_id (required)
    if (!tenant_id || typeof tenant_id !== 'string') {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: 'tenant_id is required',
        },
        { status: 400 }
      );
    }

    if (!isValidUUID(tenant_id)) {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid tenant_id format',
        },
        { status: 400 }
      );
    }

    // Validate required fields
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

    // Validate optional fields
    const tempError = validateTemperature(temperature);
    if (tempError) {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: tempError,
        },
        { status: 400 }
      );
    }

    const tokensError = validateMaxTokens(max_tokens);
    if (tokensError) {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: tokensError,
        },
        { status: 400 }
      );
    }

    // Validate description length
    if (description && description.length > 1000) {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: 'description must be 1000 characters or less',
        },
        { status: 400 }
      );
    }

    // Validate system_prompt length
    if (system_prompt && system_prompt.length > 10000) {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: 'system_prompt must be 10000 characters or less',
        },
        { status: 400 }
      );
    }

    // Use admin client to bypass RLS for admin operations
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

    // Verify tenant exists
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('id', tenant_id)
      .single();

    if (tenantError || !tenant) {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: 'Company not found',
        },
        { status: 400 }
      );
    }

    // Create chatbot
    const { data: chatbot, error: insertError } = await supabase
      .from('chatbots')
      .insert({
        tenant_id: tenant_id,
        name: name.trim(),
        description: description?.trim() || null,
        system_prompt: system_prompt || 'You are a helpful AI assistant.',
        model: model || 'gpt-4-turbo-preview',
        temperature: temperature ?? 0.7,
        max_tokens: max_tokens ?? 4096,
        settings: settings ? JSON.parse(JSON.stringify(settings)) : null,
        is_published: is_published ?? false,
        created_by: DEMO_USER_ID, // Use demo user as created_by for now
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating chatbot:', insertError);
      return NextResponse.json<APIError>(
        {
          code: 'SUPABASE_ERROR',
          message: 'Error creating chatbot',
          details: { error: insertError.message },
        },
        { status: 500 }
      );
    }

    return NextResponse.json(chatbot, { status: 201 });
  } catch (error) {
    console.error('Admin chatbots API error:', error);
    return NextResponse.json<APIError>(
      {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
