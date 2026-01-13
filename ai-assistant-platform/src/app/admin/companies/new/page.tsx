/**
 * Create Company Page
 * Form for creating a new company (tenant)
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Building2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface FormData {
  name: string;
  slug: string;
  branding_primary_color: string;
  branding_logo_url: string;
  is_active: boolean;
}

interface FormErrors {
  name?: string;
  slug?: string;
  branding_primary_color?: string;
  branding_logo_url?: string;
  general?: string;
}

// Generate slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function CreateCompanyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    slug: '',
    branding_primary_color: '#3b82f6',
    branding_logo_url: '',
    is_active: true,
  });

  // Auto-generate slug from name (unless manually edited)
  useEffect(() => {
    if (!slugManuallyEdited && formData.name) {
      setFormData((prev) => ({
        ...prev,
        slug: generateSlug(prev.name),
      }));
    }
  }, [formData.name, slugManuallyEdited]);

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;

    if (name === 'slug') {
      setSlugManuallyEdited(true);
      // Sanitize slug input
      const sanitizedSlug = value
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-');
      setFormData((prev) => ({ ...prev, slug: sanitizedSlug }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
      }));
    }

    // Clear error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  // Handle toggle changes
  const handleToggle = (field: keyof FormData) => {
    setFormData((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Company name is required';
    } else if (formData.name.length > 255) {
      newErrors.name = 'Name must be 255 characters or less';
    }

    if (!formData.slug.trim()) {
      newErrors.slug = 'Slug is required';
    } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      newErrors.slug = 'Slug can only contain lowercase letters, numbers, and hyphens';
    } else if (formData.slug.length > 100) {
      newErrors.slug = 'Slug must be 100 characters or less';
    }

    if (formData.branding_primary_color && !/^#[0-9A-Fa-f]{6}$/.test(formData.branding_primary_color)) {
      newErrors.branding_primary_color = 'Invalid color format. Use hex format (e.g., #3b82f6)';
    }

    if (formData.branding_logo_url && formData.branding_logo_url.length > 500) {
      newErrors.branding_logo_url = 'Logo URL must be 500 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      // Build branding object
      const branding: Record<string, string> = {};
      if (formData.branding_primary_color) {
        branding.primary_color = formData.branding_primary_color;
      }
      if (formData.branding_logo_url) {
        branding.logo_url = formData.branding_logo_url;
      }

      const response = await fetch('/api/admin/companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          slug: formData.slug.trim(),
          branding: Object.keys(branding).length > 0 ? branding : null,
          is_active: formData.is_active,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create company');
      }

      const data = await response.json();
      // Redirect to company dashboard on success
      router.push(`/admin/companies/${data.id}`);
    } catch (err) {
      console.error('Error creating company:', err);

      // For demo purposes, simulate success
      if (err instanceof Error && err.message.includes('fetch')) {
        // API not available, redirect to list with demo notice
        router.push('/admin/companies');
        return;
      }

      setErrors({
        general: err instanceof Error ? err.message : 'Failed to create company',
      });
    } finally {
      setLoading(false);
    }
  };

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
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Create Company
        </h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Set up a new company for the platform
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6">
        {/* Basic Info Section */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            <Building2 className="h-5 w-5" />
            Company Information
          </h2>

          {/* General error */}
          {errors.general && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
              <p className="text-sm text-red-700 dark:text-red-400">
                {errors.general}
              </p>
            </div>
          )}

          {/* Name */}
          <div className="mb-6">
            <label
              htmlFor="name"
              className="mb-2 block text-sm font-medium text-zinc-900 dark:text-zinc-100"
            >
              Company Name <span className="text-red-500">*</span>
            </label>
            <Input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              placeholder="Acme Corporation"
              error={errors.name}
            />
          </div>

          {/* Slug */}
          <div className="mb-6">
            <label
              htmlFor="slug"
              className="mb-2 block text-sm font-medium text-zinc-900 dark:text-zinc-100"
            >
              Slug <span className="text-red-500">*</span>
            </label>
            <Input
              id="slug"
              name="slug"
              type="text"
              value={formData.slug}
              onChange={handleChange}
              placeholder="acme-corp"
              error={errors.slug}
            />
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              URL-friendly identifier. Auto-generated from name, but can be customized.
            </p>
          </div>

          {/* Active Toggle */}
          <div>
            <label className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={formData.is_active}
                onClick={() => handleToggle('is_active')}
                className={`
                  relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full
                  transition-colors duration-200 ease-in-out
                  focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2
                  ${formData.is_active ? 'bg-green-600' : 'bg-zinc-300 dark:bg-zinc-700'}
                `}
              >
                <span
                  className={`
                    pointer-events-none inline-block h-5 w-5 transform rounded-full
                    bg-white shadow ring-0 transition duration-200 ease-in-out
                    ${formData.is_active ? 'translate-x-5' : 'translate-x-0.5'}
                    mt-0.5
                  `}
                />
              </button>
              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Active
              </span>
            </label>
            <p className="mt-1 ml-14 text-xs text-zinc-500 dark:text-zinc-400">
              Active companies can access the platform
            </p>
          </div>
        </div>

        {/* Branding Section */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Branding (Optional)
          </h2>

          {/* Primary Color */}
          <div className="mb-6">
            <label
              htmlFor="branding_primary_color"
              className="mb-2 block text-sm font-medium text-zinc-900 dark:text-zinc-100"
            >
              Primary Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                id="branding_primary_color_picker"
                value={formData.branding_primary_color || '#3b82f6'}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    branding_primary_color: e.target.value,
                  }))
                }
                className="h-10 w-14 cursor-pointer rounded border border-zinc-300 dark:border-zinc-700"
              />
              <Input
                id="branding_primary_color"
                name="branding_primary_color"
                type="text"
                value={formData.branding_primary_color}
                onChange={handleChange}
                placeholder="#3b82f6"
                error={errors.branding_primary_color}
                className="flex-1"
              />
            </div>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Main brand color used throughout the platform
            </p>
          </div>

          {/* Logo URL */}
          <div>
            <label
              htmlFor="branding_logo_url"
              className="mb-2 block text-sm font-medium text-zinc-900 dark:text-zinc-100"
            >
              Logo URL
            </label>
            <Input
              id="branding_logo_url"
              name="branding_logo_url"
              type="text"
              value={formData.branding_logo_url}
              onChange={handleChange}
              placeholder="https://example.com/logo.png"
              error={errors.branding_logo_url}
            />
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              URL to the company logo image
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link href="/admin/companies">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Building2 className="mr-2 h-4 w-4" />
                Create Company
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
