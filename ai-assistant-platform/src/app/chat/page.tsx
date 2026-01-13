/**
 * Chat Page
 * Main chat interface for the AI assistant
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { MessageSquare, AlertCircle, RefreshCw } from 'lucide-react';
import {
  ChatMessage,
  ChatInput,
  ConversationSidebar,
  type Conversation,
} from '@/components/chat';
import { Button } from '@/components/ui/button';

// Mock conversations for demo purposes
const mockConversations: Conversation[] = [
  {
    id: '1',
    title: 'How to optimize React performance',
    updatedAt: new Date(Date.now() - 1000 * 60 * 30),
    messageCount: 8,
  },
  {
    id: '2',
    title: 'TypeScript generics explained',
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    messageCount: 12,
  },
  {
    id: '3',
    title: 'Setting up Supabase auth',
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    messageCount: 6,
  },
];

// Suggestion prompts for new conversations
const SUGGESTION_PROMPTS = [
  'Explain React hooks',
  'Write a TypeScript function',
  'Help me debug an error',
  'Suggest best practices',
];

// Type for tracking feedback state
type FeedbackState = Record<string, 'positive' | 'negative'>;

interface WelcomeMessageProps {
  onSuggestionClick: (suggestion: string) => void;
}

function WelcomeMessage({ onSuggestionClick }: WelcomeMessageProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 rounded-full bg-zinc-100 p-4 dark:bg-zinc-800">
        <MessageSquare className="h-8 w-8 text-zinc-600 dark:text-zinc-400" />
      </div>
      <h2 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        Welcome to AI Assistant
      </h2>
      <p className="max-w-md text-zinc-600 dark:text-zinc-400">
        Start a conversation by typing a message below. I can help you with
        questions, analysis, writing, and more.
      </p>
      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        {SUGGESTION_PROMPTS.map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => onSuggestionClick(suggestion)}
            className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-50 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:border-zinc-600"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}

interface ErrorMessageProps {
  error: Error;
  onRetry: () => void;
}

function ErrorMessage({ error, onRetry }: ErrorMessageProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
      <AlertCircle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
      <div className="flex-1">
        <p className="text-sm font-medium text-red-800 dark:text-red-200">
          Something went wrong
        </p>
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
          {error.message || 'Failed to send message. Please try again.'}
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw className="mr-2 h-4 w-4" />
        Retry
      </Button>
    </div>
  );
}

function LoadingIndicator() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-400 border-t-zinc-700 dark:border-zinc-500 dark:border-t-zinc-300" />
      </div>
      <div className="rounded-2xl bg-zinc-100 px-4 py-3 dark:bg-zinc-800">
        <div className="flex items-center gap-1">
          <span
            className="h-2 w-2 animate-bounce rounded-full bg-zinc-400"
            style={{ animationDelay: '0ms' }}
          />
          <span
            className="h-2 w-2 animate-bounce rounded-full bg-zinc-400"
            style={{ animationDelay: '150ms' }}
          />
          <span
            className="h-2 w-2 animate-bounce rounded-full bg-zinc-400"
            style={{ animationDelay: '300ms' }}
          />
        </div>
      </div>
    </div>
  );
}

// Helper to extract text content from message parts (AI SDK v6)
function getMessageContent(message: { parts?: Array<{ type: string; text?: string }> }): string {
  if (!message.parts) return '';
  return message.parts
    .filter((part) => part.type === 'text' && part.text)
    .map((part) => part.text)
    .join('');
}

export default function ChatPage() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [currentConversationId, setCurrentConversationId] = useState<
    string | undefined
  >();
  const [feedbackState, setFeedbackState] = useState<FeedbackState>({});
  const [conversations] = useState<Conversation[]>(mockConversations);

  // Manage input state manually (required for AI SDK v6)
  const [input, setInput] = useState('');

  // Use the Vercel AI SDK useChat hook
  const {
    messages,
    sendMessage,
    status,
    error,
    regenerate,
    setMessages,
  } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
    onError: (err) => {
      console.error('Chat error:', err);
    },
    onFinish: ({ message }) => {
      console.log('Message finished:', message.id);
    },
  });

  // Derive loading state from status
  const isLoading = status === 'streaming' || status === 'submitted';

  // Handle form submission
  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!input.trim() || isLoading) return;

      sendMessage(
        { text: input },
        {
          body: {
            message: input.trim(),
            conversation_id: currentConversationId,
          },
        }
      );
      setInput('');
    },
    [input, isLoading, sendMessage, currentConversationId]
  );

  // Handle append for suggestions
  const append = useCallback(
    (message: { role: string; content: string }) => {
      if (isLoading) return;
      sendMessage(
        { text: message.content },
        {
          body: {
            message: message.content,
            conversation_id: currentConversationId,
          },
        }
      );
    },
    [isLoading, sendMessage, currentConversationId]
  );

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle feedback submission
  const handleFeedback = useCallback(
    async (messageId: string, rating: 'positive' | 'negative') => {
      // Optimistic update
      setFeedbackState((prev) => ({ ...prev, [messageId]: rating }));

      try {
        const response = await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message_id: messageId,
            rating,
          }),
        });

        if (!response.ok) {
          // Revert on error
          setFeedbackState((prev) => {
            const newState = { ...prev };
            delete newState[messageId];
            return newState;
          });
          console.error('Failed to submit feedback');
        }
      } catch (err) {
        // Revert on error
        setFeedbackState((prev) => {
          const newState = { ...prev };
          delete newState[messageId];
          return newState;
        });
        console.error('Error submitting feedback:', err);
      }
    },
    []
  );

  // Handle new chat
  const handleNewChat = useCallback(() => {
    setMessages([]);
    setCurrentConversationId(undefined);
    setFeedbackState({});
  }, [setMessages]);

  // Handle conversation selection
  const handleSelectConversation = useCallback(
    (id: string) => {
      // In a real app, this would load messages from the server
      setCurrentConversationId(id);
      setMessages([]);
      setFeedbackState({});
      console.log('Selected conversation:', id);
    },
    [setMessages]
  );

  // Handle suggestion click - send the suggestion as a message
  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      append({
        role: 'user',
        content: suggestion,
      });
    },
    [append]
  );

  // Check if currently streaming (last message is assistant and loading)
  const isStreaming =
    isLoading &&
    messages.length > 0 &&
    messages[messages.length - 1].role === 'assistant';

  return (
    <div className="flex h-screen bg-white dark:bg-zinc-950">
      {/* Conversation Sidebar */}
      <ConversationSidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
      />

      {/* Main chat area */}
      <main className="flex flex-1 flex-col">
        {/* Chat Header */}
        <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800 lg:px-6 lg:py-4">
          <div className="flex items-center gap-3 pl-12 lg:pl-0">
            <MessageSquare className="h-6 w-6 text-zinc-600 dark:text-zinc-400" />
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              AI Assistant
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleNewChat}
              variant="primary"
              size="sm"
              className="lg:hidden"
            >
              New Chat
            </Button>
          </div>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 py-4 lg:px-6">
          <div className="mx-auto max-w-3xl space-y-4">
            {messages.length === 0 ? (
              <WelcomeMessage onSuggestionClick={handleSuggestionClick} />
            ) : (
              <>
                {messages.map((message, index) => {
                  const isLastMessage = index === messages.length - 1;
                  const isCurrentlyStreaming =
                    isLastMessage &&
                    isStreaming &&
                    message.role === 'assistant';

                  return (
                    <ChatMessage
                      key={message.id}
                      id={message.id}
                      role={message.role as 'user' | 'assistant'}
                      content={getMessageContent(message)}
                      createdAt={undefined}
                      isStreaming={isCurrentlyStreaming}
                      feedback={feedbackState[message.id]}
                      onFeedback={
                        message.role === 'assistant' ? handleFeedback : undefined
                      }
                    />
                  );
                })}

                {/* Show error if present */}
                {error && (
                  <ErrorMessage error={error} onRetry={() => regenerate()} />
                )}
              </>
            )}

            {/* Loading indicator when waiting for response */}
            {isLoading && !isStreaming && <LoadingIndicator />}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-zinc-200 px-4 py-4 dark:border-zinc-800 lg:px-6">
          <div className="mx-auto max-w-3xl">
            <ChatInput
              value={input}
              onChange={setInput}
              onSubmit={handleSubmit}
              isLoading={isLoading}
              placeholder="Type your message..."
              disabled={false}
            />
            <p className="mt-2 text-center text-xs text-zinc-500 dark:text-zinc-400">
              AI responses may contain errors. Please verify important
              information.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
