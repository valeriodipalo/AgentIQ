-- Migration 009: Add chatbot_id column to conversations table
-- Description: Link conversations to specific chatbots for multi-agent support
-- Date: 2026-01-13

-- Add chatbot_id column to conversations table (idempotent, nullable for backward compatibility)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'conversations'
        AND column_name = 'chatbot_id'
    ) THEN
        ALTER TABLE public.conversations
        ADD COLUMN chatbot_id UUID NULL;
    END IF;
END $$;

-- Add foreign key constraint to chatbots table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_conversations_chatbot'
        AND conrelid = 'public.conversations'::regclass
    ) THEN
        ALTER TABLE public.conversations
        ADD CONSTRAINT fk_conversations_chatbot
            FOREIGN KEY (chatbot_id)
            REFERENCES public.chatbots(id)
            ON DELETE SET NULL;
    END IF;
END $$;

-- Create index on chatbot_id for performance (idempotent)
CREATE INDEX IF NOT EXISTS idx_conversations_chatbot_id ON public.conversations(chatbot_id);

-- Create composite index for tenant+chatbot queries (idempotent)
CREATE INDEX IF NOT EXISTS idx_conversations_tenant_chatbot ON public.conversations(tenant_id, chatbot_id);

-- Add comment for documentation
COMMENT ON COLUMN public.conversations.chatbot_id IS 'Reference to the chatbot used in this conversation (nullable for backward compatibility)';
