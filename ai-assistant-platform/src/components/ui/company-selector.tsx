/**
 * Company Selector Component
 * Dropdown to select a company (tenant) for chatbot assignment
 */

'use client';

import { useEffect, useState, forwardRef } from 'react';
import { Building2, Loader2, ChevronDown, Ticket } from 'lucide-react';

interface Company {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  stats: {
    active_invite_count: number;
  };
  primary_invite_code: string | null;
}

interface CompanySelectorProps {
  value: string;
  onChange: (companyId: string) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export const CompanySelector = forwardRef<HTMLSelectElement, CompanySelectorProps>(
  ({ value, onChange, error, disabled, required, className = '' }, ref) => {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);

    useEffect(() => {
      const fetchCompanies = async () => {
        try {
          setLoading(true);
          setFetchError(null);
          const response = await fetch('/api/admin/companies?per_page=100');

          if (!response.ok) {
            throw new Error('Failed to fetch companies');
          }

          const data = await response.json();
          setCompanies(data.companies || []);
        } catch (err) {
          console.error('Error fetching companies:', err);
          setFetchError('Could not load companies');
        } finally {
          setLoading(false);
        }
      };

      fetchCompanies();
    }, []);

    const selectedCompany = companies.find(c => c.id === value);

    return (
      <div className={`w-full ${className}`}>
        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          <select
            ref={ref}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled || loading}
            required={required}
            className={`
              flex h-10 w-full appearance-none rounded-lg border bg-white pl-10 pr-10 py-2 text-sm
              text-zinc-900
              transition-colors
              focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2
              disabled:cursor-not-allowed disabled:opacity-50
              dark:bg-zinc-900 dark:text-zinc-100
              ${
                error
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-zinc-300 dark:border-zinc-700'
              }
            `}
          >
            <option value="">
              {loading ? 'Loading companies...' : 'Select a company...'}
            </option>
            {companies.map((company) => (
              <option key={company.id} value={company.id} disabled={!company.is_active}>
                {company.name} ({company.slug}){!company.is_active ? ' - Inactive' : ''}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-zinc-400" />
            )}
          </div>
        </div>

        {/* Show invite code info for selected company */}
        {selectedCompany && (
          <div className="mt-2 flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
            <Ticket className="h-4 w-4" />
            {selectedCompany.primary_invite_code ? (
              <span>
                Invite code:{' '}
                <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  {selectedCompany.primary_invite_code}
                </code>
                {selectedCompany.stats.active_invite_count > 1 && (
                  <span className="text-zinc-400">
                    {' '}(+{selectedCompany.stats.active_invite_count - 1} more)
                  </span>
                )}
              </span>
            ) : (
              <span className="text-amber-600 dark:text-amber-400">
                No active invite codes for this company
              </span>
            )}
          </div>
        )}

        {(error || fetchError) && (
          <p className="mt-1 text-sm text-red-500">{error || fetchError}</p>
        )}
      </div>
    );
  }
);

CompanySelector.displayName = 'CompanySelector';
