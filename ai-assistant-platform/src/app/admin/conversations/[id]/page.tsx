/**
 * Admin Conversation Detail Page
 * Displays conversation metadata, messages, and feedback
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Building2,
  User,
  Bot,
  Calendar,
  Clock,
  Hash,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Message with feedback from API
 */
interface MessageWithFeedback {
  id: string;
  role: string;
  content: string;
  created_at: string;
  token_count: number | null;
  latency_ms: number | null;
  model_used: string | null;
  feedback: {
    id: string;
    rating: number;
    notes: string | null;
    created_at: string;
  } | null;
}

/**
 * Conversation detail from API
 */
interface ConversationDetail {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
  metadata: Record<string, unknown> | null;
  company: {
    id: string;
    name: string;
    slug: string;
  } | null;
  user: {
    id: string;
    email: string;
    name: string | null;
  } | null;
  chatbot: {
    id: string;
    name: string;
    model: string;
    description: string | null;
  } | null;
  messages: MessageWithFeedback[];
  feedback_summary: {
    positive: number;
    negative: number;
    total: number;
  };
}

/**
 * API response structure
 */
interface ConversationDetailResponse {
  conversation: ConversationDetail;
  demo_mode: boolean;
}

// Demo conversation for fallback
const DEMO_CONVERSATION: ConversationDetail = {
  id: '1',
  title: 'How to configure settings',
  created_at: '2024-01-15T10:30:00Z',
  updated_at: '2024-01-15T10:45:00Z',
  is_archived: false,
  metadata: null,
  company: { id: '1', name: 'Acme Corporation', slug: 'acme-corp' },
  user: { id: '1', email: 'john@acme.com', name: 'John Smith' },
  chatbot: {
    id: '1',
    name: 'Support Assistant',
    model: 'gpt-4',
    description: 'General support assistant',
  },
  messages: [
    {
      id: 'm1',
      role: 'user',
      content: 'Hi, I need help configuring my account settings.',
      created_at: '2024-01-15T10:30:00Z',
      token_count: 12,
      latency_ms: null,
      model_used: null,
      feedback: null,
    },
    {
      id: 'm2',
      role: 'assistant',
      content:
        "Hello! I'd be happy to help you configure your account settings. Could you tell me which specific settings you'd like to change? Here are some common options:\n\n1. Profile information\n2. Notification preferences\n3. Security settings\n4. Billing details",
      created_at: '2024-01-15T10:30:15Z',
      token_count: 58,
      latency_ms: 1200,
      model_used: 'gpt-4',
      feedback: { id: 'f1', rating: 1, notes: 'Very helpful response', created_at: '2024-01-15T10:32:00Z' },
    },
    {
      id: 'm3',
      role: 'user',
      content: 'I want to update my notification preferences. How do I turn off email notifications?',
      created_at: '2024-01-15T10:33:00Z',
      token_count: 18,
      latency_ms: null,
      model_used: null,
      feedback: null,
    },
    {
      id: 'm4',
      role: 'assistant',
      content:
        "To turn off email notifications, follow these steps:\n\n1. Go to Settings (gear icon in the top right)\n2. Click on 'Notifications'\n3. Under 'Email Notifications', toggle the switch to OFF\n4. Click 'Save Changes'\n\nYou can also customize which specific emails you receive rather than turning them all off. Would you like me to explain the different notification types?",
      created_at: '2024-01-15T10:33:20Z',
      token_count: 85,
      latency_ms: 1500,
      model_used: 'gpt-4',
      feedback: { id: 'f2', rating: 1, notes: null, created_at: '2024-01-15T10:35:00Z' },
    },
    {
      id: 'm5',
      role: 'user',
      content: 'That worked, thanks!',
      created_at: '2024-01-15T10:40:00Z',
      token_count: 5,
      latency_ms: null,
      model_used: null,
      feedback: null,
    },
    {
      id: 'm6',
      role: 'assistant',
      content:
        "You're welcome! I'm glad I could help. Is there anything else you'd like assistance with regarding your account settings or any other questions?",
      created_at: '2024-01-15T10:40:10Z',
      token_count: 32,
      latency_ms: 900,
      model_used: 'gpt-4',
      feedback: null,
    },
  ],
  feedback_summary: { positive: 2, negative: 0, total: 2 },
};

