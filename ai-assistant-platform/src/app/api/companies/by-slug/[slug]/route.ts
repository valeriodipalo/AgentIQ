/**
 * Company Public API Route
 * Returns company info and published chatbots for a given company slug
 * Public endpoint - no authentication required
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import type { APIError } from '@/types';

/**
 * Public company info (excludes sensitive fields)
 */
interface PublicCompanyInfo {
  id: string;
  name: string;
  slug: string;
  branding: {
    primary_color?: string;
    logo_url?: string;
    company_name?: string;
  } | null;
}

/**
 * Public chatbot info (excludes sensitive fields like system_prompt)
 */
interface PublicChatbotInfo {
  id: string;
  name: string;
  description: string | null;
  model: string;
}

/**
 * GET /api/companies/by-slug/[slug]
 * Returns company info and list of published chatbots
 * Public endpoint - no authentication required
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!slug || typeof slug !== 'string') {
      return NextResponse.json<APIError>(
        {
          code: 'VALIDATION_ERROR',
          message: 'Company slug is required',
        },
        { status: 400 }
      );
    }

    // Get Supabase client
    const supabase = await createServerClient();

    // Look up tenant by slug
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name, slug, branding, is_active')
      .eq('slug', slug)
      .single();

    if (tenantError || !tenant) {
      console.error('Tenant not found:', tenantError);
      return NextResponse.json<APIError>(
        {
          code: 'NOT_FOUND',
          message: 'Company not found',
        },
        { status: 404 }
      );
    }

    // Check if tenant is active
    if (tenant.is_active === false) {
      return NextResponse.json<APIError>(
        {
          code: 'NOT_FOUND',
          message: 'Company not found',
        },
        { status: 404 }
      );
    }

    // Fetch published chatbots for this tenant
    const { data: chatbots, error: chatbotsError } = await supabase
      .from('chatbots')
      .select('id, name, description, model')
      .eq('tenant_id', tenant.id)
      .eq('is_published', true)
      .order('name', { ascending: true });

    if (chatbotsError) {
      console.error('Error fetching chatbots:', chatbotsError);
      return NextResponse.json<APIError>(
        {
          code: 'SUPABASE_ERROR',
          message: 'Error fetching chatbots',
        },
        { status: 500 }
      );
    }

    // Parse branding from JSON
    const branding = tenant.branding as PublicCompanyInfo['branding'];

    // Build response
    const company: PublicCompanyInfo = {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      branding: branding,
    };

    const publicChatbots: PublicChatbotInfo[] = (chatbots || []).map((chatbot) => ({
      id: chatbot.id,
      name: chatbot.name,
      description: chatbot.description,
      model: chatbot.model,
    }));

    return NextResponse.json({
      company,
      chatbots: publicChatbots,
    });
  } catch (error) {
    console.error('Company API error:', error);
    return NextResponse.json<APIError>(
      {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
