/**
 * Company Dashboard Page
 * Shows company overview with stats, quick links, and recent activity
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Users,
  Bot,
  MessageSquare,
  ThumbsUp,
  Edit,
  Loader2,
  AlertCircle,
  Ticket,
  Trash2,
  AlertTriangle,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CompanyStats {
  user_count: number;
  chatbot_count: number;
  published_chatbot_count: number;
  conversation_count: number;
  active_conversation_count: number;
  feedback_positive_rate: number;
  total_messages: number;
}

interface Company {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
  branding: {
    primary_color?: string;
    logo_url?: string;
  } | null;
}

interface RecentConversation {
  id: string;
  title: string;
  user_email: string;
  chatbot_name: string;
  message_count: number;
  updated_at: string;
}

interface CompanyDashboardData {
  company: Company;
  stats: CompanyStats;
  recent_conversations: RecentConversation[];
  demo_mode: boolean;
}

// Demo data for when API is not available
const DEMO_DATA: CompanyDashboardData = {
  company: {
    id: '1',
    name: 'Acme Corporation',
    slug: 'acme-corp',
    is_active: true,
    created_at: '2024-01-15T10:00:00Z',
    branding: {
      primary_color: '#3b82f6',
    },
  },
  stats: {
    user_count: 25,
    chatbot_count: 3,
    published_chatbot_count: 2,
    conversation_count: 142,
    active_conversation_count: 12,
    feedback_positive_rate: 87,
    total_messages: 856,
  },
  recent_conversations: [
    {
      id: 'conv-1',
      title: 'Product inquiry about pricing',
      user_email: 'john@example.com',
      chatbot_name: 'Sales Assistant',
      message_count: 8,
      updated_at: '2024-03-15T14:30:00Z',
    },
    {
      id: 'conv-2',
      title: 'Technical support request',
      user_email: 'jane@example.com',
      chatbot_name: 'Support Bot',
      message_count: 12,
      updated_at: '2024-03-15T12:15:00Z',
    },
    {
      id: 'conv-3',
      title: 'General questions',
      user_email: 'bob@example.com',
      chatbot_name: 'General Assistant',
      message_count: 5,
      updated_at: '2024-03-14T16:45:00Z',
    },
  ],
  demo_mode: true,
};

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  loading?: boolean;
}

function StatCard({ title, value, subtitle, icon: Icon, href, loading }: StatCardProps) {
  const content = (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 transition-all hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700">
      <div className="flex items-center justify-between">
        <div className="rounded-lg bg-zinc-100 p-3 dark:bg-zinc-800">
          <Icon className="h-6 w-6 text-zinc-600 dark:text-zinc-400" />
        </div>
        {href && (
          <ArrowRight className="h-5 w-5 text-zinc-400 transition-transform group-hover:translate-x-1 dark:text-zinc-600" />
        )}
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
        {subtitle && (
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-500">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="group">
        {content}
      </Link>
    );
  }

  return content;
}

export default function CompanyDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;

  const [data, setData] = useState<CompanyDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Fetch company data
  const fetchCompanyData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/companies/${companyId}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Company not found');
        }
        throw new Error('API not available');
      }

      const companyData: CompanyDashboardData = await response.json();
      setData(companyData);
    } catch (err) {
      console.error('Error fetching company:', err);

      // Fall back to demo data
      setData({
        ...DEMO_DATA,
        company: {
          ...DEMO_DATA.company,
          id: companyId,
        },
      });
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (companyId) {
      fetchCompanyData();
    }
  }, [companyId, fetchCompanyData]);

  // Handle company deletion
  const handleDeleteCompany = async () => {
    setDeleteLoading(true);
    setDeleteError(null);

    try {
      const response = await fetch(`/api/admin/companies/${companyId}?force=true`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete company');
      }

      // Redirect to companies list after successful deletion
      router.push('/admin/companies');
    } catch (err) {
      console.error('Error deleting company:', err);
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete company');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateString);
  };

  // Loading state
  if (loading && !data) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  // Error state
  if (error && !data) {
    return (
      <div className="p-6 lg:p-8">
        <Link
          href="/admin/companies"
          className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Companies
        </Link>
        <div className="mx-auto max-w-2xl">
          <div className="flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 py-12 dark:border-red-800 dark:bg-red-900/20">
            <AlertCircle className="h-12 w-12 text-red-400" />
            <p className="mt-4 text-red-700 dark:text-red-400">{error}</p>
            <Button variant="outline" onClick={fetchCompanyData} className="mt-4">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const company = data?.company;
  const stats = data?.stats;

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin/companies"
          className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Companies
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl"
              style={{
                backgroundColor: company?.branding?.primary_color || '#3b82f6',
              }}
            >
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {company?.name}
              </h1>
              <p className="text-zinc-600 dark:text-zinc-400">
                {company?.slug} {company?.is_active && (
                  <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    Active
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href={`/admin/companies/${companyId}/edit`}>
              <Button variant="outline">
                <Edit className="mr-2 h-4 w-4" />
                Edit Company
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(true)}
              className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Company
            </Button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  Delete Company
                </h3>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  Are you sure you want to delete <strong>{company?.name}</strong>? This action cannot be undone.
                </p>
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
                  <p className="text-sm font-medium text-red-800 dark:text-red-300">
                    The following data will be permanently deleted:
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-red-700 dark:text-red-400">
                    <li>• {stats?.user_count || 0} users</li>
                    <li>• {stats?.chatbot_count || 0} chatbots</li>
                    <li>• {stats?.conversation_count || 0} conversations</li>
                    <li>• All messages and feedback</li>
                    <li>• All invite codes</li>
                  </ul>
                </div>
                {deleteError && (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
                    <p className="text-sm text-red-700 dark:text-red-400">{deleteError}</p>
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  setShowDeleteDialog(false);
                  setDeleteError(null);
                }}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteDialog(false);
                  setDeleteError(null);
                }}
                disabled={deleteLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteCompany}
                disabled={deleteLoading}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                {deleteLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Company
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Demo mode notice */}
      {data?.demo_mode && (
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
          <p className="text-sm text-blue-700 dark:text-blue-400">
            Viewing demo data. API endpoints for companies are not yet configured.
          </p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Users"
          value={stats?.user_count ?? '-'}
          icon={Users}
          href={`/admin/companies/${companyId}/users`}
          loading={loading}
        />
        <StatCard
          title="Active Agents"
          value={stats?.published_chatbot_count ?? '-'}
          subtitle={`${stats?.chatbot_count ?? 0} total`}
          icon={Bot}
          loading={loading}
        />
        <StatCard
          title="Conversations"
          value={stats?.conversation_count ?? '-'}
          subtitle={`${stats?.active_conversation_count ?? 0} active`}
          icon={MessageSquare}
          loading={loading}
        />
        <StatCard
          title="Feedback Score"
          value={stats ? `${stats.feedback_positive_rate}%` : '-'}
          subtitle="Positive ratings"
          icon={ThumbsUp}
          loading={loading}
        />
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Quick Actions
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href={`/admin/companies/${companyId}/users`}
            className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-medium text-zinc-900 dark:text-zinc-100">
                Manage Users
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                View and manage company users
              </p>
            </div>
          </Link>

          <Link
            href={`/admin/chatbots?company=${companyId}`}
            className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900/30">
              <Bot className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="font-medium text-zinc-900 dark:text-zinc-100">
                View Agents
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Manage chatbots for this company
              </p>
            </div>
          </Link>

          <Link
            href={`/admin/analytics?company=${companyId}`}
            className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            <div className="rounded-lg bg-purple-100 p-2 dark:bg-purple-900/30">
              <MessageSquare className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="font-medium text-zinc-900 dark:text-zinc-100">
                Browse Conversations
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                View conversation history
              </p>
            </div>
          </Link>

          <Link
            href={`/admin/companies/${companyId}/invites`}
            className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            <div className="rounded-lg bg-orange-100 p-2 dark:bg-orange-900/30">
              <Ticket className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="font-medium text-zinc-900 dark:text-zinc-100">
                Invite Codes
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Manage access codes for users
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Conversations */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Recent Conversations
        </h2>
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          {!data?.recent_conversations?.length ? (
            <div className="flex flex-col items-center justify-center py-12">
              <MessageSquare className="h-12 w-12 text-zinc-300 dark:text-zinc-700" />
              <p className="mt-4 text-zinc-600 dark:text-zinc-400">
                No conversations yet
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {data.recent_conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className="flex items-center justify-between p-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                      {conversation.title}
                    </p>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                      {conversation.user_email} with {conversation.chatbot_name}
                    </p>
                  </div>
                  <div className="ml-4 flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        {conversation.message_count} messages
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-500">
                        {formatRelativeTime(conversation.updated_at)}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-zinc-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Company Details */}
      <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Company Details
        </h2>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Created
            </dt>
            <dd className="mt-1 text-zinc-900 dark:text-zinc-100">
              {company ? formatDate(company.created_at) : '-'}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Status
            </dt>
            <dd className="mt-1 text-zinc-900 dark:text-zinc-100">
              {company?.is_active ? 'Active' : 'Inactive'}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Primary Color
            </dt>
            <dd className="mt-1 flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
              {company?.branding?.primary_color && (
                <span
                  className="inline-block h-4 w-4 rounded"
                  style={{ backgroundColor: company.branding.primary_color }}
                />
              )}
              {company?.branding?.primary_color || 'Not set'}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Total Messages
            </dt>
            <dd className="mt-1 text-zinc-900 dark:text-zinc-100">
              {stats?.total_messages?.toLocaleString() ?? '-'}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
