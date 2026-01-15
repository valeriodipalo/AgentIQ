/**
 * Company Analytics Detail Page
 * Shows user-level analytics for a specific company
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Users,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Building2,
  RefreshCw,
  AlertCircle,
  ChevronRight,
  Mail,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UserAnalytics {
  id: string;
  name: string | null;
  email: string;
  role: string;
  conversation_count: number;
  message_count: number;
  feedback: {
    positive: number;
    negative: number;
    total: number;
  };
  last_active: string | null;
  created_at: string;
}

interface CompanyData {
  id: string;
  name: string;
}

interface UsersResponse {
  company: CompanyData;
  users: UserAnalytics[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

export default function CompanyAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;

  const [company, setCompany] = useState<CompanyData | null>(null);
  const [users, setUsers] = useState<UserAnalytics[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 20,
    total: 0,
    total_pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user analytics
  const fetchUserAnalytics = useCallback(async (page: number = 1) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        company_id: companyId,
        page: page.toString(),
        per_page: '20',
      });

      const response = await fetch(`/api/admin/analytics/users?${params}`);

      if (!response.ok) {
        if (response.status === 404) {
          setError('Company not found');
        } else {
          throw new Error('Failed to fetch user analytics');
        }
        return;
      }

      const data: UsersResponse = await response.json();
      setCompany(data.company);
      setUsers(data.users);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Error fetching user analytics:', err);
      setError('Failed to load user analytics. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (companyId) {
      fetchUserAnalytics();
    }
  }, [companyId, fetchUserAnalytics]);

  // Handle page change
  const handlePageChange = (newPage: number) => {
    fetchUserAnalytics(newPage);
  };

  // Navigate to conversations filtered by user
  const handleUserClick = (userId: string) => {
    router.push(`/admin/conversations?user_id=${userId}`);
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

  // Calculate totals
  const totals = {
    conversations: users.reduce((sum, u) => sum + u.conversation_count, 0),
    messages: users.reduce((sum, u) => sum + u.message_count, 0),
    positive: users.reduce((sum, u) => sum + u.feedback.positive, 0),
    negative: users.reduce((sum, u) => sum + u.feedback.negative, 0),
  };

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/analytics"
          className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Analytics
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800">
              <Building2 className="h-6 w-6 text-zinc-600 dark:text-zinc-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {company?.name || 'Loading...'}
              </h1>
              <p className="text-zinc-600 dark:text-zinc-400">
                User analytics and engagement
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => fetchUserAnalytics(pagination.page)}
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
            onClick={() => fetchUserAnalytics(pagination.page)}
            className="ml-auto"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {pagination.total}
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Total Users</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-100 p-2 dark:bg-purple-900/30">
              <MessageSquare className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {totals.conversations}
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Conversations</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900/30">
              <ThumbsUp className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {totals.positive}
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Positive Feedback</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-red-100 p-2 dark:bg-red-900/30">
              <ThumbsDown className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {totals.negative}
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Negative Feedback</p>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            <Users className="h-5 w-5" />
            Users
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Click on a user to view their conversations
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-zinc-400" />
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-zinc-300 dark:text-zinc-700" />
            <p className="mt-4 text-zinc-600 dark:text-zinc-400">
              No users found in this company
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Conversations
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Messages
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Feedback Given
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Last Active
                    </th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      onClick={() => handleUserClick(user.id)}
                      className="cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    >
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                            <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                              {(user.name || user.email)[0].toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-zinc-900 dark:text-zinc-100">
                              {user.name || 'No name'}
                            </p>
                            <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                              <Mail className="h-3 w-3" />
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          user.role === 'admin'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                            : user.role === 'user'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-zinc-600 dark:text-zinc-400">
                        {user.conversation_count}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-zinc-600 dark:text-zinc-400">
                        {user.message_count}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        {user.feedback.total > 0 ? (
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                              <ThumbsUp className="h-3.5 w-3.5" />
                              <span className="text-xs">{user.feedback.positive}</span>
                            </div>
                            <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                              <ThumbsDown className="h-3.5 w-3.5" />
                              <span className="text-xs">{user.feedback.negative}</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-zinc-400">-</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400">
                        {formatDate(user.last_active)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <ChevronRight className="h-4 w-4 text-zinc-400" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.total_pages > 1 && (
              <div className="flex items-center justify-between border-t border-zinc-200 px-6 py-4 dark:border-zinc-800">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Showing {(pagination.page - 1) * pagination.per_page + 1} to{' '}
                  {Math.min(pagination.page * pagination.per_page, pagination.total)} of{' '}
                  {pagination.total} users
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1 || loading}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.total_pages || loading}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
