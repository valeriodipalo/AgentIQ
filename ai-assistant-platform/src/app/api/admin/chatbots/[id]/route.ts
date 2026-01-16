/**
 * Single Chatbot API Route
 * Handles operations on a specific chatbot (GET, PUT, DELETE)
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
 * Update chatbot request body
 */
interface UpdateChatbotRequest {
  tenant_id?: string;
  name?: string;
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
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * GET /api/admin/chatbots/[id]
 * Fetches a specific chatbot by ID (admin can access any chatbot)
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: chatbotId } = await params;

    if (!chatbotId) {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: 'Chatbot ID is required',
        },
        { status: 400 }
      );
    }

    if (!isValidUUID(chatbotId)) {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid chatbot ID format',
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

    // Fetch chatbot with company info
    const { data: chatbot, error: queryError } = await supabase
      .from('chatbots')
      .select('*')
      .eq('id', chatbotId)
      .single();

    if (queryError || !chatbot) {
      return NextResponse.json<APIError>(
        {
          code: 'NOT_FOUND',
          message: 'Chatbot not found',
        },
        { status: 404 }
      );
    }

    // Fetch company info
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, name, slug')
      .eq('id', chatbot.tenant_id)
      .single();

    return NextResponse.json({
      ...chatbot,
      company: tenant ? {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
      } : null,
    });
  } catch (error) {
    console.error('Admin chatbot API error:', error);
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
 * PUT /api/admin/chatbots/[id]
 * Updates a specific chatbot (admin can update any chatbot)
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: chatbotId } = await params;

    if (!chatbotId) {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: 'Chatbot ID is required',
        },
        { status: 400 }
      );
    }

    if (!isValidUUID(chatbotId)) {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid chatbot ID format',
        },
        { status: 400 }
      );
    }

    const body: UpdateChatbotRequest = await request.json();
    const { tenant_id, name, description, system_prompt, model, temperature, max_tokens, settings, is_published } = body;

    // Validate tenant_id if provided
    if (tenant_id !== undefined && tenant_id !== null) {
      if (!isValidUUID(tenant_id)) {
        return NextResponse.json<APIError>(
          {
            code: 'VALIDATION_ERROR',
            message: 'Invalid tenant_id format',
          },
          { status: 400 }
        );
      }
    }

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
    if (description !== undefined && description !== null && description.length > 1000) {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: 'description must be 1000 characters or less',
        },
        { status: 400 }
      );
    }

    // Validate system_prompt length
    if (system_prompt !== undefined && system_prompt !== null && system_prompt.length > 10000) {
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

    // Verify chatbot exists
    const { data: existing, error: fetchError } = await supabase
      .from('chatbots')
      .select('id, settings')
      .eq('id', chatbotId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json<APIError>(
        {
          code: 'NOT_FOUND',
          message: 'Chatbot not found',
        },
        { status: 404 }
      );
    }

    // If changing tenant_id, verify the new tenant exists
    if (tenant_id !== undefined && tenant_id !== null) {
      const { data: newTenant, error: tenantError } = await supabase
        .from('tenants')
        .select('id')
        .eq('id', tenant_id)
        .single();

      if (tenantError || !newTenant) {
        return NextResponse.json<APIError>(
          {
            code: 'VALIDATION_ERROR',
            message: 'Target company not found',
          },
          { status: 400 }
        );
      }
    }

    // Build update object
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (tenant_id !== undefined) {
      updates.tenant_id = tenant_id;
    }

    if (name !== undefined) {
      updates.name = name.trim();
    }

    if (description !== undefined) {
      updates.description = description?.trim() || null;
    }

    if (system_prompt !== undefined) {
      updates.system_prompt = system_prompt || null;
    }

    if (model !== undefined) {
      updates.model = model;
    }

    if (temperature !== undefined) {
      updates.temperature = temperature;
    }

    if (max_tokens !== undefined) {
      updates.max_tokens = max_tokens;
    }

    if (settings !== undefined) {
      // Merge with existing settings
      const existingSettings = existing.settings as Record<string, unknown> || {};
      updates.settings = {
        ...existingSettings,
        ...settings,
      };
    }

    if (is_published !== undefined) {
      updates.is_published = is_published;
    }

    // Update chatbot
    const { data: chatbot, error: updateError } = await supabase
      .from('chatbots')
      .update(updates)
      .eq('id', chatbotId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating chatbot:', updateError);
      return NextResponse.json<APIError>(
        {
          code: 'SUPABASE_ERROR',
          message: 'Error updating chatbot',
          details: { error: updateError.message },
        },
        { status: 500 }
      );
    }

    return NextResponse.json(chatbot);
  } catch (error) {
    console.error('Admin chatbot API error:', error);
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
 * DELETE /api/admin/chatbots/[id]
 * Deletes a specific chatbot (admin can delete any chatbot)
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: chatbotId } = await params;

    if (!chatbotId) {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: 'Chatbot ID is required',
        },
        { status: 400 }
      );
    }

    if (!isValidUUID(chatbotId)) {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid chatbot ID format',
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

    // Verify chatbot exists
    const { data: existing, error: fetchError } = await supabase
      .from('chatbots')
      .select('id, name')
      .eq('id', chatbotId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json<APIError>(
        {
          code: 'NOT_FOUND',
          message: 'Chatbot not found',
        },
        { status: 404 }
      );
    }

    // Delete chatbot
    const { error: deleteError } = await supabase
      .from('chatbots')
      .delete()
      .eq('id', chatbotId);

    if (deleteError) {
      console.error('Error deleting chatbot:', deleteError);
      return NextResponse.json<APIError>(
        {
          code: 'SUPABASE_ERROR',
          message: 'Error deleting chatbot',
          details: { error: deleteError.message },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deleted_id: chatbotId,
      deleted_name: existing.name,
    });
  } catch (error) {
    console.error('Admin chatbot API error:', error);
    return NextResponse.json<APIError>(
      {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
