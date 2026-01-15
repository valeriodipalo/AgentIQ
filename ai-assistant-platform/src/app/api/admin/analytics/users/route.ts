/**
 * Admin Analytics Users API Route
 * Returns user-level analytics for a company
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import type { APIError } from '@/types';

/**
 * Validate UUID format
 */
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * User analytics data
 */
interface UserAnalytics {
  id: string;
  name: string | null;
  email: string;
  role: string | null;
  conversation_count: number;
  message_count: number;
  feedback: {
    positive: number;
    negative: number;
    total: number;
  };
  last_active: string | null;
  created_at: string | null;
}

/**
 * GET /api/admin/analytics/users
 * Returns user analytics for a company
 *
 * Query Parameters:
 * - company_id: Required - Filter by company
 * - page: Page number (default: 1)
 * - per_page: Items per page (default: 20, max: 100)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const perPage = parseInt(searchParams.get('per_page') || '20', 10);

    // Validate company_id
    if (!companyId) {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: 'company_id is required',
        },
        { status: 400 }
      );
    }

    if (!isValidUUID(companyId)) {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid company_id format',
        },
        { status: 400 }
      );
    }

    // Validate pagination
    if (page < 1 || perPage < 1 || perPage > 100) {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid pagination parameters',
        },
        { status: 400 }
      );
    }

    // Use admin client to bypass RLS
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

    // Calculate offset
    const offset = (page - 1) * perPage;

    // Fetch users for the company
    const { data: users, error: usersError, count } = await supabase
      .from('users')
      .select('id, name, email, role, last_active_at, created_at', { count: 'exact' })
      .eq('tenant_id', companyId)
      .order('last_active_at', { ascending: false, nullsFirst: false })
      .range(offset, offset + perPage - 1);

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json<APIError>(
        {
          code: 'SUPABASE_ERROR',
          message: 'Error fetching users',
        },
        { status: 500 }
      );
    }

    if (!users || users.length === 0) {
      return NextResponse.json({
        company: { id: company.id, name: company.name },
        users: [],
        pagination: {
          page,
          per_page: perPage,
          total: 0,
          total_pages: 0,
        },
      });
    }

    // Fetch stats for each user
    const userAnalytics: UserAnalytics[] = await Promise.all(
      users.map(async (user) => {
        // Get conversation count and IDs
        const { data: conversations, count: conversationCount } = await supabase
          .from('conversations')
          .select('id', { count: 'exact' })
          .eq('user_id', user.id);

        const conversationIds = conversations?.map(c => c.id) || [];

        // Get message count (user messages only)
        let messageCount = 0;
        if (conversationIds.length > 0) {
          const { count } = await supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .in('conversation_id', conversationIds)
            .eq('role', 'user');
          messageCount = count || 0;
        }

        // Get feedback given by this user
        const { data: feedback } = await supabase
          .from('feedback')
          .select('rating')
          .eq('user_id', user.id);

        const positiveFeedback = feedback?.filter(f => f.rating === 1).length || 0;
        const negativeFeedback = feedback?.filter(f => f.rating === -1).length || 0;
        const totalFeedback = feedback?.length || 0;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          conversation_count: conversationCount || 0,
          message_count: messageCount,
          feedback: {
            positive: positiveFeedback,
            negative: negativeFeedback,
            total: totalFeedback,
          },
          last_active: user.last_active_at,
          created_at: user.created_at,
        };
      })
    );

    return NextResponse.json({
      company: { id: company.id, name: company.name },
      users: userAnalytics,
      pagination: {
        page,
        per_page: perPage,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / perPage),
      },
    });
  } catch (error) {
    console.error('Admin analytics users API error:', error);
    return NextResponse.json<APIError>(
      {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
