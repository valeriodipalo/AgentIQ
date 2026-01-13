/**
 * Admin Companies API Route
 * Handles listing and creating companies (tenants) for admin users
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import type { APIError } from '@/types';

// Demo mode constants
const DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Company type with stats
 */
export interface CompanyWithStats {
  id: string;
  name: string;
  slug: string;
  branding: Record<string, unknown> | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  stats: {
    user_count: number;
    chatbot_count: number;
    conversation_count: number;
  };
}

/**
 * Create company request body
 */
interface CreateCompanyRequest {
  name: string;
  slug: string;
  branding?: Record<string, unknown>;
}

/**
 * Validate company name
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
 * Validate slug format (URL-safe)
 */
function validateSlug(slug: unknown): string | null {
  if (!slug || typeof slug !== 'string') {
    return 'slug is required and must be a string';
  }
  if (slug.trim().length === 0) {
    return 'slug cannot be empty';
  }
  if (slug.length > 100) {
    return 'slug must be 100 characters or less';
  }
  // URL-safe: only lowercase letters, numbers, and hyphens
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  if (!slugRegex.test(slug)) {
    return 'slug must be URL-safe (lowercase letters, numbers, and hyphens only, no leading/trailing hyphens)';
  }
  return null;
}

/**
 * GET /api/admin/companies
 * Lists all companies (tenants) with stats
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

    // Get Supabase client and check authentication
    const authClient = await createServerClient();
    const { data: { user } } = await authClient.auth.getUser();

    // Demo mode: use admin client to bypass RLS
    const isDemoMode = !user;
    const supabase = isDemoMode ? createAdminClient() : authClient;

    if (isDemoMode) {
      console.log('Admin companies API: Using demo mode with admin client');
    }

    // Build query for tenants
    const offset = (page - 1) * perPage;
    let query = supabase
      .from('tenants')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Add search filter if provided
    if (search) {
      query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%`);
    }

    const { data: tenants, error: queryError, count } = await query
      .range(offset, offset + perPage - 1);

    if (queryError) {
      console.error('Error fetching companies:', queryError);
      return NextResponse.json<APIError>(
        {
          code: 'SUPABASE_ERROR',
          message: 'Error fetching companies',
          details: { error: queryError.message },
        },
        { status: 500 }
      );
    }

    // Fetch stats for each tenant
    const companiesWithStats: CompanyWithStats[] = await Promise.all(
      (tenants || []).map(async (tenant) => {
        // Get user count
        const { count: userCount } = await supabase
          .from('users')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenant.id);

        // Get chatbot count
        const { count: chatbotCount } = await supabase
          .from('chatbots')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenant.id);

        // Get conversation count
        const { count: conversationCount } = await supabase
          .from('conversations')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenant.id);

        return {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          branding: tenant.branding as Record<string, unknown> | null,
          is_active: tenant.is_active,
          created_at: tenant.created_at,
          updated_at: tenant.updated_at,
          stats: {
            user_count: userCount || 0,
            chatbot_count: chatbotCount || 0,
            conversation_count: conversationCount || 0,
          },
        };
      })
    );

    return NextResponse.json({
      companies: companiesWithStats,
      pagination: {
        total: count || 0,
        page,
        per_page: perPage,
        has_more: (count || 0) > offset + perPage,
      },
      demo_mode: isDemoMode,
    });
  } catch (error) {
    console.error('Admin companies API error:', error);
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
 * POST /api/admin/companies
 * Creates a new company (tenant)
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateCompanyRequest = await request.json();
    const { name, slug, branding } = body;

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

    const slugError = validateSlug(slug);
    if (slugError) {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: slugError,
        },
        { status: 400 }
      );
    }

    // Get Supabase client and check authentication
    const authClient = await createServerClient();
    const { data: { user } } = await authClient.auth.getUser();

    // Demo mode: use admin client to bypass RLS
    const isDemoMode = !user;
    const supabase = isDemoMode ? createAdminClient() : authClient;

    if (isDemoMode) {
      console.log('Admin companies API: Using demo mode for creation');
    }

    // Check if slug is unique
    const { data: existingSlug } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', slug.toLowerCase())
      .single();

    if (existingSlug) {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: 'A company with this slug already exists',
        },
        { status: 409 }
      );
    }

    // Create company
    const { data: company, error: insertError } = await supabase
      .from('tenants')
      .insert({
        name: name.trim(),
        slug: slug.toLowerCase(),
        branding: branding ? JSON.parse(JSON.stringify(branding)) : null,
        is_active: true,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating company:', insertError);
      return NextResponse.json<APIError>(
        {
          code: 'SUPABASE_ERROR',
          message: 'Error creating company',
          details: { error: insertError.message },
        },
        { status: 500 }
      );
    }

    return NextResponse.json(company, { status: 201 });
  } catch (error) {
    console.error('Admin companies API error:', error);
    return NextResponse.json<APIError>(
      {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
