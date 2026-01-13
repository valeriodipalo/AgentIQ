'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MessageSquare, ArrowRight, Loader2, AlertCircle, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSession } from '@/lib/session';

export default function Home() {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEmailLookup, setShowEmailLookup] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const session = getSession();
    if (session) {
      router.push('/workspace');
    } else {
      setCheckingSession(false);
    }
  }, [router]);

  // Handle invite code submission
  const handleSubmitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/invite/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: inviteCode.trim() }),
      });

      const data = await response.json();

      if (data.valid) {
        // Redirect to join page with code
        router.push(`/join?code=${encodeURIComponent(inviteCode.trim().toUpperCase())}`);
      } else {
        setError(data.message || 'Invalid invite code');
      }
    } catch (err) {
      console.error('Error validating code:', err);
      setError('Failed to validate code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle email lookup for returning users
  const handleEmailLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/invite/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (data.found) {
        // Save session and redirect
        const { saveSession } = await import('@/lib/session');
        saveSession({
          user: data.user,
          company: data.company,
          token: data.session_token,
          created_at: new Date().toISOString(),
          last_active: new Date().toISOString(),
        });
        router.push('/workspace');
      } else {
        setError(data.message || 'No account found with this email');
      }
    } catch (err) {
      console.error('Error looking up email:', err);
      setError('Failed to look up email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading while checking session
  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-white to-zinc-50 dark:from-zinc-950 dark:to-zinc-900">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white/80 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900 dark:bg-zinc-100">
              <MessageSquare className="h-5 w-5 text-white dark:text-zinc-900" />
            </div>
            <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Agent IQ
            </span>
          </div>
          <Link
            href="/admin"
            className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Admin
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Hero Text */}
          <div className="mb-10 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">
              Welcome to Agent IQ
            </h1>
            <p className="mt-3 text-zinc-600 dark:text-zinc-400">
              Your intelligent AI assistant workspace
            </p>
          </div>

          {/* Invite Code Form */}
          {!showEmailLookup ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <form onSubmit={handleSubmitCode} className="space-y-6">
                <div>
                  <label
                    htmlFor="invite-code"
                    className="block text-sm font-medium text-zinc-900 dark:text-zinc-100"
                  >
                    Enter your invite code
                  </label>
                  <div className="mt-2">
                    <input
                      id="invite-code"
                      type="text"
                      value={inviteCode}
                      onChange={(e) => {
                        setInviteCode(e.target.value.toUpperCase());
                        setError(null);
                      }}
                      placeholder="ACME-7X9K"
                      className="block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-center text-lg font-mono tracking-wider text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                      autoComplete="off"
                      autoFocus
                    />
                  </div>
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
                  disabled={!inviteCode.trim() || isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="mr-2 h-4 w-4" />
                  )}
                  Join Workspace
                </Button>
              </form>

              <div className="mt-6 border-t border-zinc-200 pt-6 dark:border-zinc-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowEmailLookup(true);
                    setError(null);
                  }}
                  className="flex w-full items-center justify-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                  <Mail className="h-4 w-4" />
                  Already have an account? Sign in with email
                </button>
              </div>
            </div>
          ) : (
            /* Email Lookup Form */
            <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <form onSubmit={handleEmailLookup} className="space-y-6">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-zinc-900 dark:text-zinc-100"
                  >
                    Enter your email
                  </label>
                  <div className="mt-2">
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError(null);
                      }}
                      placeholder="you@company.com"
                      className="block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                      autoComplete="email"
                      autoFocus
                    />
                  </div>
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
                  disabled={!email.trim() || isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="mr-2 h-4 w-4" />
                  )}
                  Continue
                </Button>
              </form>

              <div className="mt-6 border-t border-zinc-200 pt-6 dark:border-zinc-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowEmailLookup(false);
                    setError(null);
                  }}
                  className="flex w-full items-center justify-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                  Have an invite code? Enter it here
                </button>
              </div>
            </div>
          )}

          {/* Help Text */}
          <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Don&apos;t have an invite code?{' '}
            <span className="text-zinc-700 dark:text-zinc-300">
              Contact your administrator
            </span>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <p className="text-center text-sm text-zinc-500 dark:text-zinc-500">
            Agent IQ - Enterprise AI Assistant Platform
          </p>
        </div>
      </footer>
    </div>
  );
}
