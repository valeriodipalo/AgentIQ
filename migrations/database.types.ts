/**
 * Database Type Definitions for AI Assistant Platform
 * Auto-generated types matching the Supabase schema
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      conversations: {
        Row: {
          id: string
          tenant_id: string
          user_id: string
          title: string
          metadata: Json
          is_archived: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          user_id: string
          title?: string
          metadata?: Json
          is_archived?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          user_id?: string
          title?: string
          metadata?: Json
          is_archived?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_conversations_tenant"
            columns: ["tenant_id"]
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_conversations_user"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          role: "user" | "assistant" | "system"
          content: string
          token_count: number | null
          model_used: string | null
          latency_ms: number | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          role: "user" | "assistant" | "system"
          content: string
          token_count?: number | null
          model_used?: string | null
          latency_ms?: number | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          role?: "user" | "assistant" | "system"
          content?: string
          token_count?: number | null
          model_used?: string | null
          latency_ms?: number | null
          metadata?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_messages_conversation"
            columns: ["conversation_id"]
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          }
        ]
      }
      feedback: {
        Row: {
          id: string
          message_id: string
          user_id: string
          rating: -1 | 1
          comment: string | null
          created_at: string
        }
        Insert: {
          id?: string
          message_id: string
          user_id: string
          rating: -1 | 1
          comment?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          message_id?: string
          user_id?: string
          rating?: -1 | 1
          comment?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_feedback_message"
            columns: ["message_id"]
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_feedback_user"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      usage_metrics: {
        Row: {
          id: string
          tenant_id: string
          user_id: string | null
          date: string
          total_tokens: number
          prompt_tokens: number
          completion_tokens: number
          request_count: number
          estimated_cost: number
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          user_id?: string | null
          date: string
          total_tokens?: number
          prompt_tokens?: number
          completion_tokens?: number
          request_count?: number
          estimated_cost?: number
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          user_id?: string | null
          date?: string
          total_tokens?: number
          prompt_tokens?: number
          completion_tokens?: number
          request_count?: number
          estimated_cost?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_usage_metrics_tenant"
            columns: ["tenant_id"]
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_usage_metrics_user"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      current_day_usage: {
        Row: {
          tenant_id: string
          user_id: string | null
          date: string
          total_tokens: number
          request_count: number
        }
      }
      message_feedback_summary: {
        Row: {
          message_id: string
          conversation_id: string
          tenant_id: string
          total_feedback: number
          thumbs_up: number
          thumbs_down: number
          avg_rating: number
        }
      }
      monthly_usage_summary: {
        Row: {
          tenant_id: string
          user_id: string | null
          month: string
          total_tokens: number
          prompt_tokens: number
          completion_tokens: number
          request_count: number
          estimated_cost: number
          active_days: number
        }
      }
    }
    Functions: {
      increment_usage_metrics: {
        Args: {
          p_tenant_id: string
          p_user_id: string
          p_date: string
          p_prompt_tokens: number
          p_completion_tokens: number
          p_estimated_cost: number
        }
        Returns: void
      }
    }
    Enums: {
      message_role: "user" | "assistant" | "system"
    }
  }
}

// Type helpers for easier usage
export type Conversation = Database['public']['Tables']['conversations']['Row']
export type ConversationInsert = Database['public']['Tables']['conversations']['Insert']
export type ConversationUpdate = Database['public']['Tables']['conversations']['Update']

export type Message = Database['public']['Tables']['messages']['Row']
export type MessageInsert = Database['public']['Tables']['messages']['Insert']
export type MessageUpdate = Database['public']['Tables']['messages']['Update']

export type Feedback = Database['public']['Tables']['feedback']['Row']
export type FeedbackInsert = Database['public']['Tables']['feedback']['Insert']
export type FeedbackUpdate = Database['public']['Tables']['feedback']['Update']

export type UsageMetric = Database['public']['Tables']['usage_metrics']['Row']
export type UsageMetricInsert = Database['public']['Tables']['usage_metrics']['Insert']
export type UsageMetricUpdate = Database['public']['Tables']['usage_metrics']['Update']

// View types
export type CurrentDayUsage = Database['public']['Views']['current_day_usage']['Row']
export type MessageFeedbackSummary = Database['public']['Views']['message_feedback_summary']['Row']
export type MonthlyUsageSummary = Database['public']['Views']['monthly_usage_summary']['Row']

// Enum types
export type MessageRole = Database['public']['Enums']['message_role']

// Metadata type helpers
export interface ConversationMetadata {
  tags?: string[]
  category?: string
  source?: string
  [key: string]: any
}

export interface MessageMetadata {
  function_calls?: Array<{
    name: string
    arguments: any
    result?: any
  }>
  citations?: Array<{
    source: string
    url?: string
    excerpt?: string
  }>
  thinking_time_ms?: number
  finish_reason?: string
  [key: string]: any
}

// Query result types
export interface ConversationWithMessages extends Conversation {
  messages: Message[]
}

export interface MessageWithFeedback extends Message {
  feedback?: Feedback[]
  feedback_summary?: MessageFeedbackSummary
}

export interface ConversationWithStats extends Conversation {
  message_count: number
  last_message_at: string
  total_tokens: number
}

// Function parameter types
export interface IncrementUsageMetricsParams {
  p_tenant_id: string
  p_user_id: string
  p_date: string
  p_prompt_tokens: number
  p_completion_tokens: number
  p_estimated_cost: number
}

// API response types
export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  page_size: number
  has_more: boolean
}

export interface UsageStats {
  tenant_id: string
  user_id?: string
  period: 'day' | 'week' | 'month'
  total_tokens: number
  prompt_tokens: number
  completion_tokens: number
  request_count: number
  estimated_cost: number
  average_tokens_per_request: number
}

export interface FeedbackStats {
  message_id: string
  total_feedback: number
  thumbs_up: number
  thumbs_down: number
  avg_rating: number
  positive_percentage: number
}
