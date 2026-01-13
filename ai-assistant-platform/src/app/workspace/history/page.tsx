'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, Loader2, Search, Calendar } from 'lucide-react';
import { getSession } from '@/lib/session';

interface Conversation {
  id: string;
  title: string;
  chatbot_name: string;
  updated_at: string;
  message_count: number;
  is_archived: boolean;
}

export default function HistoryPage() {
  const router = useRouter();
  const [session, setSession] = useState<ReturnType<typeof getSession>>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const currentSession = getSession();
    if (!currentSession) {
      router.push('/');
      return;
    }
    setSession(currentSession);
    fetchConversations(currentSession.user.id);
  }, [router]);

  const fetchConversations = async (userId: string) => {
    try {
      const res = await fetch(`/api/conversations?user_id=${userId}&limit=50`);
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectConversation = (conversationId: string) => {
    router.push(`/workspace/chat?conversation=${conversationId}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Filter conversations by search query
  const filteredConversations = conversations.filter((conv) =>
    conv.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.chatbot_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group conversations by date
  const groupedConversations = filteredConversations.reduce((groups, conv) => {
    const dateKey = formatDate(conv.updated_at);
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(conv);
    return groups;
  }, {} as Record<string, Conversation[]>);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Conversation History
        </h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Browse and continue your past conversations
        </p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full rounded-lg border border-zinc-300 bg-white py-2.5 pl-10 pr-4 text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>
      </div>

      {/* Conversations List */}
      {filteredConversations.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <MessageSquare className="mx-auto h-12 w-12 text-zinc-300 dark:text-zinc-700" />
          <h3 className="mt-4 font-medium text-zinc-900 dark:text-zinc-100">
            {searchQuery ? 'No matching conversations' : 'No conversations yet'}
          </h3>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            {searchQuery
              ? 'Try adjusting your search'
              : 'Start a new conversation from the Assistants page'}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedConversations).map(([date, convs]) => (
            <div key={date}>
              <div className="mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-zinc-400" />
                <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  {date}
                </h2>
              </div>
              <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                {convs.map((conv, index) => (
                  <button
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv.id)}
                    className={`flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${
                      index !== 0 ? 'border-t border-zinc-200 dark:border-zinc-800' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                        <MessageSquare className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                      </div>
                      <div>
                        <p className="font-medium text-zinc-900 dark:text-zinc-100">
                          {conv.title || 'Untitled conversation'}
                        </p>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                          {conv.chatbot_name} · {conv.message_count} messages
                        </p>
                      </div>
                    </div>
                    <span className="text-sm text-zinc-500 dark:text-zinc-400">
                      {formatTime(conv.updated_at)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
