/**
 * Chatbots List Page
 * Displays all chatbots with search, pagination, and actions
 */

'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Bot,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Building2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Company {
  id: string;
  name: string;
  slug: string;
}

interface Chatbot {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  model: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  company?: Company;
}

interface ChatbotsResponse {
  chatbots: Chatbot[];
  pagination: {
    total: number;
    page: number;
    per_page: number;
    has_more: boolean;
  };
}

interface CompaniesResponse {
  companies: Company[];
}

function ChatbotsListContent() {
  const searchParams = useSearchParams();
  const companyIdFromUrl = searchParams.get('company');

  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(companyIdFromUrl || '');
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    per_page: 10,
    has_more: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch companies for filter dropdown
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response = await fetch('/api/admin/companies?per_page=100');
        if (response.ok) {
          const data: CompaniesResponse = await response.json();
          setCompanies(data.companies || []);
        }
      } catch (err) {
        console.error('Error fetching companies:', err);
      }
    };
    fetchCompanies();
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch chatbots
  const fetchChatbots = useCallback(async (page: number, search: string, tenantId: string) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: '10',
      });
      if (search) {
        params.set('search', search);
      }
      if (tenantId) {
        params.set('tenant_id', tenantId);
      }

      const response = await fetch(`/api/admin/chatbots?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch chatbots');
      }

      const data: ChatbotsResponse = await response.json();
      setChatbots(data.chatbots);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Error fetching chatbots:', err);
      setError('Failed to load chatbots. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch and refetch on search/page/company change
  useEffect(() => {
    fetchChatbots(pagination.page, debouncedSearch, selectedCompanyId);
  }, [debouncedSearch, selectedCompanyId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
    fetchChatbots(newPage, debouncedSearch, selectedCompanyId);
  };

  // Handle company filter change
  const handleCompanyChange = (companyId: string) => {
    setSelectedCompanyId(companyId);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Get selected company name for title
  const selectedCompanyName = companies.find(c => c.id === selectedCompanyId)?.name;

  // Handle delete
  const handleDelete = async (chatbot: Chatbot) => {
    if (!confirm(`Are you sure you want to delete "${chatbot.name}"?`)) {
      return;
    }

    setDeletingId(chatbot.id);

    try {
      const response = await fetch(`/api/admin/chatbots/${chatbot.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete chatbot');
      }

      // Refresh the list
      fetchChatbots(pagination.page, debouncedSearch, selectedCompanyId);
    } catch (err) {
      console.error('Error deleting chatbot:', err);
      alert('Failed to delete chatbot. Please try again.');
    } finally {
      setDeletingId(null);
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

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {selectedCompanyName ? `Chatbots - ${selectedCompanyName}` : 'Chatbots'}
          </h1>
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">
            {selectedCompanyName
              ? `Manage chatbots for ${selectedCompanyName}`
              : 'Manage your AI chatbots and their configurations'}
          </p>
        </div>
        <Link href="/admin/chatbots/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Chatbot
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* Company Filter */}
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-zinc-400" />
          <select
            value={selectedCompanyId}
            onChange={(e) => handleCompanyChange(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          >
            <option value="">All Companies</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
          {selectedCompanyId && (
            <button
              onClick={() => handleCompanyChange('')}
              className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              Clear filter
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            type="text"
            placeholder="Search chatbots..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
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
            onClick={() => fetchChatbots(pagination.page, debouncedSearch, selectedCompanyId)}
            className="ml-auto"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {loading && chatbots.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
          </div>
        ) : chatbots.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Bot className="h-12 w-12 text-zinc-300 dark:text-zinc-700" />
            <p className="mt-4 text-zinc-600 dark:text-zinc-400">
              {debouncedSearch
                ? 'No chatbots found matching your search'
                : 'No chatbots yet'}
            </p>
            {!debouncedSearch && (
              <Link href="/admin/chatbots/new" className="mt-4">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create your first chatbot
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Model
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {chatbots.map((chatbot) => (
                  <tr
                    key={chatbot.id}
                    className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  >
                    <td className="whitespace-nowrap px-6 py-4">
                      <div>
                        <p className="font-medium text-zinc-900 dark:text-zinc-100">
                          {chatbot.name}
                        </p>
                        {chatbot.description && (
                          <p className="mt-1 max-w-xs truncate text-sm text-zinc-500 dark:text-zinc-400">
                            {chatbot.description}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {chatbot.company ? (
                        <Link
                          href={`/admin/companies/${chatbot.company.id}`}
                          className="flex items-center gap-2 text-sm text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
                        >
                          <Building2 className="h-4 w-4 text-zinc-400" />
                          <span>{chatbot.company.name}</span>
                        </Link>
                      ) : (
                        <span className="text-sm text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        {chatbot.model}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {chatbot.is_published ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          <CheckCircle className="h-3 w-3" />
                          Published
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                          <XCircle className="h-3 w-3" />
                          Draft
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400">
                      {formatDate(chatbot.created_at)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/admin/chatbots/${chatbot.id}/edit`}>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(chatbot)}
                          disabled={deletingId === chatbot.id}
                          className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:text-red-300"
                        >
                          {deletingId === chatbot.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
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
            {Math.min(pagination.page * pagination.per_page, pagination.total)}{' '}
            of {pagination.total} chatbots
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
              disabled={!pagination.has_more || loading}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Wrap with Suspense for useSearchParams
export default function ChatbotsListPage() {
  return (
    <Suspense fallback={
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    }>
      <ChatbotsListContent />
    </Suspense>
  );
}
