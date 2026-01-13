/**
 * Invite Code Redemption API
 * POST /api/invite/redeem
 * Redeems an invite code, creates user, returns session
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import type { APIError } from '@/types';

interface RedeemRequest {
  code: string;
  name: string;
  email: string;
}

interface RedeemSuccessResponse {
  success: true;
  user: {
    id: string;
    name: string;
    email: string;
  };
  company: {
    id: string;
    name: string;
    slug: string;
    branding: {
      primary_color?: string;
      logo_url?: string;
    } | null;
  };
  session_token: string;
}

interface RedeemErrorResponse {
  success: false;
  error: 'INVALID_CODE' | 'EMAIL_EXISTS' | 'VALIDATION_ERROR';
  message: string;
}

type RedeemResponse = RedeemSuccessResponse | RedeemErrorResponse;

/**
 * Generate a simple session token
 */
function generateSessionToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export async function POST(request: NextRequest) {
  try {
    const body: RedeemRequest = await request.json();
    const { code, name, email } = body;

    // Validate inputs
    if (!code || typeof code !== 'string') {
      return NextResponse.json<RedeemResponse>({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Invite code is required',
      });
    }

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json<RedeemResponse>({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Please enter your full name (at least 2 characters)',
      });
    }

    if (!email || typeof email !== 'string' || !isValidEmail(email)) {
      return NextResponse.json<RedeemResponse>({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Please enter a valid email address',
      });
    }

    const normalizedCode = code.trim().toUpperCase();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = name.trim();

    const supabase = createAdminClient();

    // Look up and validate the invite code
    const { data: invite, error: inviteError } = await supabase
      .from('invite_codes')
      .select(`
        id,
        code,
        max_uses,
        current_uses,
        expires_at,
        is_active,
        tenant_id,
        tenant:tenants (
          id,
          name,
          slug,
          branding
        )
      `)
      .eq('code', normalizedCode)
      .single();

    if (inviteError || !invite) {
      return NextResponse.json<RedeemResponse>({
        success: false,
        error: 'INVALID_CODE',
        message: 'This invite code does not exist.',
      });
    }

    // Validate code status
    if (!invite.is_active) {
      return NextResponse.json<RedeemResponse>({
        success: false,
        error: 'INVALID_CODE',
        message: 'This invite code has been deactivated.',
      });
    }

    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return NextResponse.json<RedeemResponse>({
        success: false,
        error: 'INVALID_CODE',
        message: 'This invite code has expired.',
      });
    }

    if (invite.max_uses !== null && (invite.current_uses ?? 0) >= invite.max_uses) {
      return NextResponse.json<RedeemResponse>({
        success: false,
        error: 'INVALID_CODE',
        message: 'This invite code has reached its maximum number of uses.',
      });
    }

    const tenant = invite.tenant as {
      id: string;
      name: string;
      slug: string;
      branding: { primary_color?: string; logo_url?: string } | null;
    };

    // Check if email already exists for this tenant
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('email', normalizedEmail)
      .eq('tenant_id', invite.tenant_id)
      .single();

    let userId: string;
    let userName: string;

    if (existingUser) {
      // User already exists in this company - return their session
      userId = existingUser.id;
      userName = existingUser.name ?? '';

      // Update last active
      await supabase
        .from('users')
        .update({ last_active_at: new Date().toISOString() })
        .eq('id', userId);
    } else {
      // Create new user
      const sessionToken = generateSessionToken();

      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          tenant_id: invite.tenant_id,
          name: normalizedName,
          email: normalizedEmail,
          role: 'user',
          invited_via: invite.id,
          last_active_at: new Date().toISOString(),
        })
        .select('id, name, email')
        .single();

      if (createError || !newUser) {
        console.error('Error creating user:', createError);
        return NextResponse.json<APIError>(
          {
            code: 'SUPABASE_ERROR',
            message: 'Failed to create user account',
          },
          { status: 500 }
        );
      }

      userId = newUser.id;
      userName = newUser.name ?? name;

      // Record the redemption
      await supabase.from('invite_redemptions').insert({
        invite_code_id: invite.id,
        user_id: userId,
      });

      // Increment the usage count
      await supabase
        .from('invite_codes')
        .update({
          current_uses: (invite.current_uses ?? 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', invite.id);
    }

    // Generate session token
    const sessionToken = generateSessionToken();

    return NextResponse.json<RedeemSuccessResponse>({
      success: true,
      user: {
        id: userId,
        name: userName,
        email: normalizedEmail,
      },
      company: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        branding: tenant.branding,
      },
      session_token: sessionToken,
    });
  } catch (error) {
    console.error('Invite redemption error:', error);
    return NextResponse.json<APIError>(
      {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
