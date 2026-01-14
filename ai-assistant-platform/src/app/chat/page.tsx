/**
 * Chat Page
 * Main chat interface for the AI assistant with chatbot selection support
 * Supports both demo mode and company-specific mode via URL parameter
 */

'use client';

import { useCallback, useEffect, useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { MessageSquare, AlertCircle, RefreshCw, X, Building2 } from 'lucide-react';
import {
  ChatMessage,
  ChatInput,
  ConversationSidebar,
  ChatbotHeader,
  useConversations,
  type ChatbotInfo,
} from '@/components/chat';
import { Button } from '@/components/ui/button';

// Suggestion prompts for new conversations
const SUGGESTION_PROMPTS = [
  'Explain React hooks',
  'Write a TypeScript function',
  'Help me debug an error',
  'Suggest best practices',
];

// Type for tracking feedback state
type FeedbackState = Record<string, 'positive' | 'negative'>;

// User profile stored in localStorage
interface ChatUserProfile {
  name: string;
  email: string;
}

// Company info from API
interface CompanyInfo {
  id: string;
  name: string;
  slug: string;
  branding: {
    primary_color?: string;
    logo_url?: string;
    company_name?: string;
  } | null;
}

// Company chatbot from API
interface CompanyChatbot {
  id: string;
  name: string;
  description: string | null;
  model: string;
}

// LocalStorage key for user profile
const USER_PROFILE_KEY = 'chat_user_profile';

interface WelcomeMessageProps {
  onSuggestionClick: (suggestion: string) => void;
  chatbotName?: string;
}

function WelcomeMessage({ onSuggestionClick, chatbotName }: WelcomeMessageProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 rounded-full bg-zinc-100 p-4 dark:bg-zinc-800">
        <MessageSquare className="h-8 w-8 text-zinc-600 dark:text-zinc-400" />
      </div>
      <h2 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        {chatbotName ? `Welcome to ${chatbotName}` : 'Welcome to AI Assistant'}
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

// Helper to extract text content from message (AI SDK v6)
// Handles both 'parts' array format and direct 'content' string format
function getMessageContent(message: {
  parts?: Array<{ type: string; text?: string }>;
  content?: string;
}): string {
  // First try direct content string (common format)
  if (typeof message.content === 'string' && message.content) {
    return message.content;
  }
  // Then try parts array format (AI SDK v6 structured format)
  if (message.parts && Array.isArray(message.parts)) {
    return message.parts
      .filter((part) => part.type === 'text' && part.text)
      .map((part) => part.text)
      .join('');
  }
  return '';
}

// User Identification Modal Component
interface UserIdentificationModalProps {
  companyName: string;
  onSubmit: (profile: ChatUserProfile) => void;
  onClose?: () => void;
  isRequired?: boolean;
}

function UserIdentificationModal({
  companyName,
  onSubmit,
  onClose,
  isRequired = true,
}: UserIdentificationModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { name?: string; email?: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit({ name: name.trim(), email: email.trim().toLowerCase() });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-900">
        {!isRequired && onClose && (
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900/30">
            <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Welcome to {companyName}
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Please identify yourself to continue
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Your Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors({ ...errors, name: undefined });
              }}
              placeholder="John Doe"
              className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors ${
                errors.name
                  ? 'border-red-300 focus:border-red-500 dark:border-red-700'
                  : 'border-zinc-300 focus:border-blue-500 dark:border-zinc-700'
              } bg-white dark:bg-zinc-800 dark:text-zinc-100`}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-500">{errors.name}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors({ ...errors, email: undefined });
              }}
              placeholder="john@company.com"
              className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors ${
                errors.email
                  ? 'border-red-300 focus:border-red-500 dark:border-red-700'
                  : 'border-zinc-300 focus:border-blue-500 dark:border-zinc-700'
              } bg-white dark:bg-zinc-800 dark:text-zinc-100`}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-500">{errors.email}</p>
            )}
          </div>

          <Button type="submit" variant="primary" className="w-full">
            Continue to Chat
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
          Your information will be used to personalize your experience and track
          conversations.
        </p>
      </div>
    </div>
  );
}

// Company Chatbot Selector Component
interface CompanyChatbotSelectorProps {
  companyName: string;
  chatbots: CompanyChatbot[];
  onSelect: (chatbotId: string) => void;
}

