/**
 * Single Invite Code API
 * GET /api/admin/companies/[id]/invites/[code] - Get invite details
 * PUT /api/admin/companies/[id]/invites/[code] - Update invite
 * DELETE /api/admin/companies/[id]/invites/[code] - Delete invite
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import type { APIError } from '@/types';

interface RouteParams {
  params: Promise<{
    id: string;
    code: string;
  }>;
}

interface UpdateInviteRequest {
  max_uses?: number | null;
  expires_at?: string | null;
  notes?: string | null;
  is_active?: boolean;
}

/**
 * Validate UUID format
 */
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * GET /api/admin/companies/[id]/invites/[code]
 * Get details of a specific invite code
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: companyId, code: inviteCode } = await params;

    if (!companyId || !isValidUUID(companyId)) {
      return NextResponse.json<APIError>(
        { code: 'VALIDATION_ERROR', message: 'Invalid company ID' },
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
    const isDemoMode = true;

    const { data: invite, error } = await supabase
      .from('invite_codes')
      .select(`
        *,
        invite_redemptions (
          id,
          redeemed_at,
          user:users (
            id,
            name,
            email
          )
        )
      `)
      .eq('tenant_id', companyId)
      .eq('code', inviteCode.toUpperCase())
      .single();

    if (error || !invite) {
      return NextResponse.json<APIError>(
        { code: 'NOT_FOUND', message: 'Invite code not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      invite,
      demo_mode: isDemoMode,
    });
  } catch (error) {
    console.error('Admin invite API error:', error);
    return NextResponse.json<APIError>(
      { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/companies/[id]/invites/[code]
 * Update an invite code
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: companyId, code: inviteCode } = await params;

    if (!companyId || !isValidUUID(companyId)) {
      return NextResponse.json<APIError>(
        { code: 'VALIDATION_ERROR', message: 'Invalid company ID' },
        { status: 400 }
      );
    }

    const body: UpdateInviteRequest = await request.json();
    const { max_uses, expires_at, notes, is_active } = body;

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
    const isDemoMode = true;

    // Verify invite exists
    const { data: existing, error: fetchError } = await supabase
      .from('invite_codes')
      .select('id')
      .eq('tenant_id', companyId)
      .eq('code', inviteCode.toUpperCase())
      .single();

    if (fetchError || !existing) {
      return NextResponse.json<APIError>(
        { code: 'NOT_FOUND', message: 'Invite code not found' },
        { status: 404 }
      );
    }

    // Build update object
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (max_uses !== undefined) {
      updates.max_uses = max_uses;
    }

    if (expires_at !== undefined) {
      updates.expires_at = expires_at;
    }

    if (notes !== undefined) {
      updates.notes = notes;
    }

    if (is_active !== undefined) {
      updates.is_active = is_active;
    }

    const { data: updated, error: updateError } = await supabase
      .from('invite_codes')
      .update(updates)
      .eq('id', existing.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating invite:', updateError);
      return NextResponse.json<APIError>(
        { code: 'SUPABASE_ERROR', message: 'Failed to update invite code' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      invite: updated,
    });
  } catch (error) {
    console.error('Admin invite API error:', error);
    return NextResponse.json<APIError>(
      { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/companies/[id]/invites/[code]
 * Delete an invite code
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: companyId, code: inviteCode } = await params;

    if (!companyId || !isValidUUID(companyId)) {
      return NextResponse.json<APIError>(
        { code: 'VALIDATION_ERROR', message: 'Invalid company ID' },
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
    const isDemoMode = true;

    // Verify invite exists
    const { data: existing, error: fetchError } = await supabase
      .from('invite_codes')
      .select('id, code, current_uses')
      .eq('tenant_id', companyId)
      .eq('code', inviteCode.toUpperCase())
      .single();

    if (fetchError || !existing) {
      return NextResponse.json<APIError>(
        { code: 'NOT_FOUND', message: 'Invite code not found' },
        { status: 404 }
      );
    }

    // Warn if code has been used
    if ((existing.current_uses ?? 0) > 0) {
      // Soft delete - just deactivate
      await supabase
        .from('invite_codes')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', existing.id);

      return NextResponse.json({
        success: true,
        deleted: false,
        deactivated: true,
        message: 'Code has been used and was deactivated instead of deleted',
      });
    }

    // Hard delete if never used
    const { error: deleteError } = await supabase
      .from('invite_codes')
      .delete()
      .eq('id', existing.id);

    if (deleteError) {
      console.error('Error deleting invite:', deleteError);
      return NextResponse.json<APIError>(
        { code: 'SUPABASE_ERROR', message: 'Failed to delete invite code' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deleted: true,
      code: existing.code,
    });
  } catch (error) {
    console.error('Admin invite API error:', error);
    return NextResponse.json<APIError>(
      { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
