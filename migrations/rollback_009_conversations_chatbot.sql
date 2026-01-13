-- Rollback 009: Remove chatbot_id column from conversations table
-- Description: Remove chatbot linkage from conversations
-- Date: 2026-01-13

-- Drop indexes
DROP INDEX IF EXISTS idx_conversations_tenant_chatbot;
DROP INDEX IF EXISTS idx_conversations_chatbot_id;

-- Drop foreign key constraint
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS fk_conversations_chatbot;

-- Drop column
ALTER TABLE public.conversations DROP COLUMN IF EXISTS chatbot_id;
