/**
 * Admin Dashboard Page
 * Shows quick overview and redirects to main admin sections
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bot, MessageSquare, BarChart3, Users, ArrowRight } from 'lucide-react';

interface QuickStats {
  chatbots: number;
  conversations: number;
  messages: number;
  users: number;
}

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  loading?: boolean;
}

function StatCard({ title, value, icon: Icon, href, loading }: StatCardProps) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-zinc-200 bg-white p-6 transition-all hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
    >
      <div className="flex items-center justify-between">
        <div className="rounded-lg bg-zinc-100 p-3 dark:bg-zinc-800">
          <Icon className="h-6 w-6 text-zinc-600 dark:text-zinc-400" />
        </div>
        <ArrowRight className="h-5 w-5 text-zinc-400 transition-transform group-hover:translate-x-1 dark:text-zinc-600" />
      </div>
      <div className="mt-4">
        {loading ? (
          <div className="h-8 w-16 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
        ) : (
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {value}
          </p>
        )}
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{title}</p>
      </div>
    </Link>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<QuickStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/admin/analytics');
        if (!response.ok) {
          throw new Error('Failed to fetch analytics');
        }
        const data = await response.json();
        setStats({
          chatbots: data.chatbots?.total || 0,
          conversations: data.conversations?.total || 0,
          messages: data.messages?.total || 0,
          users: data.users?.total || 0,
        });
      } catch (err) {
        console.error('Error fetching stats:', err);
        setError('Failed to load statistics');
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Dashboard
        </h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Welcome to the admin panel. Manage your chatbots and view analytics.
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Quick stats */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Chatbots"
          value={stats?.chatbots ?? '-'}
          icon={Bot}
          href="/admin/chatbots"
          loading={loading}
        />
        <StatCard
          title="Conversations"
          value={stats?.conversations ?? '-'}
          icon={MessageSquare}
          href="/admin/analytics"
          loading={loading}
        />
        <StatCard
          title="Messages"
          value={stats?.messages ?? '-'}
          icon={BarChart3}
          href="/admin/analytics"
          loading={loading}
        />
        <StatCard
          title="Users"
          value={stats?.users ?? '-'}
          icon={Users}
          href="/admin/analytics"
          loading={loading}
        />
      </div>

      {/* Quick actions */}
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Quick Actions
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/admin/chatbots/new"
            className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
              <Bot className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-medium text-zinc-900 dark:text-zinc-100">
                Create Chatbot
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Add a new AI assistant
              </p>
            </div>
          </Link>

          <Link
            href="/admin/chatbots"
            className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900/30">
              <Bot className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="font-medium text-zinc-900 dark:text-zinc-100">
                Manage Chatbots
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                View and edit existing chatbots
              </p>
            </div>
          </Link>

          <Link
            href="/admin/analytics"
            className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            <div className="rounded-lg bg-purple-100 p-2 dark:bg-purple-900/30">
              <BarChart3 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="font-medium text-zinc-900 dark:text-zinc-100">
                View Analytics
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Check usage statistics
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
