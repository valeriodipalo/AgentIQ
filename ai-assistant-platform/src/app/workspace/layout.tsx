'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MessageSquare, Bot, History, LogOut, Loader2, Building2 } from 'lucide-react';
import { getSession, clearSession, type UserSession } from '@/lib/session';

interface WorkspaceLayoutProps {
  children: React.ReactNode;
}

export default function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check session on mount
  useEffect(() => {
    const currentSession = getSession();
    if (!currentSession) {
      router.push('/');
    } else {
      setSession(currentSession);
      setIsLoading(false);
    }
  }, [router]);

  // Handle logout
  const handleLogout = () => {
    clearSession();
    router.push('/');
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-900">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 w-64 border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex h-full flex-col">
          {/* Company Header */}
          <div className="border-b border-zinc-200 p-4 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg"
                style={{ backgroundColor: session.company.branding?.primary_color || '#18181b' }}
              >
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-zinc-900 dark:text-zinc-100">
                  {session.company.name}
                </p>
                <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
                  {session.user.name}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-3">
            <Link
              href="/workspace"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <Bot className="h-5 w-5" />
              <span>Assistants</span>
            </Link>
            <Link
              href="/workspace/chat"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <MessageSquare className="h-5 w-5" />
              <span>Chat</span>
            </Link>
            <Link
              href="/workspace/history"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <History className="h-5 w-5" />
              <span>History</span>
            </Link>
          </nav>

          {/* User Section */}
          <div className="border-t border-zinc-200 p-3 dark:border-zinc-800">
            <div className="mb-3 px-3">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {session.user.name}
              </p>
              <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                {session.user.email}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            >
              <LogOut className="h-5 w-5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 flex-1">
        {children}
      </main>
    </div>
  );
}
