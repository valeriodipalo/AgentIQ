/**
 * ConversationSidebar Component
 * Displays list of conversations with new chat button
 * Supports loading real conversations from the database
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  Plus,
  Menu,
  X,
  ChevronRight,
  Loader2,
  RefreshCw,
  Bot,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface Conversation {
  id: string;
  title: string;
  updatedAt: Date;
  messageCount: number;
  chatbotId?: string;
  chatbotName?: string;
}

export interface ConversationSidebarProps {
  conversations: Conversation[];
  currentConversationId?: string;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  error?: string | null;
  chatbotId?: string;
  showChangeChatbot?: boolean;
  onChangeChatbot?: () => void;
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function ConversationList({
  conversations,
  currentConversationId,
  onSelectConversation,
  isLoading,
  error,
  onRetry,
}: {
  conversations: Conversation[];
  currentConversationId?: string;
  onSelectConversation: (id: string) => void;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Loading conversations...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-3 py-8 text-center">
        <p className="mb-2 text-sm text-red-600 dark:text-red-400">{error}</p>
        {onRetry && (
          <Button variant="ghost" size="sm" onClick={onRetry}>
            <RefreshCw className="mr-1 h-4 w-4" />
            Retry
          </Button>
        )}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="px-3 py-8 text-center">
        <MessageSquare className="mx-auto mb-3 h-8 w-8 text-zinc-400" />
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No conversations yet
        </p>
        <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
          Start a new chat to begin
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {conversations.map((conversation) => {
        const isActive = conversation.id === currentConversationId;
        return (
          <button
            key={conversation.id}
            onClick={() => onSelectConversation(conversation.id)}
            className={`
              group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left
              transition-colors
              ${
                isActive
                  ? 'bg-zinc-200 dark:bg-zinc-700'
                  : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }
            `}
          >
            <MessageSquare
              className={`h-4 w-4 shrink-0 ${
                isActive
                  ? 'text-zinc-700 dark:text-zinc-200'
                  : 'text-zinc-400 dark:text-zinc-500'
              }`}
            />
            <div className="min-w-0 flex-1">
              <p
                className={`truncate text-sm font-medium ${
                  isActive
                    ? 'text-zinc-900 dark:text-zinc-100'
                    : 'text-zinc-700 dark:text-zinc-300'
                }`}
              >
                {conversation.title}
              </p>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                {formatRelativeTime(conversation.updatedAt)} -{' '}
                {conversation.messageCount} messages
              </p>
            </div>
            <ChevronRight
              className={`h-4 w-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 ${
                isActive ? 'text-zinc-600' : 'text-zinc-400'
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}

export function ConversationSidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewChat,
  onRefresh,
  isLoading = false,
  error = null,
  showChangeChatbot = false,
  onChangeChatbot,
}: ConversationSidebarProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const sidebarContent = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-zinc-700">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Conversations
          </h2>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 disabled:opacity-50 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
              title="Refresh conversations"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
        <button
          onClick={() => setIsMobileOpen(false)}
          className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 lg:hidden"
          aria-label="Close sidebar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Change Chatbot Button - Only on mobile */}
      {showChangeChatbot && onChangeChatbot && (
        <div className="border-b border-zinc-200 p-3 dark:border-zinc-700 lg:hidden">
          <Button
            onClick={() => {
              onChangeChatbot();
              setIsMobileOpen(false);
            }}
            variant="outline"
            className="w-full justify-start"
          >
            <Bot className="h-4 w-4" />
            Change Chatbot
          </Button>
        </div>
      )}

      {/* New Chat Button */}
      <div className="p-3">
        <Button
          onClick={() => {
            onNewChat();
            setIsMobileOpen(false);
          }}
          variant="primary"
          className="w-full justify-start"
          disabled={isLoading}
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        <ConversationList
          conversations={conversations}
          currentConversationId={currentConversationId}
          onSelectConversation={(id) => {
            onSelectConversation(id);
            setIsMobileOpen(false);
          }}
          isLoading={isLoading}
          error={error}
          onRetry={onRefresh}
        />
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="fixed left-4 top-4 z-40 rounded-lg bg-white p-2 shadow-lg dark:bg-zinc-800 lg:hidden"
        aria-label="Open conversation menu"
      >
        <Menu className="h-5 w-5 text-zinc-600 dark:text-zinc-300" />
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex w-72 flex-col
          bg-zinc-50 transition-transform duration-300 ease-in-out
          dark:bg-zinc-900
          lg:hidden
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {sidebarContent}
      </aside>

      {/* Desktop Sidebar */}
      <aside className="hidden w-64 flex-col border-r border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 lg:flex">
        {sidebarContent}
      </aside>
    </>
  );
}

// Hook for fetching conversations from the API
export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('per_page', '50');
      // Note: chatbotId filtering would be done if the API supports it

      const response = await fetch(`/api/conversations?${params.toString()}`);

      if (!response.ok) {
        if (response.status === 401) {
          // User not authenticated - show empty state
          setConversations([]);
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch conversations');
      }

      const data = await response.json();

      // Map the API response to our Conversation interface
      const mappedConversations: Conversation[] = (data.conversations || []).map(
        (conv: {
          id: string;
          title: string;
          updated_at: string;
          metadata?: { message_count?: number; chatbot_id?: string; chatbot_name?: string };
        }) => ({
          id: conv.id,
          title: conv.title || 'Untitled Conversation',
          updatedAt: new Date(conv.updated_at),
          messageCount: conv.metadata?.message_count || 0,
          chatbotId: conv.metadata?.chatbot_id,
          chatbotName: conv.metadata?.chatbot_name,
        })
      );

      setConversations(mappedConversations);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  return {
    conversations,
    isLoading,
    error,
    refetch: fetchConversations,
  };
}
