/**
 * ConversationSidebar Component
 * Displays list of conversations with new chat button
 */

'use client';

import { useState } from 'react';
import {
  MessageSquare,
  Plus,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface Conversation {
  id: string;
  title: string;
  updatedAt: Date;
  messageCount: number;
}

export interface ConversationSidebarProps {
  conversations: Conversation[];
  currentConversationId?: string;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  isLoading?: boolean;
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
}: {
  conversations: Conversation[];
  currentConversationId?: string;
  onSelectConversation: (id: string) => void;
}) {
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
  isLoading = false,
}: ConversationSidebarProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const sidebarContent = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-zinc-700">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Conversations
        </h2>
        <button
          onClick={() => setIsMobileOpen(false)}
          className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 lg:hidden"
          aria-label="Close sidebar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <Button
          onClick={onNewChat}
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
