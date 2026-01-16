/**
 * Company Users API Route
 * Handles listing and creating users for a specific company
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
 * Create user request body
 */
interface CreateUserRequest {
  email: string;
  name?: string;
  role?: 'admin' | 'member' | 'guest';
}

/**
 * Validate UUID format
 */
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Validate email format
 */
function validateEmail(email: unknown): string | null {
  if (!email || typeof email !== 'string') {
    return 'email is required and must be a string';
  }
  if (email.trim().length === 0) {
    return 'email cannot be empty';
  }
  if (email.length > 255) {
    return 'email must be 255 characters or less';
  }
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'email must be a valid email address';
  }
  return null;
}

/**
 * Validate user name
 */
function validateName(name: unknown): string | null {
  if (name === undefined || name === null) {
    return null; // Optional
  }
  if (typeof name !== 'string') {
    return 'name must be a string';
  }
  if (name.length > 255) {
    return 'name must be 255 characters or less';
  }
  return null;
}

/**
 * Validate user role
 */
function validateRole(role: unknown): string | null {
  if (role === undefined || role === null) {
    return null; // Optional, defaults to 'member'
  }
  const validRoles = ['admin', 'member', 'guest'];
  if (!validRoles.includes(role as string)) {
    return 'role must be one of: admin, member, guest';
  }
  return null;
}

/**
 * GET /api/admin/companies/[id]/users
 * Lists users for a specific company with pagination
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: companyId } = await params;

    if (!companyId) {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: 'Company ID is required',
        },
        { status: 400 }
      );
    }

    if (!isValidUUID(companyId)) {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid company ID format',
        },
        { status: 400 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const perPage = parseInt(searchParams.get('per_page') || '20', 10);
    const search = searchParams.get('search')?.trim();
    const role = searchParams.get('role')?.trim();

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
    const isDemoMode = true;
    console.log('Admin company users API: Using demo mode');

    // Verify company exists
    const { data: company, error: companyError } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('id', companyId)
      .single();

    if (companyError || !company) {
      return NextResponse.json<APIError>(
        {
          code: 'NOT_FOUND',
          message: 'Company not found',
        },
        { status: 404 }
      );
    }

    // Build query for users
    const offset = (page - 1) * perPage;
    let query = supabase
      .from('users')
      .select('id, email, name, role, is_active, last_active_at, created_at, updated_at', { count: 'exact' })
      .eq('tenant_id', companyId)
      .order('created_at', { ascending: false });

    // Add search filter if provided
    if (search) {
      query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%`);
    }

    // Add role filter if provided
    if (role) {
      query = query.eq('role', role);
    }

    const { data: users, error: queryError, count } = await query
      .range(offset, offset + perPage - 1);

    if (queryError) {
      console.error('Error fetching company users:', queryError);
      return NextResponse.json<APIError>(
        {
          code: 'SUPABASE_ERROR',
          message: 'Error fetching users',
          details: { error: queryError.message },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      company: {
        id: company.id,
        name: company.name,
      },
      users: users || [],
      pagination: {
        total: count || 0,
        page,
        per_page: perPage,
        has_more: (count || 0) > offset + perPage,
      },
      demo_mode: isDemoMode,
    });
  } catch (error) {
    console.error('Admin company users API error:', error);
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
 * POST /api/admin/companies/[id]/users
 * Creates a new user in the company
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: companyId } = await params;

    if (!companyId) {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: 'Company ID is required',
        },
        { status: 400 }
      );
    }

    if (!isValidUUID(companyId)) {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid company ID format',
        },
        { status: 400 }
      );
    }

    const body: CreateUserRequest = await request.json();
    const { email, name, role } = body;

    // Validate fields
    const emailError = validateEmail(email);
    if (emailError) {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: emailError,
        },
        { status: 400 }
      );
    }

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

    const roleError = validateRole(role);
    if (roleError) {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: roleError,
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
    const isDemoMode = true;
    console.log('Admin company users API: Using demo mode for creation');

    // Verify company exists
    const { data: company, error: companyError } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('id', companyId)
      .single();

    if (companyError || !company) {
      return NextResponse.json<APIError>(
        {
          code: 'NOT_FOUND',
          message: 'Company not found',
        },
        { status: 404 }
      );
    }

    // Check if email already exists in this company
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('tenant_id', companyId)
      .eq('email', email.toLowerCase().trim())
      .single();

    if (existingUser) {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: 'A user with this email already exists in this company',
        },
        { status: 409 }
      );
    }

    // Create user
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        tenant_id: companyId,
        email: email.toLowerCase().trim(),
        name: name?.trim() || null,
        role: role || 'member',
        is_active: true,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating user:', insertError);
      return NextResponse.json<APIError>(
        {
          code: 'SUPABASE_ERROR',
          message: 'Error creating user',
          details: { error: insertError.message },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ...newUser,
      company: {
        id: company.id,
        name: company.name,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Admin company users API error:', error);
    return NextResponse.json<APIError>(
      {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
