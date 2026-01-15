/**
 * Admin Analytics Companies API Route
 * Returns analytics breakdown by company
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import type { APIError } from '@/types';

/**
 * Company analytics data
 */
interface CompanyAnalytics {
  id: string;
  name: string;
  slug: string;
  user_count: number;
  conversation_count: number;
  message_count: number;
  feedback: {
    positive: number;
    negative: number;
    total: number;
    positive_rate: number;
  };
  last_activity: string | null;
}

/**
 * GET /api/admin/analytics/companies
 * Returns analytics for all companies
 */
export async function GET(request: NextRequest) {
  try {
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

    // Fetch all companies
    const { data: companies, error: companiesError } = await supabase
      .from('tenants')
      .select('id, name, slug')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (companiesError) {
      console.error('Error fetching companies:', companiesError);
      return NextResponse.json<APIError>(
        {
          code: 'SUPABASE_ERROR',
          message: 'Error fetching companies',
        },
        { status: 500 }
      );
    }

    if (!companies || companies.length === 0) {
      return NextResponse.json({ companies: [] });
    }

    // Fetch stats for each company in parallel
    const companyAnalytics: CompanyAnalytics[] = await Promise.all(
      companies.map(async (company) => {
        // Get user count
        const { count: userCount } = await supabase
          .from('users')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', company.id);

        // Get conversation count and last activity
        const { data: conversations, count: conversationCount } = await supabase
          .from('conversations')
          .select('id, updated_at', { count: 'exact' })
          .eq('tenant_id', company.id)
          .order('updated_at', { ascending: false })
          .limit(1);

        const lastActivity = conversations?.[0]?.updated_at || null;

        // Get conversation IDs for message and feedback counts
        const { data: convIds } = await supabase
          .from('conversations')
          .select('id')
          .eq('tenant_id', company.id);

        const conversationIds = convIds?.map(c => c.id) || [];

        // Get message count
        let messageCount = 0;
        if (conversationIds.length > 0) {
          const { count } = await supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .in('conversation_id', conversationIds);
          messageCount = count || 0;
        }

        // Get user IDs for feedback
        const { data: users } = await supabase
          .from('users')
          .select('id')
          .eq('tenant_id', company.id);

        const userIds = users?.map(u => u.id) || [];

        // Get feedback stats
        let positiveFeedback = 0;
        let negativeFeedback = 0;
        let totalFeedback = 0;

        if (userIds.length > 0) {
          const { data: feedback } = await supabase
            .from('feedback')
            .select('rating')
            .in('user_id', userIds);

          if (feedback) {
            totalFeedback = feedback.length;
            positiveFeedback = feedback.filter(f => f.rating === 1).length;
            negativeFeedback = feedback.filter(f => f.rating === -1).length;
          }
        }

        const positiveRate = totalFeedback > 0
          ? Math.round((positiveFeedback / totalFeedback) * 100)
          : 0;

        return {
          id: company.id,
          name: company.name,
          slug: company.slug,
          user_count: userCount || 0,
          conversation_count: conversationCount || 0,
          message_count: messageCount,
          feedback: {
            positive: positiveFeedback,
            negative: negativeFeedback,
            total: totalFeedback,
            positive_rate: positiveRate,
          },
          last_activity: lastActivity,
        };
      })
    );

    return NextResponse.json({ companies: companyAnalytics });
  } catch (error) {
    console.error('Admin analytics companies API error:', error);
    return NextResponse.json<APIError>(
      {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
