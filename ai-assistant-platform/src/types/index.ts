/**
 * Core type definitions for AI Assistant Platform
 * Multi-tenant AI chat platform for corporate clients
 */

// ============================================================================
// Tenant Types
// ============================================================================

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  settings: TenantSettings;
  created_at: string;
  updated_at: string;
}

export interface TenantSettings {
  /** OpenAI model to use for this tenant */
  model: string;
  /** Maximum tokens per response */
  max_tokens: number;
  /** Temperature for response generation */
  temperature: number;
  /** System prompt for the AI assistant */
  system_prompt: string;
  /** Branding configuration */
  branding: {
    primary_color: string;
    logo_url?: string;
    company_name: string;
  };
  /** Feature flags */
  features: {
    feedback_enabled: boolean;
    file_uploads_enabled: boolean;
    conversation_history_enabled: boolean;
  };
}

// ============================================================================
// User Types
// ============================================================================

export interface User {
  id: string;
  tenant_id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar_url?: string;
  metadata: UserMetadata;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
}

export type UserRole = 'admin' | 'member' | 'guest';

export interface UserMetadata {
  /** User's preferred language */
  preferred_language?: string;
  /** User's timezone */
  timezone?: string;
  /** Custom user attributes */
  custom_attributes?: Record<string, unknown>;
}

// ============================================================================
// Conversation Types
// ============================================================================

export interface Conversation {
  id: string;
  tenant_id: string;
  user_id: string;
  title: string;
  summary?: string;
  status: ConversationStatus;
  metadata: ConversationMetadata;
  created_at: string;
  updated_at: string;
}

export type ConversationStatus = 'active' | 'archived' | 'deleted';

export interface ConversationMetadata {
  /** Total number of messages in conversation */
  message_count: number;
  /** Total tokens used in conversation */
  total_tokens: number;
  /** Model used for conversation */
  model: string;
  /** Tags for categorization */
  tags?: string[];
  /** Custom metadata */
  custom?: Record<string, unknown>;
}

// ============================================================================
// Message Types
// ============================================================================

export interface Message {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  metadata: MessageMetadata;
  created_at: string;
}

export type MessageRole = 'user' | 'assistant' | 'system';

export interface MessageMetadata {
  /** Tokens used for this message */
  tokens?: number;
  /** Model used for generation (assistant messages) */
  model?: string;
  /** Finish reason (assistant messages) */
  finish_reason?: 'stop' | 'length' | 'content_filter' | 'tool_calls';
  /** Response latency in milliseconds */
  latency_ms?: number;
  /** Attachments if any */
  attachments?: Attachment[];
  /** Error information if message generation failed */
  error?: {
    code: string;
    message: string;
  };
}

export interface Attachment {
  id: string;
  type: 'file' | 'image' | 'document';
  name: string;
  url: string;
  mime_type: string;
  size_bytes: number;
}

// ============================================================================
// Feedback Types
// ============================================================================

export interface Feedback {
  id: string;
  message_id: string;
  conversation_id: string;
  user_id: string;
  tenant_id: string;
  rating: FeedbackRating;
  comment?: string;
  category?: FeedbackCategory;
  metadata: FeedbackMetadata;
  created_at: string;
}

export type FeedbackRating = 'positive' | 'negative';

export type FeedbackCategory =
  | 'helpful'
  | 'accurate'
  | 'creative'
  | 'unhelpful'
  | 'inaccurate'
  | 'inappropriate'
  | 'other';

export interface FeedbackMetadata {
  /** Browser/device information */
  user_agent?: string;
  /** Additional context */
  context?: Record<string, unknown>;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface ChatRequest {
  message: string;
  conversation_id?: string;
  /** Override default model for this request */
  model?: string;
  /** Override default temperature */
  temperature?: number;
  /** Maximum tokens for response */
  max_tokens?: number;
}

export interface ChatResponse {
  id: string;
  conversation_id: string;
  message: Message;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ConversationListResponse {
  conversations: Conversation[];
  pagination: {
    total: number;
    page: number;
    per_page: number;
    has_more: boolean;
  };
}

export interface FeedbackRequest {
  message_id: string;
  rating: FeedbackRating;
  comment?: string;
  category?: FeedbackCategory;
}

// ============================================================================
// Error Types
// ============================================================================

export interface APIError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export type APIErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'OPENAI_ERROR'
  | 'SUPABASE_ERROR';

// Re-export database types
export type { Json, Database } from './database';
