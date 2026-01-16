/**
 * Company Chatbots API
 * GET /api/companies/[id]/chatbots
 * Returns published chatbots for a company
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
 * Validate UUID format
 */
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

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

    const supabase = createAdminClient();

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

    // Get published chatbots
    const { data: chatbots, error: chatbotsError } = await supabase
      .from('chatbots')
      .select('id, name, description, is_published')
      .eq('tenant_id', companyId)
      .eq('is_published', true)
      .order('name');

    if (chatbotsError) {
      console.error('Error fetching chatbots:', chatbotsError);
      return NextResponse.json<APIError>(
        { code: 'SUPABASE_ERROR', message: 'Failed to fetch chatbots' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      company: {
        id: company.id,
        name: company.name,
        slug: company.slug,
      },
      chatbots: chatbots || [],
    });
  } catch (error) {
    console.error('Company chatbots API error:', error);
    return NextResponse.json<APIError>(
      { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
