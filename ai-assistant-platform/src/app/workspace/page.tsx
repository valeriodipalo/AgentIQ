'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bot, MessageSquare, ArrowRight, Loader2, Calendar } from 'lucide-react';
import { getSession } from '@/lib/session';

interface Chatbot {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  is_published: boolean;
}

interface RecentConversation {
  id: string;
  title: string;
  chatbot_name: string;
  updated_at: string;
  message_count: number;
}

export default function WorkspacePage() {
  const router = useRouter();
  const [session, setSession] = useState<ReturnType<typeof getSession>>(null);
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [recentConversations, setRecentConversations] = useState<RecentConversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const currentSession = getSession();
    setSession(currentSession);

    if (currentSession) {
      fetchData(currentSession.company.id, currentSession.user.id);
    }
  }, []);

  const fetchData = async (companyId: string, userId: string) => {
    try {
      // Fetch chatbots for this company
      const chatbotsRes = await fetch(`/api/companies/${companyId}/chatbots`);
      if (chatbotsRes.ok) {
        const data = await chatbotsRes.json();
        setChatbots(data.chatbots || []);
      }

      // Fetch recent conversations
      const convsRes = await fetch(`/api/conversations?user_id=${userId}&limit=5`);
      if (convsRes.ok) {
        const data = await convsRes.json();
        setRecentConversations(data.conversations || []);
      }
    } catch (error) {
      console.error('Error fetching workspace data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectChatbot = (chatbotId: string) => {
    router.push(`/workspace/chat?agent=${chatbotId}`);
  };

  const handleSelectConversation = (conversationId: string) => {
    router.push(`/workspace/chat?conversation=${conversationId}`);
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Welcome back, {session?.user.name?.split(' ')[0]}!
        </h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Select an assistant to start a conversation
        </p>
      </div>

      {/* Chatbots Grid */}
      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Available Assistants
        </h2>
        {chatbots.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <Bot className="mx-auto h-12 w-12 text-zinc-300 dark:text-zinc-700" />
            <p className="mt-4 text-zinc-600 dark:text-zinc-400">
              No assistants available yet
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {chatbots.map((chatbot) => (
              <button
                key={chatbot.id}
                onClick={() => handleSelectChatbot(chatbot.id)}
                className="group flex flex-col rounded-xl border border-zinc-200 bg-white p-6 text-left transition-all hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                    <Bot className="h-6 w-6 text-zinc-600 dark:text-zinc-400" />
                  </div>
                  <ArrowRight className="h-5 w-5 text-zinc-400 opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100" />
                </div>
                <h3 className="mt-4 font-semibold text-zinc-900 dark:text-zinc-100">
                  {chatbot.name}
                </h3>
                {chatbot.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                    {chatbot.description}
                  </p>
                )}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Recent Conversations */}
      {recentConversations.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Recent Conversations
          </h2>
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            {recentConversations.map((conv, index) => (
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
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">
                        {conv.title || 'Untitled conversation'}
                      </p>
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        <Bot className="mr-1 h-3 w-3" />
                        {conv.chatbot_name}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(conv.updated_at)}
                      </span>
                      <span>·</span>
                      <span>{conv.message_count} messages</span>
                    </div>
                  </div>
                </div>
                <span className="text-xs text-zinc-400 dark:text-zinc-500">
                  {formatRelativeTime(conv.updated_at)}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
