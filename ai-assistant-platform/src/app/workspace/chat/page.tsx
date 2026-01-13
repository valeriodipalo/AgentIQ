'use client';

import { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { Bot, Send, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { getSession } from '@/lib/session';
import { Button } from '@/components/ui/button';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { FeedbackButtons } from '@/components/chat/FeedbackButtons';

interface Chatbot {
  id: string;
  name: string;
  description: string | null;
}

type FeedbackState = Record<string, 'positive' | 'negative'>;

// Helper to extract text content from message (AI SDK v6)
function getMessageContent(message: {
  parts?: Array<{ type: string; text?: string }>;
  content?: string;
}): string {
  if (typeof message.content === 'string' && message.content) {
    return message.content;
  }
  if (message.parts && Array.isArray(message.parts)) {
    return message.parts
      .filter((part) => part.type === 'text' && part.text)
      .map((part) => part.text)
      .join('');
  }
  return '';
}

function ChatInterface() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const agentId = searchParams.get('agent');
  const conversationId = searchParams.get('conversation');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [session, setSession] = useState<ReturnType<typeof getSession>>(null);
  const [chatbot, setChatbot] = useState<Chatbot | null>(null);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(conversationId);
  const [feedbackState, setFeedbackState] = useState<FeedbackState>({});
  const [isLoadingChatbot, setIsLoadingChatbot] = useState(true);
  const [input, setInput] = useState('');

  // Ref to store conversation ID for fetch wrapper
  const conversationIdRef = useRef<string | null>(currentConversationId);

  // Keep ref in sync with state
  useEffect(() => {
    conversationIdRef.current = currentConversationId;
  }, [currentConversationId]);

  // Initialize session
  useEffect(() => {
    const currentSession = getSession();
    if (!currentSession) {
      router.push('/');
      return;
    }
    setSession(currentSession);
  }, [router]);

  // Fetch chatbot info
  useEffect(() => {
    const fetchChatbot = async () => {
      if (!agentId) {
        setIsLoadingChatbot(false);
        return;
      }

      try {
        const res = await fetch(`/api/chatbots/${agentId}`);
        if (res.ok) {
          const data = await res.json();
          setChatbot(data);
        }
      } catch (error) {
        console.error('Error fetching chatbot:', error);
      } finally {
        setIsLoadingChatbot(false);
      }
    };

    fetchChatbot();
  }, [agentId]);

  // Custom fetch wrapper to capture X-Conversation-ID header
  const customFetch = useCallback(async (url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const response = await fetch(url, init);
    const newConversationId = response.headers.get('X-Conversation-ID');
    if (newConversationId && newConversationId !== conversationIdRef.current) {
      setCurrentConversationId(newConversationId);
    }
    return response;
  }, []);

  // Chat hook with new AI SDK API
  const {
    messages,
    sendMessage,
    status,
    setMessages,
  } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      fetch: customFetch,
    }),
    onError: (err) => {
      console.error('Chat error:', err);
    },
  });

  // Derive loading state from status
  const isLoading = status === 'streaming' || status === 'submitted';

  // Load existing conversation
  useEffect(() => {
    const loadConversation = async () => {
      if (!conversationId) return;

      try {
        const res = await fetch(`/api/conversations/${conversationId}/messages`);
        if (res.ok) {
          const data = await res.json();

          // Transform messages for the chat
          const transformedMessages = data.messages.map((msg: { id: string; role: string; content: string }) => ({
            id: msg.id,
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
          }));

          setMessages(transformedMessages);
          setCurrentConversationId(conversationId);

          // Load feedback state
          const newFeedbackState: FeedbackState = {};
          for (const msg of data.messages) {
            if (msg.role === 'assistant' && msg.feedback && msg.feedback.length > 0) {
              const feedbackRating = msg.feedback[0].rating;
              newFeedbackState[msg.id] = feedbackRating === 1 ? 'positive' : 'negative';
            }
          }
          setFeedbackState(newFeedbackState);
        }
      } catch (error) {
        console.error('Error loading conversation:', error);
      }
    };

    loadConversation();
  }, [conversationId, setMessages]);

  // Handle form submission
  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!input.trim() || isLoading) return;

      sendMessage(
        { text: input },
        {
          body: {
            chatbot_id: agentId,
            conversation_id: currentConversationId,
            user_id: session?.user.id,
            company_id: session?.company.id,
          },
        }
      );
      setInput('');
    },
    [input, isLoading, sendMessage, agentId, currentConversationId, session]
  );

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle feedback
  const handleFeedback = useCallback(
    async (messageId: string, rating: 'positive' | 'negative') => {
      if (!session) return;

      try {
        const response = await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message_id: messageId,
            rating: rating === 'positive' ? 1 : -1,
            conversation_id: currentConversationId,
          }),
        });

        if (response.ok) {
          setFeedbackState((prev) => ({
            ...prev,
            [messageId]: rating,
          }));
        }
      } catch (error) {
        console.error('Error submitting feedback:', error);
      }
    },
    [currentConversationId, session]
  );

  if (isLoadingChatbot) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="flex items-center gap-4 border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-950">
        <Link
          href="/workspace"
          className="flex items-center gap-2 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
            <Bot className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
          </div>
          <div>
            <h1 className="font-semibold text-zinc-900 dark:text-zinc-100">
              {chatbot?.name || 'Chat'}
            </h1>
            {chatbot?.description && (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {chatbot.description}
              </p>
            )}
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-zinc-50 dark:bg-zinc-900">
        <div className="mx-auto max-w-3xl px-4 py-6">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center py-20">
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <Bot className="h-8 w-8 text-zinc-400" />
                </div>
                <h2 className="mt-4 text-lg font-medium text-zinc-900 dark:text-zinc-100">
                  Start a conversation
                </h2>
                <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                  Ask me anything and I&apos;ll do my best to help.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message) => (
                <div key={message.id}>
                  <ChatMessage
                    id={message.id}
                    role={message.role as 'user' | 'assistant'}
                    content={getMessageContent(message)}
                  />
                  {message.role === 'assistant' && (
                    <div className="mt-2 ml-12">
                      <FeedbackButtons
                        messageId={message.id}
                        currentFeedback={feedbackState[message.id] || null}
                        onFeedback={handleFeedback}
                      />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700">
                    <Bot className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400" style={{ animationDelay: '0ms' }} />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400" style={{ animationDelay: '150ms' }} />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-zinc-200 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-950">
        <form onSubmit={handleSubmit} className="mx-auto max-w-3xl">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              disabled={isLoading}
            />
            <Button type="submit" disabled={!input.trim() || isLoading}>
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function WorkspaceChatPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    }>
      <ChatInterface />
    </Suspense>
  );
}
