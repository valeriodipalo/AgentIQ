/**
 * Companies List Page
 * Displays all companies (tenants) with search, pagination, and actions
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  Building2,
  Loader2,
  AlertCircle,
  Users,
  Bot,
  MessageSquare,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface CompanyStats {
  user_count: number;
  chatbot_count: number;
  conversation_count: number;
}

interface Company {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
  stats: CompanyStats;
}

interface CompaniesResponse {
  companies: Company[];
  pagination: {
    total: number;
    page: number;
    per_page: number;
    has_more: boolean;
  };
  demo_mode: boolean;
}

// Demo data for when API is not available
const DEMO_COMPANIES: Company[] = [
  {
    id: '1',
    name: 'Acme Corporation',
    slug: 'acme-corp',
    is_active: true,
    created_at: '2024-01-15T10:00:00Z',
    stats: { user_count: 25, chatbot_count: 3, conversation_count: 142 },
  },
  {
    id: '2',
    name: 'TechStart Inc',
    slug: 'techstart',
    is_active: true,
    created_at: '2024-02-20T14:30:00Z',
    stats: { user_count: 12, chatbot_count: 2, conversation_count: 89 },
  },
  {
    id: '3',
    name: 'Global Services',
    slug: 'global-services',
    is_active: false,
    created_at: '2024-03-10T09:15:00Z',
    stats: { user_count: 8, chatbot_count: 1, conversation_count: 45 },
  },
];

export default function CompaniesListPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
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
  const [demoMode, setDemoMode] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch companies
  const fetchCompanies = useCallback(async (page: number, search: string) => {
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

      const response = await fetch(`/api/admin/companies?${params}`);

      if (!response.ok) {
        // Use demo data if API not available
        throw new Error('API not available');
      }

      const data: CompaniesResponse = await response.json();
      setCompanies(data.companies);
      setPagination(data.pagination);
      setDemoMode(data.demo_mode || false);
    } catch (err) {
      console.error('Error fetching companies:', err);
      // Fall back to demo data
      const filtered = DEMO_COMPANIES.filter(
        (c) =>
          !search ||
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.slug.toLowerCase().includes(search.toLowerCase())
      );
      setCompanies(filtered);
      setPagination({
        total: filtered.length,
        page: 1,
        per_page: 10,
        has_more: false,
      });
      setDemoMode(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch and refetch on search/page change
  useEffect(() => {
    fetchCompanies(pagination.page, debouncedSearch);
  }, [debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
    fetchCompanies(newPage, debouncedSearch);
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
            Companies
          </h1>
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">
            Manage companies and their configurations
          </p>
        </div>
        <Link href="/admin/companies/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Company
          </Button>
        </Link>
      </div>

      {/* Demo mode notice */}
      {demoMode && (
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
          <p className="text-sm text-blue-700 dark:text-blue-400">
            Viewing demo data. API endpoints for companies are not yet configured.
          </p>
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            type="text"
            placeholder="Search companies..."
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
            onClick={() => fetchCompanies(pagination.page, debouncedSearch)}
            className="ml-auto"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {loading && companies.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
          </div>
        ) : companies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-zinc-300 dark:text-zinc-700" />
            <p className="mt-4 text-zinc-600 dark:text-zinc-400">
              {debouncedSearch
                ? 'No companies found matching your search'
                : 'No companies yet'}
            </p>
            {!debouncedSearch && (
              <Link href="/admin/companies/new" className="mt-4">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create your first company
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
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Users
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Agents
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Conversations
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
                {companies.map((company) => (
                  <tr
                    key={company.id}
                    className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  >
                    <td className="whitespace-nowrap px-6 py-4">
                      <div>
                        <p className="font-medium text-zinc-900 dark:text-zinc-100">
                          {company.name}
                        </p>
                        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                          {company.slug}
                        </p>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-zinc-400" />
                        <span className="text-zinc-700 dark:text-zinc-300">
                          {company.stats.user_count}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Bot className="h-4 w-4 text-zinc-400" />
                        <span className="text-zinc-700 dark:text-zinc-300">
                          {company.stats.chatbot_count}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-zinc-400" />
                        <span className="text-zinc-700 dark:text-zinc-300">
                          {company.stats.conversation_count}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {company.is_active ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400">
                      {formatDate(company.created_at)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <Link href={`/admin/companies/${company.id}`}>
                        <Button variant="ghost" size="sm">
                          View
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
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
            of {pagination.total} companies
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