function CompanyChatbotSelector({
  companyName,
  chatbots,
  onSelect,
}: CompanyChatbotSelectorProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center p-8">
      <div className="mb-6 rounded-full bg-blue-100 p-4 dark:bg-blue-900/30">
        <Building2 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
      </div>
      <h2 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        {companyName} AI Assistants
      </h2>
      <p className="mb-8 max-w-md text-center text-zinc-600 dark:text-zinc-400">
        Select an assistant to start a conversation
      </p>

      <div className="grid w-full max-w-2xl gap-4 sm:grid-cols-2">
        {chatbots.map((chatbot) => (
          <button
            key={chatbot.id}
            onClick={() => onSelect(chatbot.id)}
            className="flex flex-col items-start rounded-xl border border-zinc-200 bg-white p-4 text-left transition-all hover:border-blue-300 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-blue-700"
          >
            <h3 className="mb-1 font-medium text-zinc-900 dark:text-zinc-100">
              {chatbot.name}
            </h3>
            {chatbot.description && (
              <p className="mb-2 text-sm text-zinc-500 dark:text-zinc-400">
                {chatbot.description}
              </p>
            )}
            <span className="mt-auto inline-block rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
              {chatbot.model}
            </span>
          </button>
        ))}
      </div>

      {chatbots.length === 0 && (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-6 text-center dark:border-zinc-700 dark:bg-zinc-800">
          <p className="text-zinc-600 dark:text-zinc-400">
            No assistants are currently available for this company.
          </p>
        </div>
      )}
    </div>
  );
}

