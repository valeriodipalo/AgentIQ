'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { MessageSquare, ArrowLeft, ArrowRight, Loader2, AlertCircle, Building2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { saveSession, getSession } from '@/lib/session';

interface CompanyInfo {
  id: string;
  name: string;
  slug: string;
  branding: {
    primary_color?: string;
    logo_url?: string;
  } | null;
}

function JoinForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteCode = searchParams.get('code') || '';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Check for existing session
  useEffect(() => {
    const session = getSession();
    if (session) {
      router.push('/workspace');
    }
  }, [router]);

  // Validate the invite code on mount
  useEffect(() => {
    const validateCode = async () => {
      if (!inviteCode) {
        setValidationError('No invite code provided');
        setIsValidating(false);
        return;
      }

      try {
        const response = await fetch('/api/invite/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: inviteCode }),
        });

        const data = await response.json();

        if (data.valid) {
          setCompany(data.company);
        } else {
          setValidationError(data.message || 'Invalid invite code');
        }
      } catch (err) {
        console.error('Error validating code:', err);
        setValidationError('Failed to validate invite code');
      } finally {
        setIsValidating(false);
      }
    };

    validateCode();
  }, [inviteCode]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !inviteCode) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/invite/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: inviteCode,
          name: name.trim(),
          email: email.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Save session
        saveSession({
          user: data.user,
          company: data.company,
          token: data.session_token,
          created_at: new Date().toISOString(),
          last_active: new Date().toISOString(),
        });

        setSuccess(true);

        // Redirect after a brief delay for UX
        setTimeout(() => {
          router.push('/workspace');
        }, 1500);
      } else {
        setError(data.message || 'Failed to join workspace');
      }
    } catch (err) {
      console.error('Error redeeming invite:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state
  if (isValidating) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-zinc-950">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-zinc-400" />
          <p className="mt-4 text-zinc-600 dark:text-zinc-400">Validating invite code...</p>
        </div>
      </div>
    );
  }

  // Validation error state
  if (validationError) {
    return (
      <div className="flex min-h-screen flex-col bg-white dark:bg-zinc-950">
        <header className="border-b border-zinc-200 dark:border-zinc-800">
          <div className="mx-auto flex h-16 max-w-7xl items-center px-6">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900 dark:bg-zinc-100">
                <MessageSquare className="h-5 w-5 text-white dark:text-zinc-900" />
              </div>
              <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Agent IQ
              </span>
            </Link>
          </div>
        </header>

        <main className="flex flex-1 items-center justify-center px-6">
          <div className="max-w-md text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
              <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="mt-6 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Invalid Invite Code
            </h1>
            <p className="mt-3 text-zinc-600 dark:text-zinc-400">
              {validationError}
            </p>
            <Link href="/">
              <Button variant="outline" className="mt-8">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-zinc-950">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="mt-6 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Welcome to {company?.name}!
          </h1>
          <p className="mt-3 text-zinc-600 dark:text-zinc-400">
            Redirecting to your workspace...
          </p>
          <Loader2 className="mx-auto mt-6 h-6 w-6 animate-spin text-zinc-400" />
        </div>
      </div>
    );
  }

  // Main join form
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-white to-zinc-50 dark:from-zinc-950 dark:to-zinc-900">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white/80 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-6">
          <Link href="/" className="flex items-center gap-2 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Back</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Company Badge */}
          <div className="mb-8 text-center">
            <div
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{ backgroundColor: company?.branding?.primary_color || '#18181b' }}
            >
              <Building2 className="h-8 w-8 text-white" />
            </div>
            <h1 className="mt-4 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Join {company?.name}
            </h1>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">
              Enter your details to get started
            </p>
          </div>

          {/* Form */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-zinc-900 dark:text-zinc-100"
                >
                  Your Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setError(null);
                  }}
                  placeholder="John Smith"
                  className="mt-2 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                  autoComplete="name"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-zinc-900 dark:text-zinc-100"
                >
                  Work Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  placeholder="john@company.com"
                  className="mt-2 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                  autoComplete="email"
                  required
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600 dark:text-red-400" />
                  <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={!name.trim() || !email.trim() || isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="mr-2 h-4 w-4" />
                )}
                Complete Setup
              </Button>
            </form>
          </div>

          {/* Invite Code Display */}
          <div className="mt-6 text-center">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Invite code: <span className="font-mono font-medium text-zinc-700 dark:text-zinc-300">{inviteCode}</span>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    }>
      <JoinForm />
    </Suspense>
  );
}
