/**
 * Analytics Dashboard Page
 * Displays usage statistics and metrics
 */

'use client';

import { useEffect, useState } from 'react';
import {
  MessageSquare,
  Bot,
  ThumbsUp,
  Users,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  RefreshCw,
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
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/analytics');
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
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

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
        <Button
          variant="outline"
          onClick={fetchAnalytics}
          disabled={loading}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Demo mode notice */}
      {data?.demo_mode && (
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
          <p className="text-sm text-blue-700 dark:text-blue-400">
            You are viewing demo data. Sign in to see your actual analytics.
          </p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAnalytics}
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
                Total Users
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