// Main chat page content component
function ChatPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const chatbotId = searchParams.get('chatbot_id');
  const companySlug = searchParams.get('company');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [currentConversationId, setCurrentConversationId] = useState<
    string | undefined
  >();
  const [feedbackState, setFeedbackState] = useState<FeedbackState>({});
  const [chatbot, setChatbot] = useState<ChatbotInfo | null>(null);
  const [isChatbotLoading, setIsChatbotLoading] = useState(!!chatbotId);

  // Company mode state
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [companyChatbots, setCompanyChatbots] = useState<CompanyChatbot[]>([]);
  const [isCompanyLoading, setIsCompanyLoading] = useState(!!companySlug);
  const [companyError, setCompanyError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<ChatUserProfile | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);

  // Check for stored user profile on mount (only in company mode)
  useEffect(() => {
    if (companySlug) {
      const stored = localStorage.getItem(USER_PROFILE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as ChatUserProfile;
          if (parsed.name && parsed.email) {
            setUserProfile(parsed);
          } else {
            setShowUserModal(true);
          }
        } catch {
          setShowUserModal(true);
        }
      } else {
        setShowUserModal(true);
      }
    }
  }, [companySlug]);

  // Fetch company info if company param is provided
  useEffect(() => {
    if (!companySlug) {
      setCompanyInfo(null);
      setCompanyChatbots([]);
      setIsCompanyLoading(false);
      return;
    }

    async function fetchCompanyInfo() {
      setIsCompanyLoading(true);
      setCompanyError(null);
      try {
        const response = await fetch(`/api/companies/by-slug/${companySlug}`);
        if (response.ok) {
          const data = await response.json();
          setCompanyInfo(data.company);
          setCompanyChatbots(data.chatbots || []);
        } else if (response.status === 404) {
          setCompanyError('Company not found');
        } else {
          setCompanyError('Failed to load company information');
        }
      } catch (err) {
        console.error('Error fetching company info:', err);
        setCompanyError('Failed to load company information');
      } finally {
        setIsCompanyLoading(false);
      }
    }

    fetchCompanyInfo();
  }, [companySlug]);

  // Handle user profile submission
  const handleUserProfileSubmit = useCallback((profile: ChatUserProfile) => {
    localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
    setUserProfile(profile);
    setShowUserModal(false);
  }, []);

  // Handle chatbot selection in company mode
  const handleCompanyChatbotSelect = useCallback(
    (selectedChatbotId: string) => {
      // Update URL with selected chatbot
      const params = new URLSearchParams(searchParams.toString());
      params.set('chatbot_id', selectedChatbotId);
      router.push(`/chat?${params.toString()}`);
    },
    [router, searchParams]
  );

  // Use the conversations hook to fetch real conversations
  const {
    conversations,
    isLoading: isConversationsLoading,
    error: conversationsError,
    refetch: refetchConversations,
  } = useConversations();

  // Manage input state manually (required for AI SDK v6)
  const [input, setInput] = useState('');

  // Ref to store conversation ID setter for use in fetch wrapper
  const conversationIdRef = useRef<string | undefined>(currentConversationId);

  // Keep ref in sync with state
  useEffect(() => {
    conversationIdRef.current = currentConversationId;
  }, [currentConversationId]);

  // Fetch chatbot details if chatbot_id is provided
  useEffect(() => {
    if (!chatbotId) {
      setChatbot(null);
      setIsChatbotLoading(false);
      return;
    }

    async function fetchChatbot() {
      setIsChatbotLoading(true);
      try {
        // In company mode, find chatbot from company chatbots
        if (companySlug && companyChatbots.length > 0) {
          const foundChatbot = companyChatbots.find((c) => c.id === chatbotId);
          if (foundChatbot) {
            setChatbot({
              id: foundChatbot.id,
              name: foundChatbot.name,
              description: foundChatbot.description,
              model: foundChatbot.model,
            });
            setIsChatbotLoading(false);
            return;
          }
        }

        // Fallback to API fetch for demo mode
        const response = await fetch(`/api/chatbots?search=`);
        if (response.ok) {
          const data = await response.json();
          const foundChatbot = data.chatbots?.find(
            (c: ChatbotInfo) => c.id === chatbotId
          );
          if (foundChatbot) {
            setChatbot(foundChatbot);
          }
        }
      } catch (err) {
        console.error('Error fetching chatbot:', err);
      } finally {
        setIsChatbotLoading(false);
      }
    }

    fetchChatbot();
  }, [chatbotId, companySlug, companyChatbots]);

  // Custom fetch wrapper to capture X-Conversation-ID header
  const customFetch = useCallback(async (url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const response = await fetch(url, init);

    // Extract conversation ID from response headers
    const newConversationId = response.headers.get('X-Conversation-ID');
    if (newConversationId && newConversationId !== conversationIdRef.current) {
      console.log('Captured conversation ID:', newConversationId);
      setCurrentConversationId(newConversationId);
      // Refresh the conversation list when a new conversation is created
      refetchConversations();
    }

    return response;
  }, [refetchConversations]);

  // Use the Vercel AI SDK useChat hook with custom fetch
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
      fetch: customFetch,
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

      // Build request body with company context if in company mode
      const body: Record<string, string | undefined> = {
        message: input.trim(),
        conversation_id: currentConversationId,
        chatbot_id: chatbotId || undefined,
      };

      // Add company context if in company mode
      if (companySlug && userProfile) {
        body.company_slug = companySlug;
        body.user_email = userProfile.email;
        body.user_name = userProfile.name;
      }

      sendMessage(
        { text: input },
        {
          body,
        }
      );
      setInput('');
    },
    [input, isLoading, sendMessage, currentConversationId, chatbotId, companySlug, userProfile]
  );

  // Handle append for suggestions
  const append = useCallback(
    (message: { role: string; content: string }) => {
      if (isLoading) return;

      // Build request body with company context if in company mode
      const body: Record<string, string | undefined> = {
        message: message.content,
        conversation_id: currentConversationId,
        chatbot_id: chatbotId || undefined,
      };

      // Add company context if in company mode
      if (companySlug && userProfile) {
        body.company_slug = companySlug;
        body.user_email = userProfile.email;
        body.user_name = userProfile.name;
      }

      sendMessage(
        { text: message.content },
        {
          body,
        }
      );
    },
    [isLoading, sendMessage, currentConversationId, chatbotId, companySlug, userProfile]
  );

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle feedback submission with optional notes
  const handleFeedback = useCallback(
    async (messageId: string, rating: 'positive' | 'negative', notes?: string) => {
      // Optimistic update
      setFeedbackState((prev) => ({ ...prev, [messageId]: rating }));

      try {
        const response = await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message_id: messageId,
            rating,
            comment: notes,
            conversation_id: currentConversationId,
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
    [currentConversationId]
  );

  // Handle new chat
  const handleNewChat = useCallback(() => {
    setMessages([]);
    setCurrentConversationId(undefined);
    setFeedbackState({});
  }, [setMessages]);

  // Handle conversation selection
  const handleSelectConversation = useCallback(
    async (id: string) => {
      setCurrentConversationId(id);
      setMessages([]);
      setFeedbackState({});

      // Fetch messages for this conversation
      try {
        const response = await fetch(`/api/conversations/${id}/messages`);
        if (response.ok) {
          const data = await response.json();

          // Transform API messages to AI SDK format and load into chat
          if (data.messages && Array.isArray(data.messages)) {
            const transformedMessages = data.messages.map((msg: { id: string; role: 'user' | 'assistant'; content: string }) => ({
              id: msg.id,
              role: msg.role,
              content: msg.content,
            }));
            setMessages(transformedMessages);

            // Load feedback state for assistant messages
            // Feedback comes as an array from the API, with rating as number (1 = positive, -1 = negative)
            const newFeedbackState: FeedbackState = {};
            for (const msg of data.messages) {
              if (msg.role === 'assistant' && msg.feedback && msg.feedback.length > 0) {
                const feedbackRating = msg.feedback[0].rating;
                newFeedbackState[msg.id] = feedbackRating === 1 ? 'positive' : 'negative';
              }
            }
            if (Object.keys(newFeedbackState).length > 0) {
              setFeedbackState(newFeedbackState);
            }
          }
        } else {
          console.error('Failed to load conversation:', response.status);
        }
      } catch (err) {
        console.error('Error loading conversation:', err);
      }
    },
    [setMessages]
  );

  // Handle changing chatbot
  const handleChangeChatbot = useCallback(() => {
    if (companySlug) {
      // In company mode, go back to chatbot selection
      const params = new URLSearchParams();
      params.set('company', companySlug);
      router.push(`/chat?${params.toString()}`);
    } else {
      // In demo mode, go to chatbots page
      router.push('/chatbots');
    }
  }, [router, companySlug]);

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

  // Company mode loading state
  if (companySlug && isCompanyLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
          <p className="text-sm text-zinc-500">Loading company...</p>
        </div>
      </div>
    );
  }

  // Company mode error state
  if (companySlug && companyError) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-white dark:bg-zinc-950">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          {companyError}
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400">
          The company you are looking for does not exist or is not available.
        </p>
        <Button
          variant="primary"
          onClick={() => router.push('/')}
        >
          Go to Home
        </Button>
      </div>
    );
  }

  // Company mode: Show user identification modal if needed
  if (companySlug && companyInfo && showUserModal) {
    return (
      <UserIdentificationModal
        companyName={companyInfo.branding?.company_name || companyInfo.name}
        onSubmit={handleUserProfileSubmit}
        isRequired={true}
      />
    );
  }

  // Company mode: Show chatbot selector if no chatbot selected
  if (companySlug && companyInfo && userProfile && !chatbotId) {
    return (
      <div className="flex h-screen bg-white dark:bg-zinc-950">
        <CompanyChatbotSelector
          companyName={companyInfo.branding?.company_name || companyInfo.name}
          chatbots={companyChatbots}
          onSelect={handleCompanyChatbotSelect}
        />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white dark:bg-zinc-950">
      {/* Conversation Sidebar */}
      <ConversationSidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onRefresh={refetchConversations}
        isLoading={isConversationsLoading}
        error={conversationsError}
        chatbotId={chatbotId || undefined}
        showChangeChatbot={!!chatbotId}
        onChangeChatbot={handleChangeChatbot}
      />

      {/* Main chat area */}
      <main className="flex flex-1 flex-col">
        {/* Chat Header */}
        <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800 lg:px-6 lg:py-4">
          <div className="pl-12 lg:pl-0">
            {companyInfo ? (
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
                  <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <ChatbotHeader
                    chatbot={chatbot}
                    isLoading={isChatbotLoading}
                    onChangeChatbot={handleChangeChatbot}
                  />
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {companyInfo.branding?.company_name || companyInfo.name}
                    {userProfile && ` - ${userProfile.name}`}
                  </p>
                </div>
              </div>
            ) : (
              <ChatbotHeader
                chatbot={chatbot}
                isLoading={isChatbotLoading}
                onChangeChatbot={handleChangeChatbot}
              />
            )}
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
              <WelcomeMessage
                onSuggestionClick={handleSuggestionClick}
                chatbotName={chatbot?.name}
              />
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

// Main export with Suspense boundary for useSearchParams
export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-white dark:bg-zinc-950">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
            <p className="text-sm text-zinc-500">Loading chat...</p>
          </div>
        </div>
      }
    >
      <ChatPageContent />
    </Suspense>
  );
}
