/**
 * Admin Conversations List Page
 * Displays all conversations with filters, search, pagination
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  MessageSquare,
  Loader2,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  Filter,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * Conversation type from API
 */
interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
  company: {
    id: string;
    name: string;
  } | null;
  user: {
    id: string;
    email: string;
    name: string | null;
  } | null;
  chatbot: {
    id: string;
    name: string;
  } | null;
  message_count: number;
  feedback_summary: {
    positive: number;
    negative: number;
    total: number;
  };
}

/**
 * API response structure
 */
interface ConversationsResponse {
  conversations: Conversation[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
  demo_mode: boolean;
}

/**
 * Filter option type
 */
interface FilterOption {
  id: string;
  name: string;
}

/**
 * Company type for filter dropdown
 */
interface Company {
  id: string;
  name: string;
}

/**
 * Chatbot type for filter dropdown
 */
interface Chatbot {
  id: string;
  name: string;
}

/**
 * User type for filter dropdown
 */
interface User {
  id: string;
  email: string;
  name: string | null;
}

// Demo data for when API is not available
const DEMO_CONVERSATIONS: Conversation[] = [
  {
    id: '1',
    title: 'How to configure settings',
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-01-15T10:45:00Z',
    is_archived: false,
    company: { id: '1', name: 'Acme Corporation' },
    user: { id: '1', email: 'john@acme.com', name: 'John Smith' },
    chatbot: { id: '1', name: 'Support Assistant' },
    message_count: 8,
    feedback_summary: { positive: 2, negative: 0, total: 2 },
  },
  {
    id: '2',
    title: 'Billing question',
    created_at: '2024-01-14T15:20:00Z',
    updated_at: '2024-01-14T15:35:00Z',
    is_archived: false,
    company: { id: '1', name: 'Acme Corporation' },
    user: { id: '2', email: 'jane@acme.com', name: 'Jane Doe' },
    chatbot: { id: '2', name: 'Billing Bot' },
    message_count: 12,
    feedback_summary: { positive: 1, negative: 1, total: 2 },
  },
  {
    id: '3',
    title: 'API integration help',
    created_at: '2024-01-13T09:00:00Z',
    updated_at: '2024-01-13T09:30:00Z',
    is_archived: false,
    company: { id: '2', name: 'TechStart Inc' },
    user: { id: '3', email: 'dev@techstart.com', name: null },
    chatbot: { id: '1', name: 'Support Assistant' },
    message_count: 15,
    feedback_summary: { positive: 0, negative: 0, total: 0 },
  },
];

const DEMO_COMPANIES: Company[] = [
  { id: '1', name: 'Acme Corporation' },
  { id: '2', name: 'TechStart Inc' },
  { id: '3', name: 'Global Services' },
];

const DEMO_CHATBOTS: Chatbot[] = [
  { id: '1', name: 'Support Assistant' },
  { id: '2', name: 'Billing Bot' },
  { id: '3', name: 'Sales Helper' },
];

const DEMO_USERS: User[] = [
  { id: '1', email: 'john@acme.com', name: 'John Smith' },
  { id: '2', email: 'jane@acme.com', name: 'Jane Doe' },
  { id: '3', email: 'dev@techstart.com', name: null },
];

export default function ConversationsListPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    per_page: 20,
    total_pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);

  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [selectedChatbot, setSelectedChatbot] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [hasFeedback, setHasFeedback] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // Filter options
  const [companies, setCompanies] = useState<FilterOption[]>([]);
  const [chatbots, setChatbots] = useState<FilterOption[]>([]);
  const [users, setUsers] = useState<FilterOption[]>([]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch filter options
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        // Fetch companies
        const companiesRes = await fetch('/api/admin/companies?per_page=100');
        if (companiesRes.ok) {
          const data = await companiesRes.json();
          setCompanies(
            data.companies.map((c: Company) => ({ id: c.id, name: c.name }))
          );
        } else {
          setCompanies(DEMO_COMPANIES.map((c) => ({ id: c.id, name: c.name })));
        }

        // Fetch chatbots
        const chatbotsRes = await fetch('/api/admin/chatbots?per_page=100');
        if (chatbotsRes.ok) {
          const data = await chatbotsRes.json();
          setChatbots(
            data.chatbots.map((c: Chatbot) => ({ id: c.id, name: c.name }))
          );
        } else {
          setChatbots(DEMO_CHATBOTS.map((c) => ({ id: c.id, name: c.name })));
        }

        // For users, we'll populate from conversations data
        // In a real app, you might have a dedicated users endpoint
        setUsers(
          DEMO_USERS.map((u) => ({
            id: u.id,
            name: u.name || u.email,
          }))
        );
      } catch (err) {
        console.error('Error fetching filter options:', err);
        // Fall back to demo data
        setCompanies(DEMO_COMPANIES.map((c) => ({ id: c.id, name: c.name })));
        setChatbots(DEMO_CHATBOTS.map((c) => ({ id: c.id, name: c.name })));
        setUsers(
          DEMO_USERS.map((u) => ({
            id: u.id,
            name: u.name || u.email,
          }))
        );
      }
    };

    fetchFilterOptions();
  }, []);

  // Fetch conversations
  const fetchConversations = useCallback(
    async (
      page: number,
      search: string,
      companyId: string,
      chatbotId: string,
      userId: string,
      feedbackFilter: string
    ) => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          page: page.toString(),
          per_page: '20',
        });

        if (search) {
          params.set('search', search);
        }
        if (companyId) {
          params.set('company_id', companyId);
        }
        if (chatbotId) {
          params.set('chatbot_id', chatbotId);
        }
        if (userId) {
          params.set('user_id', userId);
        }
        if (feedbackFilter) {
          params.set('has_feedback', feedbackFilter);
        }

        const response = await fetch(`/api/admin/conversations?${params}`);

        if (!response.ok) {
          throw new Error('API not available');
        }

        const data: ConversationsResponse = await response.json();
        setConversations(data.conversations);
        setPagination({
          total: data.pagination.total,
          page: data.pagination.page,
          per_page: data.pagination.per_page,
          total_pages: data.pagination.total_pages,
        });
        setDemoMode(data.demo_mode || false);

        // Extract unique users from conversations for the filter
        const uniqueUsers = new Map<string, FilterOption>();
        data.conversations.forEach((c) => {
          if (c.user) {
            uniqueUsers.set(c.user.id, {
              id: c.user.id,
              name: c.user.name || c.user.email,
            });
          }
        });
        if (uniqueUsers.size > 0) {
          setUsers(Array.from(uniqueUsers.values()));
        }
      } catch (err) {
        console.error('Error fetching conversations:', err);
        // Fall back to demo data
        let filtered = [...DEMO_CONVERSATIONS];

        if (search) {
          const searchLower = search.toLowerCase();
          filtered = filtered.filter((c) =>
            c.title.toLowerCase().includes(searchLower)
          );
        }
        if (companyId) {
          filtered = filtered.filter((c) => c.company?.id === companyId);
        }
        if (chatbotId) {
          filtered = filtered.filter((c) => c.chatbot?.id === chatbotId);
        }
        if (userId) {
          filtered = filtered.filter((c) => c.user?.id === userId);
        }
        if (feedbackFilter === 'true') {
          filtered = filtered.filter((c) => c.feedback_summary.total > 0);
        } else if (feedbackFilter === 'false') {
          filtered = filtered.filter((c) => c.feedback_summary.total === 0);
        }

        setConversations(filtered);
        setPagination({
          total: filtered.length,
          page: 1,
          per_page: 20,
          total_pages: Math.ceil(filtered.length / 20),
        });
        setDemoMode(true);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Fetch on filter/search change
  useEffect(() => {
    fetchConversations(
      1,
      debouncedSearch,
      selectedCompany,
      selectedChatbot,
      selectedUser,
      hasFeedback
    );
  }, [
    debouncedSearch,
    selectedCompany,
    selectedChatbot,
    selectedUser,
    hasFeedback,
    fetchConversations,
  ]);

  // Handle page change
  const handlePageChange = (newPage: number) => {
    fetchConversations(
      newPage,
      debouncedSearch,
      selectedCompany,
      selectedChatbot,
      selectedUser,
      hasFeedback
    );
  };

  // Navigate to conversation detail
  const handleRowClick = (conversationId: string) => {
    router.push(`/admin/conversations/${conversationId}`);
  };

  // Clear all filters
  const clearFilters = () => {
    setSelectedCompany('');
    setSelectedChatbot('');
    setSelectedUser('');
    setHasFeedback('');
  };

  // Check if any filters are active
  const hasActiveFilters =
    selectedCompany || selectedChatbot || selectedUser || hasFeedback;

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Conversations
        </h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Browse and analyze user conversations with AI agents
        </p>
      </div>

      {/* Demo mode notice */}
      {demoMode && (
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
          <p className="text-sm text-blue-700 dark:text-blue-400">
            Viewing demo data. Connect to the database to see real conversations.
          </p>
        </div>
      )}

      {/* Search and Filter Controls */}
      <div className="mb-6 space-y-4">
        {/* Search bar and filter toggle */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant={showFilters ? 'primary' : 'outline'}
            onClick={() => setShowFilters(!showFilters)}
            className="relative"
          >
            <Filter className="mr-2 h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                {
                  [selectedCompany, selectedChatbot, selectedUser, hasFeedback].filter(
                    Boolean
                  ).length
                }
              </span>
            )}
          </Button>
        </div>

        {/* Filter dropdowns */}
        {showFilters && (
          <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex flex-wrap gap-4">
              {/* Company filter */}
              <div className="min-w-[200px]">
                <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Company
                </label>
                <select
                  value={selectedCompany}
                  onChange={(e) => setSelectedCompany(e.target.value)}
                  className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  <option value="">All Companies</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Agent filter */}
              <div className="min-w-[200px]">
                <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Agent
                </label>
                <select
                  value={selectedChatbot}
                  onChange={(e) => setSelectedChatbot(e.target.value)}
                  className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  <option value="">All Agents</option>
                  {chatbots.map((chatbot) => (
                    <option key={chatbot.id} value={chatbot.id}>
                      {chatbot.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* User filter */}
              <div className="min-w-[200px]">
                <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  User
                </label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  <option value="">All Users</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Feedback filter */}
              <div className="min-w-[200px]">
                <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Has Feedback
                </label>
                <select
                  value={hasFeedback}
                  onChange={(e) => setHasFeedback(e.target.value)}
                  className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  <option value="">Any</option>
                  <option value="true">With Feedback</option>
                  <option value="false">Without Feedback</option>
                </select>
              </div>

              {/* Clear filters button */}
              {hasActiveFilters && (
                <div className="flex items-end">
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="mr-1 h-4 w-4" />
                    Clear Filters
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              fetchConversations(
                pagination.page,
                debouncedSearch,
                selectedCompany,
                selectedChatbot,
                selectedUser,
                hasFeedback
              )
            }
            className="ml-auto"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {loading && conversations.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-12 w-12 text-zinc-300 dark:text-zinc-700" />
            <p className="mt-4 text-zinc-600 dark:text-zinc-400">
              {debouncedSearch || hasActiveFilters
                ? 'No conversations found matching your criteria'
                : 'No conversations yet'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Agent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Messages
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Feedback
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {conversations.map((conversation) => (
                  <tr
                    key={conversation.id}
                    onClick={() => handleRowClick(conversation.id)}
                    className="cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  >
                    <td className="whitespace-nowrap px-6 py-4">
                      <p className="max-w-[200px] truncate font-medium text-zinc-900 dark:text-zinc-100">
                        {conversation.title || 'Untitled Conversation'}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">
                        {conversation.company?.name || '-'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div>
                        {conversation.user?.name && (
                          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                            {conversation.user.name}
                          </p>
                        )}
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                          {conversation.user?.email || '-'}
                        </p>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {conversation.chatbot ? (
                        <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                          {conversation.chatbot.name}
                        </span>
                      ) : (
                        <span className="text-sm text-zinc-400">-</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">
                        {conversation.message_count}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {conversation.feedback_summary.total > 0 ? (
                        <div className="flex items-center gap-2">
                          {conversation.feedback_summary.positive > 0 && (
                            <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                              <ThumbsUp className="h-3.5 w-3.5" />
                              <span className="text-xs">
                                {conversation.feedback_summary.positive}
                              </span>
                            </span>
                          )}
                          {conversation.feedback_summary.negative > 0 && (
                            <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                              <ThumbsDown className="h-3.5 w-3.5" />
                              <span className="text-xs">
                                {conversation.feedback_summary.negative}
                              </span>
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-zinc-400">-</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400">
                      {formatDate(conversation.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.total > pagination.per_page && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Showing {(pagination.page - 1) * pagination.per_page + 1} to{' '}
            {Math.min(pagination.page * pagination.per_page, pagination.total)} of{' '}
            {pagination.total} conversations
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
    </div>
  );
}
