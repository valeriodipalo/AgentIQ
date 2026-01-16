/**
 * Admin Invite Codes API
 * GET /api/admin/companies/[id]/invites - List invite codes for a company
 * POST /api/admin/companies/[id]/invites - Create a new invite code
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import type { APIError } from '@/types';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

interface CreateInviteRequest {
  code?: string; // Optional custom code
  max_uses?: number | null;
  expires_in_days?: number | null;
  notes?: string;
}

/**
 * Generate a random invite code
 */
function generateInviteCode(prefix: string): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid confusing chars like 0/O, 1/I
  let random = '';
  for (let i = 0; i < 4; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix.toUpperCase().slice(0, 4)}-${random}`;
}

/**
 * Validate UUID format
 */
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * GET /api/admin/companies/[id]/invites
 * List all invite codes for a company
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: companyId } = await params;

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

    // Verify company exists
    const { data: company, error: companyError } = await supabase
      .from('tenants')
      .select('id, name, slug')
      .eq('id', companyId)
      .single();

    if (companyError || !company) {
      return NextResponse.json<APIError>(
        { code: 'NOT_FOUND', message: 'Company not found' },
        { status: 404 }
      );
    }

    // Get invite codes with redemption counts
    const { data: invites, error: invitesError } = await supabase
      .from('invite_codes')
      .select(`
        id,
        code,
        max_uses,
        current_uses,
        expires_at,
        notes,
        is_active,
        created_at,
        updated_at,
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
      .order('created_at', { ascending: false });

    if (invitesError) {
      console.error('Error fetching invites:', invitesError);
      return NextResponse.json<APIError>(
        { code: 'SUPABASE_ERROR', message: 'Failed to fetch invite codes' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      company: {
        id: company.id,
        name: company.name,
        slug: company.slug,
      },
      invites: invites || [],
      demo_mode: isDemoMode,
    });
  } catch (error) {
    console.error('Admin invites API error:', error);
    return NextResponse.json<APIError>(
      { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/companies/[id]/invites
 * Create a new invite code
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: companyId } = await params;

    if (!companyId || !isValidUUID(companyId)) {
      return NextResponse.json<APIError>(
        { code: 'VALIDATION_ERROR', message: 'Invalid company ID' },
        { status: 400 }
      );
    }

    const body: CreateInviteRequest = await request.json();
    const { code, max_uses, expires_in_days, notes } = body;

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

    // Get company info for code generation
    const { data: company, error: companyError } = await supabase
      .from('tenants')
      .select('id, name, slug')
      .eq('id', companyId)
      .single();

    if (companyError || !company) {
      return NextResponse.json<APIError>(
        { code: 'NOT_FOUND', message: 'Company not found' },
        { status: 404 }
      );
    }

    // Generate or validate code
    let inviteCode: string;
    if (code) {
      // Custom code - validate format
      const normalizedCode = code.trim().toUpperCase();
      if (!/^[A-Z0-9-]{4,20}$/.test(normalizedCode)) {
        return NextResponse.json<APIError>(
          { code: 'VALIDATION_ERROR', message: 'Code must be 4-20 characters, letters, numbers, and hyphens only' },
          { status: 400 }
        );
      }

      // Check if code already exists
      const { data: existing } = await supabase
        .from('invite_codes')
        .select('id')
        .eq('code', normalizedCode)
        .single();

      if (existing) {
        return NextResponse.json<APIError>(
          { code: 'VALIDATION_ERROR', message: 'This code already exists' },
          { status: 409 }
        );
      }

      inviteCode = normalizedCode;
    } else {
      // Generate unique code
      let attempts = 0;
      do {
        inviteCode = generateInviteCode(company.slug);
        const { data: existing } = await supabase
          .from('invite_codes')
          .select('id')
          .eq('code', inviteCode)
          .single();

        if (!existing) break;
        attempts++;
      } while (attempts < 10);

      if (attempts >= 10) {
        return NextResponse.json<APIError>(
          { code: 'INTERNAL_ERROR', message: 'Failed to generate unique code' },
          { status: 500 }
        );
      }
    }

    // Calculate expiration
    let expiresAt: string | null = null;
    if (expires_in_days && expires_in_days > 0) {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + expires_in_days);
      expiresAt = expirationDate.toISOString();
    }

    // Create invite code
    const { data: newInvite, error: createError } = await supabase
      .from('invite_codes')
      .insert({
        tenant_id: companyId,
        code: inviteCode,
        max_uses: max_uses || null,
        expires_at: expiresAt,
        notes: notes?.trim() || null,
        created_by: null, // Demo mode - no authenticated user
        is_active: true,
      })
      .select()
      .single();

    if (createError || !newInvite) {
      console.error('Error creating invite:', createError);
      return NextResponse.json<APIError>(
        { code: 'SUPABASE_ERROR', message: 'Failed to create invite code' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      invite: newInvite,
    }, { status: 201 });
  } catch (error) {
    console.error('Admin invites API error:', error);
    return NextResponse.json<APIError>(
      { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
