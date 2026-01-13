/**
 * Database types for Supabase
 * These types should be generated from your Supabase schema
 * Run: npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.ts
 *
 * For now, this is a placeholder with expected table structures
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string;
          slug: string;
          name: string;
          settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          tenant_id: string;
          email: string;
          name: string;
          role: string;
          avatar_url: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
          last_login_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          email: string;
          name: string;
          role?: string;
          avatar_url?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
          last_login_at?: string | null;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          email?: string;
          name?: string;
          role?: string;
          avatar_url?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
          last_login_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'users_tenant_id_fkey';
            columns: ['tenant_id'];
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          }
        ];
      };
      conversations: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string;
          title: string;
          summary: string | null;
          status: string;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          user_id: string;
          title: string;
          summary?: string | null;
          status?: string;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          user_id?: string;
          title?: string;
          summary?: string | null;
          status?: string;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'conversations_tenant_id_fkey';
            columns: ['tenant_id'];
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'conversations_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          role: string;
          content: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          role: string;
          content: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          role?: string;
          content?: string;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'messages_conversation_id_fkey';
            columns: ['conversation_id'];
            referencedRelation: 'conversations';
            referencedColumns: ['id'];
          }
        ];
      };
      feedback: {
        Row: {
          id: string;
          message_id: string;
          conversation_id: string;
          user_id: string;
          tenant_id: string;
          rating: string;
          comment: string | null;
          category: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          message_id: string;
          conversation_id: string;
          user_id: string;
          tenant_id: string;
          rating: string;
          comment?: string | null;
          category?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          message_id?: string;
          conversation_id?: string;
          user_id?: string;
          tenant_id?: string;
          rating?: string;
          comment?: string | null;
          category?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'feedback_message_id_fkey';
            columns: ['message_id'];
            referencedRelation: 'messages';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'feedback_conversation_id_fkey';
            columns: ['conversation_id'];
            referencedRelation: 'conversations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'feedback_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'feedback_tenant_id_fkey';
            columns: ['tenant_id'];
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          }
        ];
      };
      usage_metrics: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string;
          date: string;
          model: string;
          prompt_tokens: number;
          completion_tokens: number;
          total_tokens: number;
          request_count: number;
          estimated_cost: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          user_id: string;
          date: string;
          model: string;
          prompt_tokens?: number;
          completion_tokens?: number;
          total_tokens?: number;
          request_count?: number;
          estimated_cost?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          user_id?: string;
          date?: string;
          model?: string;
          prompt_tokens?: number;
          completion_tokens?: number;
          total_tokens?: number;
          request_count?: number;
          estimated_cost?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'usage_metrics_tenant_id_fkey';
            columns: ['tenant_id'];
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'usage_metrics_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      increment_usage_metrics: {
        Args: {
          p_tenant_id: string;
          p_user_id: string;
          p_prompt_tokens: number;
          p_completion_tokens: number;
          p_model: string;
          p_estimated_cost: number;
        };
        Returns: void;
      };
      get_user_daily_usage: {
        Args: {
          p_user_id: string;
          p_start_date: string;
          p_end_date: string;
        };
        Returns: Array<{
          date: string;
          model: string;
          prompt_tokens: number;
          completion_tokens: number;
          total_tokens: number;
          request_count: number;
          estimated_cost: number;
        }>;
      };
      get_tenant_usage_summary: {
        Args: {
          p_tenant_id: string;
          p_start_date: string;
          p_end_date: string;
        };
        Returns: Array<{
          user_id: string;
          model: string;
          total_prompt_tokens: number;
          total_completion_tokens: number;
          total_tokens: number;
          total_requests: number;
          total_cost: number;
        }>;
      };
    };
    Enums: {
      user_role: 'admin' | 'member' | 'guest';
      conversation_status: 'active' | 'archived' | 'deleted';
      message_role: 'user' | 'assistant' | 'system';
      feedback_rating: 'positive' | 'negative';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

// Helper types for easier access
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

// Convenience type aliases
export type TenantRow = Tables<'tenants'>;
export type UserRow = Tables<'users'>;
export type ConversationRow = Tables<'conversations'>;
export type MessageRow = Tables<'messages'>;
export type FeedbackRow = Tables<'feedback'>;
