/**
 * Company Users Page
 * Lists and manages users for a specific company
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Search,
  Users,
  Edit,
  Trash2,
  Loader2,
  AlertCircle,
  UserPlus,
  X,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string | null;
  is_active: boolean;
  last_active_at: string | null;
  conversation_count: number;
  created_at: string;
}

interface Company {
  id: string;
  name: string;
  slug: string;
}

interface UsersResponse {
  users: User[];
  company: Company;
  pagination: {
    total: number;
    page: number;
    per_page: number;
    has_more: boolean;
  };
  demo_mode: boolean;
}

interface NewUserForm {
  email: string;
  name: string;
  role: 'user' | 'admin';
}

// Demo data for when API is not available
const DEMO_COMPANY: Company = {
  id: '1',
  name: 'Acme Corporation',
  slug: 'acme-corp',
};

const DEMO_USERS: User[] = [
  {
    id: 'user-1',
    email: 'john@acme.com',
    name: 'John Smith',
    role: 'admin',
    is_active: true,
    last_active_at: '2024-03-15T14:30:00Z',
    conversation_count: 24,
    created_at: '2024-01-15T10:00:00Z',
  },
  {
    id: 'user-2',
    email: 'jane@acme.com',
    name: 'Jane Doe',
    role: 'user',
    is_active: true,
    last_active_at: '2024-03-14T16:45:00Z',
    conversation_count: 18,
    created_at: '2024-01-20T09:30:00Z',
  },
  {
    id: 'user-3',
    email: 'bob@acme.com',
    name: 'Bob Wilson',
    role: 'user',
    is_active: true,
    last_active_at: '2024-03-10T11:20:00Z',
    conversation_count: 7,
    created_at: '2024-02-05T14:15:00Z',
  },
  {
    id: 'user-4',
    email: 'alice@acme.com',
    name: null,
    role: 'user',
    is_active: false,
    last_active_at: '2024-02-28T08:00:00Z',
    conversation_count: 3,
    created_at: '2024-02-10T10:00:00Z',
  },
];

export default function CompanyUsersPage() {
  const params = useParams();
  const companyId = params.id as string;

  const [users, setUsers] = useState<User[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
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
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Add user modal state
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [addingUser, setAddingUser] = useState(false);
  const [addUserError, setAddUserError] = useState<string | null>(null);
  const [newUserForm, setNewUserForm] = useState<NewUserForm>({
    email: '',
    name: '',
    role: 'user',
  });

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch users
  const fetchUsers = useCallback(
    async (page: number, search: string) => {
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

        const response = await fetch(
          `/api/admin/companies/${companyId}/users?${params}`
        );

        if (!response.ok) {
          throw new Error('API not available');
        }

        const data: UsersResponse = await response.json();
        setUsers(data.users);
        setCompany(data.company);
        setPagination(data.pagination);
        setDemoMode(data.demo_mode || false);
      } catch (err) {
        console.error('Error fetching users:', err);
        // Fall back to demo data
        const filtered = DEMO_USERS.filter(
          (u) =>
            !search ||
            u.email.toLowerCase().includes(search.toLowerCase()) ||
            u.name?.toLowerCase().includes(search.toLowerCase())
        );
        setUsers(filtered);
        setCompany({ ...DEMO_COMPANY, id: companyId });
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
    },
    [companyId]
  );

  // Initial fetch and refetch on search change
  useEffect(() => {
    fetchUsers(pagination.page, debouncedSearch);
  }, [debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
    fetchUsers(newPage, debouncedSearch);
  };

  // Handle delete user
  const handleDelete = async (user: User) => {
    if (
      !confirm(
        `Are you sure you want to remove "${user.email}" from this company?`
      )
    ) {
      return;
    }

    setDeletingId(user.id);

    try {
      const response = await fetch(
        `/api/admin/companies/${companyId}/users/${user.id}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to remove user');
      }

      // Refresh the list
      fetchUsers(pagination.page, debouncedSearch);
    } catch (err) {
      console.error('Error removing user:', err);
      // For demo mode, just remove from local state
      if (demoMode) {
        setUsers((prev) => prev.filter((u) => u.id !== user.id));
      } else {
        alert('Failed to remove user. Please try again.');
      }
    } finally {
      setDeletingId(null);
    }
  };

  // Handle add user
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingUser(true);
    setAddUserError(null);

    // Validate
    if (!newUserForm.email.trim()) {
      setAddUserError('Email is required');
      setAddingUser(false);
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUserForm.email)) {
      setAddUserError('Invalid email format');
      setAddingUser(false);
      return;
    }

    try {
      const response = await fetch(`/api/admin/companies/${companyId}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: newUserForm.email.trim(),
          name: newUserForm.name.trim() || null,
          role: newUserForm.role,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to add user');
      }

      // Success - close modal and refresh
      setShowAddUserModal(false);
      setNewUserForm({ email: '', name: '', role: 'user' });
      fetchUsers(pagination.page, debouncedSearch);
    } catch (err) {
      console.error('Error adding user:', err);

      // For demo mode, add to local state
      if (demoMode) {
        const newUser: User = {
          id: `user-${Date.now()}`,
          email: newUserForm.email,
          name: newUserForm.name || null,
          role: newUserForm.role,
          is_active: true,
          last_active_at: null,
          conversation_count: 0,
          created_at: new Date().toISOString(),
        };
        setUsers((prev) => [newUser, ...prev]);
        setShowAddUserModal(false);
        setNewUserForm({ email: '', name: '', role: 'user' });
      } else {
        setAddUserError(
          err instanceof Error ? err.message : 'Failed to add user'
        );
      }
    } finally {
      setAddingUser(false);
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
  const formatRelativeTime = (dateString: string | null) => {
    if (!dateString) return 'Never';
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

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/admin/companies/${companyId}`}
          className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {company?.name || 'Company'}
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Users
            </h1>
            <p className="mt-1 text-zinc-600 dark:text-zinc-400">
              Manage users for {company?.name || 'this company'}
            </p>
          </div>
          <Button onClick={() => setShowAddUserModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>
      </div>

      {/* Demo mode notice */}
      {demoMode && (
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
          <p className="text-sm text-blue-700 dark:text-blue-400">
            Viewing demo data. API endpoints for company users are not yet
            configured.
          </p>
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            type="text"
            placeholder="Search users by email or name..."
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
            onClick={() => fetchUsers(pagination.page, debouncedSearch)}
            className="ml-auto"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {loading && users.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-zinc-300 dark:text-zinc-700" />
            <p className="mt-4 text-zinc-600 dark:text-zinc-400">
              {debouncedSearch
                ? 'No users found matching your search'
                : 'No users in this company yet'}
            </p>
            {!debouncedSearch && (
              <Button onClick={() => setShowAddUserModal(true)} className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Add your first user
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Last Active
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Conversations
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  >
                    <td className="whitespace-nowrap px-6 py-4">
                      <div>
                        <p className="font-medium text-zinc-900 dark:text-zinc-100">
                          {user.name || 'No name'}
                        </p>
                        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                          {user.email}
                        </p>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          user.role === 'admin'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                            : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                        }`}
                      >
                        {user.role || 'user'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {user.is_active ? (
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
                      {formatRelativeTime(user.last_active_at)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-zinc-400" />
                        <span className="text-zinc-700 dark:text-zinc-300">
                          {user.conversation_count}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(user)}
                          disabled={deletingId === user.id}
                          className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:text-red-300"
                        >
                          {deletingId === user.id ? (
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
            of {pagination.total} users
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

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowAddUserModal(false)}
          />

          {/* Modal */}
          <div className="relative w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                <UserPlus className="h-5 w-5" />
                Add User
              </h2>
              <button
                onClick={() => setShowAddUserModal(false)}
                className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddUser}>
              {addUserError && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
                  <p className="text-sm text-red-700 dark:text-red-400">
                    {addUserError}
                  </p>
                </div>
              )}

              <div className="mb-4">
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-zinc-900 dark:text-zinc-100"
                >
                  Email <span className="text-red-500">*</span>
                </label>
                <Input
                  id="email"
                  type="email"
                  value={newUserForm.email}
                  onChange={(e) =>
                    setNewUserForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                  placeholder="user@example.com"
                />
              </div>

              <div className="mb-4">
                <label
                  htmlFor="name"
                  className="mb-2 block text-sm font-medium text-zinc-900 dark:text-zinc-100"
                >
                  Name
                </label>
                <Input
                  id="name"
                  type="text"
                  value={newUserForm.name}
                  onChange={(e) =>
                    setNewUserForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="John Doe"
                />
              </div>

              <div className="mb-6">
                <label
                  htmlFor="role"
                  className="mb-2 block text-sm font-medium text-zinc-900 dark:text-zinc-100"
                >
                  Role
                </label>
                <select
                  id="role"
                  value={newUserForm.role}
                  onChange={(e) =>
                    setNewUserForm((prev) => ({
                      ...prev,
                      role: e.target.value as 'user' | 'admin',
                    }))
                  }
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddUserModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={addingUser}>
                  {addingUser ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add User
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
