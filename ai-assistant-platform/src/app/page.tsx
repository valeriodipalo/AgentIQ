import Link from "next/link";
import { MessageSquare, Shield, Zap, Users } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-zinc-900 dark:text-zinc-100" />
            <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              AI Assistant Platform
            </span>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="/chat"
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Open Chat
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="mx-auto max-w-7xl px-6 py-24">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-5xl">
              Enterprise AI Assistant
            </h1>
            <p className="mt-6 text-lg leading-8 text-zinc-600 dark:text-zinc-400">
              A secure, multi-tenant AI chat platform designed for corporate teams.
              Get instant answers, automate workflows, and boost productivity with
              our intelligent assistant.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link
                href="/chat"
                className="rounded-lg bg-zinc-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Start Chatting
              </Link>
              <Link
                href="#features"
                className="rounded-lg border border-zinc-300 px-6 py-3 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-900"
              >
                Learn More
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="border-t border-zinc-200 bg-zinc-50 py-24 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                Built for Enterprise
              </h2>
              <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
                Designed with security, scalability, and ease of use in mind.
              </p>
            </div>

            <div className="mx-auto mt-16 grid max-w-5xl gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {/* Feature 1 */}
              <div className="rounded-xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-950">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                  <Shield className="h-6 w-6 text-zinc-900 dark:text-zinc-100" />
                </div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  Enterprise Security
                </h3>
                <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                  SOC 2 compliant with end-to-end encryption and role-based access control.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="rounded-xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-950">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                  <Zap className="h-6 w-6 text-zinc-900 dark:text-zinc-100" />
                </div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  Lightning Fast
                </h3>
                <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                  Streaming responses with edge deployment for minimal latency worldwide.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="rounded-xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-950">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                  <Users className="h-6 w-6 text-zinc-900 dark:text-zinc-100" />
                </div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  Multi-Tenant
                </h3>
                <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                  Isolated environments for each organization with custom configurations.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
            AI Assistant Platform - Internal Use Only
          </p>
        </div>
      </footer>
    </div>
  );
}
