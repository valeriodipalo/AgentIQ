-- Migration: Create messages table
-- Description: Store individual messages in conversations with performance metrics

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    token_count INTEGER,
    model_used TEXT,
    latency_ms INTEGER,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Foreign key constraints
    CONSTRAINT fk_messages_conversation
        FOREIGN KEY (conversation_id)
        REFERENCES public.conversations(id)
        ON DELETE CASCADE,

    -- Validation constraints
    CONSTRAINT check_role_valid CHECK (role IN ('user', 'assistant', 'system')),
    CONSTRAINT check_content_not_empty CHECK (char_length(content) > 0),
    CONSTRAINT check_token_count_positive CHECK (token_count IS NULL OR token_count >= 0),
    CONSTRAINT check_latency_positive CHECK (latency_ms IS NULL OR latency_ms >= 0)
);

-- Create indexes for performance optimization
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX idx_messages_conversation_created ON public.messages(conversation_id, created_at);
CREATE INDEX idx_messages_role ON public.messages(role);
CREATE INDEX idx_messages_model_used ON public.messages(model_used) WHERE model_used IS NOT NULL;

-- Create index for token count analytics
CREATE INDEX idx_messages_token_count ON public.messages(token_count) WHERE token_count IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view messages from conversations in their tenant
CREATE POLICY "Users can view messages from their tenant conversations"
    ON public.messages
    FOR SELECT
    USING (
        conversation_id IN (
            SELECT c.id
            FROM public.conversations c
            INNER JOIN public.users u ON c.tenant_id = u.tenant_id
            WHERE u.auth_id = auth.uid()
            AND u.is_active = true
        )
    );

-- RLS Policy: Users can create messages in their tenant conversations
CREATE POLICY "Users can create messages in their tenant conversations"
    ON public.messages
    FOR INSERT
    WITH CHECK (
        conversation_id IN (
            SELECT c.id
            FROM public.conversations c
            INNER JOIN public.users u ON c.tenant_id = u.tenant_id
            WHERE u.auth_id = auth.uid()
            AND u.is_active = true
        )
    );

-- RLS Policy: Users can update messages in their own conversations
CREATE POLICY "Users can update messages in their conversations"
    ON public.messages
    FOR UPDATE
    USING (
        conversation_id IN (
            SELECT c.id
            FROM public.conversations c
            INNER JOIN public.users u ON c.user_id = u.id
            WHERE u.auth_id = auth.uid()
            AND u.is_active = true
        )
    )
    WITH CHECK (
        conversation_id IN (
            SELECT c.id
            FROM public.conversations c
            INNER JOIN public.users u ON c.user_id = u.id
            WHERE u.auth_id = auth.uid()
            AND u.is_active = true
        )
    );

-- RLS Policy: Users can delete messages in their own conversations
CREATE POLICY "Users can delete messages in their conversations"
    ON public.messages
    FOR DELETE
    USING (
        conversation_id IN (
            SELECT c.id
            FROM public.conversations c
            INNER JOIN public.users u ON c.user_id = u.id
            WHERE u.auth_id = auth.uid()
            AND u.is_active = true
        )
    );

-- Create function to update conversation updated_at when messages are added
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.conversations
    SET updated_at = now()
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_messages_update_conversation
    AFTER INSERT ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_timestamp();

-- Add comments for documentation
COMMENT ON TABLE public.messages IS 'Stores individual messages in conversations with performance metrics';
COMMENT ON COLUMN public.messages.id IS 'Unique message identifier';
COMMENT ON COLUMN public.messages.conversation_id IS 'Reference to the parent conversation';
COMMENT ON COLUMN public.messages.role IS 'Message role: user, assistant, or system';
COMMENT ON COLUMN public.messages.content IS 'Message content';
COMMENT ON COLUMN public.messages.token_count IS 'Number of tokens used for this message';
COMMENT ON COLUMN public.messages.model_used IS 'LLM model used to generate this message';
COMMENT ON COLUMN public.messages.latency_ms IS 'Response latency in milliseconds';
COMMENT ON COLUMN public.messages.metadata IS 'Additional metadata stored as JSONB';