export default function ConversationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = params.id as string;

  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);

  // Fetch conversation details
  const fetchConversation = useCallback(async () => {
    if (!conversationId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/conversations/${conversationId}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Conversation not found');
        }
        throw new Error('Failed to fetch conversation');
      }

      const data: ConversationDetailResponse = await response.json();
      setConversation(data.conversation);
      setDemoMode(data.demo_mode || false);
    } catch (err) {
      console.error('Error fetching conversation:', err);
      // Fall back to demo data
      if (conversationId === '1' || conversationId === DEMO_CONVERSATION.id) {
        setConversation(DEMO_CONVERSATION);
        setDemoMode(true);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load conversation');
      }
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    fetchConversation();
  }, [fetchConversation]);

  // Format date/time
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Format time only
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  // Error state
  if (error && !conversation) {
    return (
      <div className="p-6 lg:p-8">
        <div className="mb-6">
          <Link href="/admin/conversations">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Conversations
            </Button>
          </Link>
        </div>
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-red-500" />
          <p className="mt-4 text-lg font-medium text-zinc-900 dark:text-zinc-100">
            {error}
          </p>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            The conversation may have been deleted or you may not have access to it.
          </p>
          <Button
            variant="outline"
            className="mt-6"
            onClick={() => router.push('/admin/conversations')}
          >
            Return to Conversations
          </Button>
        </div>
      </div>
    );
  }

  if (!conversation) {
    return null;
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Back link */}
      <div className="mb-6">
        <Link href="/admin/conversations">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Conversations
          </Button>
        </Link>
      </div>

      {/* Demo mode notice */}
      {demoMode && (
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
          <p className="text-sm text-blue-700 dark:text-blue-400">
            Viewing demo data. Connect to the database to see real conversation details.
          </p>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          {conversation.title || 'Untitled Conversation'}
        </h1>

        {/* Metadata cards */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Company */}
          <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
              <Building2 className="h-4 w-4" />
              <span className="text-xs font-medium uppercase">Company</span>
            </div>
            <p className="mt-2 font-medium text-zinc-900 dark:text-zinc-100">
              {conversation.company?.name || '-'}
            </p>
            {conversation.company?.slug && (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {conversation.company.slug}
              </p>
            )}
          </div>

          {/* User */}
          <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
              <User className="h-4 w-4" />
              <span className="text-xs font-medium uppercase">User</span>
            </div>
            <p className="mt-2 font-medium text-zinc-900 dark:text-zinc-100">
              {conversation.user?.name || conversation.user?.email || '-'}
            </p>
            {conversation.user?.name && conversation.user?.email && (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {conversation.user.email}
              </p>
            )}
          </div>

          {/* Agent */}
          <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
              <Bot className="h-4 w-4" />
              <span className="text-xs font-medium uppercase">Agent</span>
            </div>
            <p className="mt-2 font-medium text-zinc-900 dark:text-zinc-100">
              {conversation.chatbot?.name || '-'}
            </p>
            {conversation.chatbot?.model && (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {conversation.chatbot.model}
              </p>
            )}
          </div>

          {/* Stats */}
          <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
              <MessageSquare className="h-4 w-4" />
              <span className="text-xs font-medium uppercase">Stats</span>
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">Messages:</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {conversation.messages.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">Feedback:</span>
                <div className="flex items-center gap-2">
                  {conversation.feedback_summary.positive > 0 && (
                    <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                      <ThumbsUp className="h-3 w-3" />
                      {conversation.feedback_summary.positive}
                    </span>
                  )}
                  {conversation.feedback_summary.negative > 0 && (
                    <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                      <ThumbsDown className="h-3 w-3" />
                      {conversation.feedback_summary.negative}
                    </span>
                  )}
                  {conversation.feedback_summary.total === 0 && (
                    <span className="text-zinc-400">-</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dates */}
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-zinc-500 dark:text-zinc-400">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>Created: {formatDateTime(conversation.created_at)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>Updated: {formatDateTime(conversation.updated_at)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Hash className="h-4 w-4" />
            <span className="font-mono text-xs">{conversation.id}</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Conversation History
          </h2>
        </div>
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {conversation.messages.map((message) => (
            <div
              key={message.id}
              className={`p-6 ${
                message.role === 'assistant'
                  ? 'bg-zinc-50 dark:bg-zinc-800/30'
                  : ''
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Avatar/Icon */}
                <div
                  className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                    message.role === 'user'
                      ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400'
                      : 'bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400'
                  }`}
                >
                  {message.role === 'user' ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>

                {/* Message content */}
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {message.role === 'user'
                        ? conversation.user?.name || 'User'
                        : conversation.chatbot?.name || 'Assistant'}
                    </span>
                    <span className="text-xs text-zinc-400">
                      {formatTime(message.created_at)}
                    </span>
                    {message.model_used && (
                      <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                        {message.model_used}
                      </span>
                    )}
                  </div>

                  {/* Message text */}
                  <div className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
                    {message.content}
                  </div>

                  {/* Message metadata */}
                  {(message.token_count || message.latency_ms) && (
                    <div className="mt-2 flex gap-3 text-xs text-zinc-400">
                      {message.token_count && (
                        <span>{message.token_count} tokens</span>
                      )}
                      {message.latency_ms && (
                        <span>{message.latency_ms}ms</span>
                      )}
                    </div>
                  )}

                  {/* Feedback badge */}
                  {message.feedback && (
                    <div className="mt-3">
                      <div
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 ${
                          message.feedback.rating === 1
                            ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}
                      >
                        {message.feedback.rating === 1 ? (
                          <ThumbsUp className="h-3.5 w-3.5" />
                        ) : (
                          <ThumbsDown className="h-3.5 w-3.5" />
                        )}
                        <span className="text-xs font-medium">
                          {message.feedback.rating === 1 ? 'Positive' : 'Negative'} Feedback
                        </span>
                        {message.feedback.notes && (
                          <span
                            className="max-w-[200px] truncate border-l border-current pl-2 text-xs opacity-75"
                            title={message.feedback.notes}
                          >
                            &quot;{message.feedback.notes}&quot;
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
