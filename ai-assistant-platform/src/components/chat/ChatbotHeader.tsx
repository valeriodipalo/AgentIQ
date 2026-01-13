/**
 * ChatbotHeader Component
 * Displays current chatbot information with option to change
 */

'use client';

import { Bot, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ChatbotInfo {
  id: string;
  name: string;
  description: string | null;
  model: string;
}

export interface ChatbotHeaderProps {
  chatbot: ChatbotInfo | null;
  isLoading?: boolean;
  onChangeChatbot: () => void;
}

export function ChatbotHeader({
  chatbot,
  isLoading = false,
  onChangeChatbot,
}: ChatbotHeaderProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-700" />
        <div className="space-y-1">
          <div className="h-4 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
          <div className="h-3 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
        </div>
      </div>
    );
  }

  if (!chatbot) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
          <Bot className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            AI Assistant
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Default assistant
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={onChangeChatbot}
        className="hidden sm:flex"
        title="Change chatbot"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="ml-1 hidden md:inline">Chatbots</span>
      </Button>

      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
          <Bot className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {chatbot.name}
          </h1>
          {chatbot.description && (
            <p className="max-w-xs truncate text-xs text-zinc-500 dark:text-zinc-400">
              {chatbot.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
