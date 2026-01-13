/**
 * User Control Panel
 * Main entry point for users - displays available chatbots and recent conversations
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Bot, MessageSquare, Loader2, AlertCircle, Search, Clock, Settings, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Chatbot {
  id: string;
  name: string;
  description: string | null;
  model: string;
  created_at: string;
}

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
  chatbot_id: string | null;
  metadata: {
    message_count?: number;
  } | null;
}

interface ChatbotsResponse {
  chatbots: Chatbot[];
  pagination: {
    total: number;
    page: number;
    per_page: number;
    has_more: boolean;
  };
  demo_mode?: boolean;
}

interface ConversationsResponse {
  conversations: Conversation[];
  pagination: {
    total: number;
  };
}

function ChatbotCard({
  chatbot,
  onSelect,
}: {
  chatbot: Chatbot;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      onClick={() => onSelect(chatbot.id)}
      className="group flex flex-col rounded-xl border border-zinc-200 bg-white p-6 text-left transition-all hover:border-zinc-300 hover:shadow-lg dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-zinc-600"
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 transition-colors group-hover:bg-zinc-200 dark:bg-zinc-700 dark:group-hover:bg-zinc-600">
        <Bot className="h-6 w-6 text-zinc-600 dark:text-zinc-300" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        {chatbot.name}
      </h3>
      <p className="mb-4 flex-1 text-sm text-zinc-600 dark:text-zinc-400">
        {chatbot.description || 'No description available'}
      </p>
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
          {chatbot.model}
        </span>
        <span className="text-sm font-medium text-blue-600 opacity-0 transition-opacity group-hover:opacity-100 dark:text-blue-400">
          Start Chat →
        </span>
      </div>
    </button>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 rounded-full bg-zinc-100 p-4 dark:bg-zinc-800">
        <Bot className="h-12 w-12 text-zinc-400" />
      </div>
      <h2 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        No Chatbots Available
      </h2>
      <p className="max-w-md text-zinc-600 dark:text-zinc-400">
        There are no published chatbots available at the moment. Please check back later or contact your administrator.
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <Loader2 className="mb-4 h-8 w-8 animate-spin text-zinc-400" />
      <p className="text-zinc-600 dark:text-zinc-400">Loading chatbots...</p>
    </div>
  );
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 rounded-full bg-red-100 p-4 dark:bg-red-900/30">
        <AlertCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
      </div>
      <h2 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        Failed to Load Chatbots
      </h2>
      <p className="mb-4 max-w-md text-zinc-600 dark:text-zinc-400">{error}</p>
      <Button onClick={onRetry} variant="primary">
        Try Again
      </Button>
    </div>
  );
}

export default function ChatbotsPage() {
  const router = useRouter();
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [demoMode, setDemoMode] = useState(false);

  const fetchChatbots = async (search?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (search) {
        params.set('search', search);
      }
      params.set('per_page', '50');

      const response = await fetch(`/api/chatbots?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch chatbots');
      }

      const data: ChatbotsResponse = await response.json();
      setChatbots(data.chatbots);
      setDemoMode(data.demo_mode || false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRecentConversations = async () => {
    try {
      const response = await fetch('/api/conversations?per_page=5');
      if (response.ok) {
        const data: ConversationsResponse = await response.json();
        setConversations(data.conversations || []);
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
    }
  };

  useEffect(() => {
    fetchChatbots();
    fetchRecentConversations();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchChatbots(searchQuery);
  };

  const handleSelectChatbot = (chatbotId: string) => {
    router.push(`/chat?chatbot_id=${chatbotId}`);
  };

  // Helper to get chatbot name by ID
  const getChatbotName = (chatbotId: string | null) => {
    if (!chatbotId) return null;
    const chatbot = chatbots.find(c => c.id === chatbotId);
    return chatbot?.name || null;
  };

  // Format relative time
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-zinc-100 p-2 dark:bg-zinc-800">
                <MessageSquare className="h-6 w-6 text-zinc-600 dark:text-zinc-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                  User Panel
                </h1>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Select an assistant to start a conversation
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {demoMode && (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                  Demo Mode
                </span>
              )}
              <Link
                href="/admin"
                className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                <Settings className="h-4 w-4" />
                Admin
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* Recent Conversations Section */}
        {conversations.length > 0 && (
          <section className="mb-10">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                <Clock className="h-5 w-5 text-zinc-500" />
                Recent Conversations
              </h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {conversations.map((conv) => (
                <Link
                  key={conv.id}
                  href={conv.chatbot_id ? `/chat?chatbot_id=${conv.chatbot_id}` : '/chat'}
                  className="group flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-4 transition-all hover:border-zinc-300 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-zinc-600"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                      {conv.title}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                      <span>{formatTimeAgo(conv.updated_at)}</span>
                      {conv.chatbot_id && getChatbotName(conv.chatbot_id) && (
                        <>
                          <span>·</span>
                          <span className="truncate">{getChatbotName(conv.chatbot_id)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="ml-3 h-4 w-4 shrink-0 text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Available Assistants Section */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              <Bot className="h-5 w-5 text-zinc-500" />
              Available Assistants
            </h2>
            {/* Search */}
            <form onSubmit={handleSearch} className="w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <Input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </form>
          </div>

          {/* Content */}
          {isLoading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState error={error} onRetry={() => fetchChatbots(searchQuery)} />
          ) : chatbots.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
                {chatbots.length} assistant{chatbots.length !== 1 ? 's' : ''} available
              </p>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {chatbots.map((chatbot) => (
                  <ChatbotCard
                    key={chatbot.id}
                    chatbot={chatbot}
                    onSelect={handleSelectChatbot}
                  />
                ))}
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
