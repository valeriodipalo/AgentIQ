/**
 * Analytics Dashboard Page
 * Displays usage statistics and metrics with company filtering
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  MessageSquare,
  Bot,
  ThumbsUp,
  ThumbsDown,
  Users,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  RefreshCw,
  Building2,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AnalyticsData {
  conversations: {
    total: number;
    active: number;
    archived: number;
  };
  messages: {
    total: number;
    user_messages: number;
    assistant_messages: number;
  };
  feedback: {
    total: number;
    positive: number;
    negative: number;
    positive_rate: number;
  };
  chatbots: {
    total: number;
    published: number;
    unpublished: number;
  };
  users: {
    total: number;
  };
  demo_mode: boolean;
}

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

interface Company {
  id: string;
  name: string;
}

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  loading?: boolean;
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  loading,
}: StatCardProps) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <div className="rounded-lg bg-zinc-100 p-3 dark:bg-zinc-800">
          <Icon className="h-6 w-6 text-zinc-600 dark:text-zinc-400" />
        </div>
        {trend && trendValue && (
          <div
            className={`flex items-center gap-1 text-sm ${
              trend === 'up'
                ? 'text-green-600 dark:text-green-400'
                : trend === 'down'
                ? 'text-red-600 dark:text-red-400'
                : 'text-zinc-500 dark:text-zinc-400'
            }`}
          >
            {trend === 'up' ? (
              <TrendingUp className="h-4 w-4" />
            ) : trend === 'down' ? (
              <TrendingDown className="h-4 w-4" />
            ) : null}
            {trendValue}
          </div>
        )}
      </div>
      <div className="mt-4">
        {loading ? (
          <div className="h-8 w-20 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
        ) : (
          <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
            {value}
          </p>
        )}
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{title}</p>
        {subtitle && (
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-500">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

interface MetricBreakdownProps {
  title: string;
  items: { label: string; value: number; color: string }[];
  loading?: boolean;
}

function MetricBreakdown({ title, items, loading }: MetricBreakdownProps) {
  const total = items.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        {title}
      </h3>
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-4 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0;
            return (
              <div key={item.label}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {item.label}
                  </span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {item.value.toLocaleString()} ({percentage}%)
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className={`h-full rounded-full ${item.color}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [companyAnalytics, setCompanyAnalytics] = useState<CompanyAnalytics[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [companyLoading, setCompanyLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch companies for filter dropdown
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response = await fetch('/api/admin/companies?per_page=100');
        if (response.ok) {
          const data = await response.json();
          setCompanies(data.companies.map((c: Company) => ({ id: c.id, name: c.name })));
        }
      } catch (err) {
        console.error('Error fetching companies:', err);
      }
    };

    fetchCompanies();
  }, []);

  // Fetch analytics
  const fetchAnalytics = useCallback(async (companyId?: string) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (companyId) {
        params.set('company_id', companyId);
      }

      const response = await fetch(`/api/admin/analytics?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }
      const analyticsData: AnalyticsData = await response.json();
      setData(analyticsData);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Failed to load analytics. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch company analytics
  const fetchCompanyAnalytics = useCallback(async () => {
    setCompanyLoading(true);

    try {
      const response = await fetch('/api/admin/analytics/companies');
      if (response.ok) {
        const data = await response.json();
        setCompanyAnalytics(data.companies || []);
      }
    } catch (err) {
      console.error('Error fetching company analytics:', err);
    } finally {
      setCompanyLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics(selectedCompany || undefined);
  }, [selectedCompany, fetchAnalytics]);

  useEffect(() => {
    fetchCompanyAnalytics();
  }, [fetchCompanyAnalytics]);

  // Handle company filter change
  const handleCompanyChange = (companyId: string) => {
    setSelectedCompany(companyId);
  };

  // Navigate to company detail
  const handleCompanyClick = (companyId: string) => {
    router.push(`/admin/analytics/company/${companyId}`);
  };

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Analytics
          </h1>
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">
            Overview of your platform usage and metrics
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Company Filter */}
          <select
            value={selectedCompany}
            onChange={(e) => handleCompanyChange(e.target.value)}
            className="h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          >
            <option value="">All Companies</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            onClick={() => {
              fetchAnalytics(selectedCompany || undefined);
              fetchCompanyAnalytics();
            }}
            disabled={loading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAnalytics(selectedCompany || undefined)}
            className="ml-auto"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Conversations"
          value={data?.conversations.total ?? '-'}
          subtitle={`${data?.conversations.active ?? 0} active, ${data?.conversations.archived ?? 0} archived`}
          icon={MessageSquare}
          loading={loading}
        />
        <StatCard
          title="Total Messages"
          value={data?.messages.total ?? '-'}
          subtitle={`${data?.messages.user_messages ?? 0} user, ${data?.messages.assistant_messages ?? 0} assistant`}
          icon={MessageSquare}
          loading={loading}
        />
        <StatCard
          title="Feedback Score"
          value={data ? `${data.feedback.positive_rate}%` : '-'}
          subtitle={`${data?.feedback.positive ?? 0} positive, ${data?.feedback.negative ?? 0} negative`}
          icon={ThumbsUp}
          trend={
            data
              ? data.feedback.positive_rate >= 80
                ? 'up'
                : data.feedback.positive_rate >= 50
                ? 'neutral'
                : 'down'
              : undefined
          }
          loading={loading}
        />
        <StatCard
          title="Active Chatbots"
          value={data?.chatbots.published ?? '-'}
          subtitle={`${data?.chatbots.total ?? 0} total, ${data?.chatbots.unpublished ?? 0} drafts`}
          icon={Bot}
          loading={loading}
        />
      </div>

      {/* Company Analytics Table */}
      {!selectedCompany && (
        <div className="mb-8">
          <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                <Building2 className="h-5 w-5" />
                Usage by Company
              </h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Click on a company to view detailed user analytics
              </p>
            </div>
            {companyLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-zinc-400" />
              </div>
            ) : companyAnalytics.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Building2 className="h-12 w-12 text-zinc-300 dark:text-zinc-700" />
                <p className="mt-4 text-zinc-600 dark:text-zinc-400">
                  No companies found
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Company
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Users
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Conversations
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Messages
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Feedback
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Last Activity
                      </th>
                      <th className="px-6 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {companyAnalytics.map((company) => (
                      <tr
                        key={company.id}
                        onClick={() => handleCompanyClick(company.id)}
                        className="cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                      >
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                              <Building2 className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                            </div>
                            <div>
                              <p className="font-medium text-zinc-900 dark:text-zinc-100">
                                {company.name}
                              </p>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                {company.slug}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            <Users className="h-4 w-4 text-zinc-400" />
                            <span className="text-zinc-600 dark:text-zinc-400">
                              {company.user_count}
                            </span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-zinc-600 dark:text-zinc-400">
                          {company.conversation_count}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-zinc-600 dark:text-zinc-400">
                          {company.message_count}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          {company.feedback.total > 0 ? (
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                <ThumbsUp className="h-3.5 w-3.5" />
                                <span className="text-xs">{company.feedback.positive}</span>
                              </div>
                              <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                                <ThumbsDown className="h-3.5 w-3.5" />
                                <span className="text-xs">{company.feedback.negative}</span>
                              </div>
                              <span className="text-xs text-zinc-500">
                                ({company.feedback.positive_rate}% positive)
                              </span>
                            </div>
                          ) : (
                            <span className="text-zinc-400">-</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400">
                          {formatDate(company.last_activity)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <ChevronRight className="h-4 w-4 text-zinc-400" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detailed Breakdowns */}
      <div className="grid gap-6 lg:grid-cols-2">
        <MetricBreakdown
          title="Conversations"
          loading={loading}
          items={[
            {
              label: 'Active',
              value: data?.conversations.active ?? 0,
              color: 'bg-green-500',
            },
            {
              label: 'Archived',
              value: data?.conversations.archived ?? 0,
              color: 'bg-zinc-400',
            },
          ]}
        />

        <MetricBreakdown
          title="Messages"
          loading={loading}
          items={[
            {
              label: 'User Messages',
              value: data?.messages.user_messages ?? 0,
              color: 'bg-blue-500',
            },
            {
              label: 'Assistant Messages',
              value: data?.messages.assistant_messages ?? 0,
              color: 'bg-purple-500',
            },
          ]}
        />

        <MetricBreakdown
          title="Feedback"
          loading={loading}
          items={[
            {
              label: 'Positive',
              value: data?.feedback.positive ?? 0,
              color: 'bg-green-500',
            },
            {
              label: 'Negative',
              value: data?.feedback.negative ?? 0,
              color: 'bg-red-500',
            },
          ]}
        />

        <MetricBreakdown
          title="Chatbots"
          loading={loading}
          items={[
            {
              label: 'Published',
              value: data?.chatbots.published ?? 0,
              color: 'bg-green-500',
            },
            {
              label: 'Drafts',
              value: data?.chatbots.unpublished ?? 0,
              color: 'bg-yellow-500',
            },
          ]}
        />
      </div>

      {/* Users Section */}
      <div className="mt-6">
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-zinc-100 p-3 dark:bg-zinc-800">
              <Users className="h-6 w-6 text-zinc-600 dark:text-zinc-400" />
            </div>
            <div>
              {loading ? (
                <div className="h-8 w-16 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
              ) : (
                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                  {data?.users.total ?? 0}
                </p>
              )}
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Total Users {selectedCompany && companies.find(c => c.id === selectedCompany)?.name ? `in ${companies.find(c => c.id === selectedCompany)?.name}` : ''}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
