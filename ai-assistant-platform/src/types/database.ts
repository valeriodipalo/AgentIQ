/**
 * Database types for Supabase
 * Auto-generated from Supabase schema - 2026-01-13
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      chatbots: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_published: boolean
          max_tokens: number
          model: string
          name: string
          settings: Json | null
          system_prompt: string
          temperature: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_published?: boolean
          max_tokens?: number
          model?: string
          name: string
          settings?: Json | null
          system_prompt: string
          temperature?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_published?: boolean
          max_tokens?: number
          model?: string
          name?: string
          settings?: Json | null
          system_prompt?: string
          temperature?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_chatbots_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_chatbots_tenant"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          chatbot_id: string | null
          created_at: string
          id: string
          is_archived: boolean
          metadata: Json | null
          tenant_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          chatbot_id?: string | null
          created_at?: string
          id?: string
          is_archived?: boolean
          metadata?: Json | null
          tenant_id: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          chatbot_id?: string | null
          created_at?: string
          id?: string
          is_archived?: boolean
          metadata?: Json | null
          tenant_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_conversations_chatbot"
            columns: ["chatbot_id"]
            isOneToOne: false
            referencedRelation: "chatbots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_conversations_tenant"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_conversations_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          created_at: string
          id: string
          message_id: string
          notes: string | null
          rating: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          notes?: string | null
          rating: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          notes?: string | null
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_feedback_message"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_feedback_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_codes: {
        Row: {
          code: string
          created_at: string | null
          created_by: string | null
          current_uses: number | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          max_uses: number | null
          notes: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          created_by?: string | null
          current_uses?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          notes?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by?: string | null
          current_uses?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          notes?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invite_codes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invite_codes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_redemptions: {
        Row: {
          id: string
          invite_code_id: string
          redeemed_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          invite_code_id: string
          redeemed_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          invite_code_id?: string
          redeemed_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invite_redemptions_invite_code_id_fkey"
            columns: ["invite_code_id"]
            isOneToOne: false
            referencedRelation: "invite_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invite_redemptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          latency_ms: number | null
          metadata: Json | null
          model_used: string | null
          role: string
          token_count: number | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          latency_ms?: number | null
          metadata?: Json | null
          model_used?: string | null
          role: string
          token_count?: number | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          latency_ms?: number | null
          metadata?: Json | null
          model_used?: string | null
          role?: string
          token_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_messages_conversation"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          branding: Json | null
          created_at: string | null
          daily_token_limit: number | null
          features: Json | null
          id: string
          is_active: boolean | null
          llm_model: string | null
          llm_provider: string | null
          max_tokens: number | null
          name: string
          rate_limit_per_minute: number | null
          slug: string
          system_prompt: string | null
          temperature: number | null
          updated_at: string | null
        }
        Insert: {
          branding?: Json | null
          created_at?: string | null
          daily_token_limit?: number | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          llm_model?: string | null
          llm_provider?: string | null
          max_tokens?: number | null
          name: string
          rate_limit_per_minute?: number | null
          slug: string
          system_prompt?: string | null
          temperature?: number | null
          updated_at?: string | null
        }
        Update: {
          branding?: Json | null
          created_at?: string | null
          daily_token_limit?: number | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          llm_model?: string | null
          llm_provider?: string | null
          max_tokens?: number | null
          name?: string
          rate_limit_per_minute?: number | null
          slug?: string
          system_prompt?: string | null
          temperature?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          auth_id: string | null
          created_at: string | null
          email: string
          id: string
          invited_via: string | null
          is_active: boolean | null
          last_active_at: string | null
          name: string | null
          preferences: Json | null
          role: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          auth_id?: string | null
          created_at?: string | null
          email: string
          id?: string
          invited_via?: string | null
          is_active?: boolean | null
          last_active_at?: string | null
          name?: string | null
          preferences?: Json | null
          role?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          auth_id?: string | null
          created_at?: string | null
          email?: string
          id?: string
          invited_via?: string | null
          is_active?: boolean | null
          last_active_at?: string | null
          name?: string | null
          preferences?: Json | null
          role?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_invited_via_fkey"
            columns: ["invited_via"]
            isOneToOne: false
            referencedRelation: "invite_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types for easier access
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

// Convenience type aliases
export type TenantRow = Tables<'tenants'>
export type UserRow = Tables<'users'>
export type ConversationRow = Tables<'conversations'>
export type MessageRow = Tables<'messages'>
export type FeedbackRow = Tables<'feedback'>
export type ChatbotRow = Tables<'chatbots'>
export type InviteCodeRow = Tables<'invite_codes'>
export type InviteRedemptionRow = Tables<'invite_redemptions'>
