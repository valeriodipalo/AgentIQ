/**
 * User Lookup API for Returning Users
 * POST /api/invite/lookup
 * Finds a user by email and returns their session
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import type { APIError } from '@/types';

interface LookupRequest {
  email: string;
}

interface LookupSuccessResponse {
  found: true;
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

interface LookupErrorResponse {
  found: false;
  message: string;
}

type LookupResponse = LookupSuccessResponse | LookupErrorResponse;

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
    const body: LookupRequest = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string' || !isValidEmail(email)) {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: 'Please enter a valid email address',
        },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const supabase = createAdminClient();

    // Look up user by email with their company info
    const { data: user, error } = await supabase
      .from('users')
      .select(`
        id,
        name,
        email,
        tenant:tenants (
          id,
          name,
          slug,
          branding
        )
      `)
      .eq('email', normalizedEmail)
      .single();

    if (error || !user) {
      return NextResponse.json<LookupResponse>({
        found: false,
        message: 'No account found with this email. Please use an invite code to join.',
      });
    }

    const tenant = user.tenant as {
      id: string;
      name: string;
      slug: string;
      branding: { primary_color?: string; logo_url?: string } | null;
    };

    if (!tenant) {
      return NextResponse.json<LookupResponse>({
        found: false,
        message: 'Your account is not associated with any company.',
      });
    }

    // Update last active
    await supabase
      .from('users')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', user.id);

    // Generate session token
    const sessionToken = generateSessionToken();

    return NextResponse.json<LookupSuccessResponse>({
      found: true,
      user: {
        id: user.id,
        name: user.name ?? '',
        email: user.email,
      },
      company: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        branding: tenant.branding as { logo_url?: string; primary_color?: string; } | null,
      },
      session_token: sessionToken,
    });
  } catch (error) {
    console.error('User lookup error:', error);
    return NextResponse.json<APIError>(
      {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
