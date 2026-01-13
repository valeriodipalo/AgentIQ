'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  Ticket,
  Users,
  Calendar,
  MoreVertical,
  Trash2,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InviteCode {
  id: string;
  code: string;
  max_uses: number | null;
  current_uses: number;
  expires_at: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  invite_redemptions: {
    id: string;
    redeemed_at: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
  }[];
}

interface Company {
  id: string;
  name: string;
  slug: string;
}

export default function InviteManagementPage() {
  const params = useParams();
  const companyId = params.id as string;

  const [company, setCompany] = useState<Company | null>(null);
  const [invites, setInvites] = useState<InviteCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Create invite form state
  const [createForm, setCreateForm] = useState({
    customCode: '',
    useCustomCode: false,
    maxUses: '10',
    unlimited: false,
    expiresInDays: '30',
    neverExpires: false,
    notes: '',
  });
  const [isCreating, setIsCreating] = useState(false);

  // Fetch invites
  const fetchInvites = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/companies/${companyId}/invites`);
      if (res.ok) {
        const data = await res.json();
        setCompany(data.company);
        setInvites(data.invites || []);
      } else {
        setError('Failed to load invite codes');
      }
    } catch (err) {
      console.error('Error fetching invites:', err);
      setError('Failed to load invite codes');
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchInvites();
  }, [fetchInvites]);

  // Copy code to clipboard
  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Create new invite
  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const res = await fetch(`/api/admin/companies/${companyId}/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: createForm.useCustomCode ? createForm.customCode : undefined,
          max_uses: createForm.unlimited ? null : parseInt(createForm.maxUses) || null,
          expires_in_days: createForm.neverExpires ? null : parseInt(createForm.expiresInDays) || null,
          notes: createForm.notes.trim() || undefined,
        }),
      });

      if (res.ok) {
        setShowCreateModal(false);
        setCreateForm({
          customCode: '',
          useCustomCode: false,
          maxUses: '10',
          unlimited: false,
          expiresInDays: '30',
          neverExpires: false,
          notes: '',
        });
        fetchInvites();
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to create invite code');
      }
    } catch (err) {
      console.error('Error creating invite:', err);
      setError('Failed to create invite code');
    } finally {
      setIsCreating(false);
    }
  };

  // Delete/deactivate invite
  const handleDeleteInvite = async (code: string) => {
    if (!confirm('Are you sure you want to delete this invite code?')) return;

    try {
      const res = await fetch(`/api/admin/companies/${companyId}/invites/${code}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchInvites();
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to delete invite code');
      }
    } catch (err) {
      console.error('Error deleting invite:', err);
      setError('Failed to delete invite code');
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Get status badge
  const getStatusBadge = (invite: InviteCode) => {
    if (!invite.is_active) {
      return (
        <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
          Inactive
        </span>
      );
    }
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return (
        <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
          Expired
        </span>
      );
    }
    if (invite.max_uses !== null && invite.current_uses >= invite.max_uses) {
      return (
        <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
          Full
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
        Active
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/admin/companies/${companyId}`}
          className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {company?.name}
        </Link>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Invite Codes
            </h1>
            <p className="mt-1 text-zinc-600 dark:text-zinc-400">
              Manage invite codes for {company?.name}
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Code
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <AlertCircle className="mt-0.5 h-5 w-5 text-red-600 dark:text-red-400" />
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Invites List */}
      {invites.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <Ticket className="mx-auto h-12 w-12 text-zinc-300 dark:text-zinc-700" />
          <h3 className="mt-4 font-medium text-zinc-900 dark:text-zinc-100">
            No invite codes yet
          </h3>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Create your first invite code to start inviting users
          </p>
          <Button onClick={() => setShowCreateModal(true)} className="mt-6">
            <Plus className="mr-2 h-4 w-4" />
            Create Code
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/50">
                <th className="px-6 py-3 text-left text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  Usage
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  Expires
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {invites.map((invite) => (
                <tr key={invite.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <code className="font-mono font-medium text-zinc-900 dark:text-zinc-100">
                        {invite.code}
                      </code>
                      <button
                        onClick={() => handleCopyCode(invite.code)}
                        className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
                        title="Copy code"
                      >
                        {copiedCode === invite.code ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {invite.notes && (
                      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        {invite.notes}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400">
                      <Users className="h-4 w-4" />
                      <span>
                        {invite.current_uses}
                        {invite.max_uses !== null ? ` / ${invite.max_uses}` : ' / ∞'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {invite.expires_at ? formatDate(invite.expires_at) : 'Never'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(invite)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDeleteInvite(invite.code)}
                      className="rounded p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                      title="Delete invite"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                Create Invite Code
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateInvite} className="space-y-5">
              {/* Code Type */}
              <div>
                <label className="mb-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={createForm.useCustomCode}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, useCustomCode: e.target.checked })
                    }
                    className="rounded border-zinc-300"
                  />
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">
                    Use custom code
                  </span>
                </label>
                {createForm.useCustomCode && (
                  <input
                    type="text"
                    value={createForm.customCode}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, customCode: e.target.value.toUpperCase() })
                    }
                    placeholder="CUSTOM-CODE"
                    className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 font-mono text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                )}
              </div>

              {/* Usage Limit */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Usage Limit
                </label>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    value={createForm.maxUses}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, maxUses: e.target.value })
                    }
                    disabled={createForm.unlimited}
                    className="w-24 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={createForm.unlimited}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, unlimited: e.target.checked })
                      }
                      className="rounded border-zinc-300"
                    />
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">
                      Unlimited
                    </span>
                  </label>
                </div>
              </div>

              {/* Expiration */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Expires In (days)
                </label>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    value={createForm.expiresInDays}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, expiresInDays: e.target.value })
                    }
                    disabled={createForm.neverExpires}
                    className="w-24 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={createForm.neverExpires}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, neverExpires: e.target.checked })
                      }
                      className="rounded border-zinc-300"
                    />
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">
                      Never expires
                    </span>
                  </label>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Notes (internal)
                </label>
                <input
                  type="text"
                  value={createForm.notes}
                  onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                  placeholder="e.g., Q1 2026 onboarding batch"
                  className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={isCreating}>
                  {isCreating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Create Code
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
