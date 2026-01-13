/**
 * Invite Code Validation API
 * POST /api/invite/validate
 * Validates an invite code and returns company info
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import type { APIError } from '@/types';

interface ValidateRequest {
  code: string;
}

interface ValidateSuccessResponse {
  valid: true;
  company: {
    id: string;
    name: string;
    slug: string;
    branding: {
      primary_color?: string;
      logo_url?: string;
    } | null;
  };
}

interface ValidateErrorResponse {
  valid: false;
  error: 'INVALID' | 'EXPIRED' | 'FULL' | 'INACTIVE';
  message: string;
}

type ValidateResponse = ValidateSuccessResponse | ValidateErrorResponse;

export async function POST(request: NextRequest) {
  try {
    const body: ValidateRequest = await request.json();
    const { code } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: 'Invite code is required',
        },
        { status: 400 }
      );
    }

    // Normalize code (uppercase, trim)
    const normalizedCode = code.trim().toUpperCase();

    // Use admin client to bypass RLS
    const supabase = createAdminClient();

    // Look up the invite code
    const { data: invite, error } = await supabase
      .from('invite_codes')
      .select(`
        id,
        code,
        max_uses,
        current_uses,
        expires_at,
        is_active,
        tenant:tenants (
          id,
          name,
          slug,
          branding
        )
      `)
      .eq('code', normalizedCode)
      .single();

    if (error || !invite) {
      return NextResponse.json<ValidateResponse>({
        valid: false,
        error: 'INVALID',
        message: 'This invite code does not exist. Please check for typos.',
      });
    }

    // Check if code is active
    if (!invite.is_active) {
      return NextResponse.json<ValidateResponse>({
        valid: false,
        error: 'INACTIVE',
        message: 'This invite code has been deactivated.',
      });
    }

    // Check if code has expired
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return NextResponse.json<ValidateResponse>({
        valid: false,
        error: 'EXPIRED',
        message: 'This invite code has expired. Please contact your administrator.',
      });
    }

    // Check if code has reached max uses
    if (invite.max_uses !== null && (invite.current_uses ?? 0) >= invite.max_uses) {
      return NextResponse.json<ValidateResponse>({
        valid: false,
        error: 'FULL',
        message: 'This invite code has reached its maximum number of uses.',
      });
    }

    // Get tenant info
    const tenant = invite.tenant as {
      id: string;
      name: string;
      slug: string;
      branding: { primary_color?: string; logo_url?: string } | null;
    };

    if (!tenant) {
      return NextResponse.json<ValidateResponse>({
        valid: false,
        error: 'INVALID',
        message: 'Company not found for this invite code.',
      });
    }

    return NextResponse.json<ValidateResponse>({
      valid: true,
      company: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        branding: tenant.branding,
      },
    });
  } catch (error) {
    console.error('Invite validation error:', error);
    return NextResponse.json<APIError>(
      {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
