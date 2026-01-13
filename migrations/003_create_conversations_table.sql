-- Migration: Create conversations table
-- Description: Store chat conversations for the AI assistant platform

-- Create conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    title TEXT NOT NULL DEFAULT 'New Conversation',
    metadata JSONB DEFAULT '{}'::jsonb,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Foreign key constraints
    CONSTRAINT fk_conversations_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES public.tenants(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_conversations_user
        FOREIGN KEY (user_id)
        REFERENCES public.users(id)
        ON DELETE CASCADE,

    -- Validation constraints
    CONSTRAINT check_title_length CHECK (char_length(title) <= 500)
);

-- Create indexes for performance optimization
CREATE INDEX idx_conversations_tenant_id ON public.conversations(tenant_id);
CREATE INDEX idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX idx_conversations_tenant_user ON public.conversations(tenant_id, user_id);
CREATE INDEX idx_conversations_created_at ON public.conversations(created_at DESC);
CREATE INDEX idx_conversations_archived ON public.conversations(is_archived) WHERE is_archived = false;
CREATE INDEX idx_conversations_tenant_archived ON public.conversations(tenant_id, is_archived);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_conversations_updated_at
    BEFORE UPDATE ON public.conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view conversations from their own tenant
CREATE POLICY "Users can view conversations from their tenant"
    ON public.conversations
    FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id
            FROM public.users
            WHERE auth_id = auth.uid()
            AND is_active = true
        )
    );

-- RLS Policy: Users can create conversations in their own tenant
CREATE POLICY "Users can create conversations in their tenant"
    ON public.conversations
    FOR INSERT
    WITH CHECK (
        tenant_id IN (
            SELECT tenant_id
            FROM public.users
            WHERE auth_id = auth.uid()
            AND is_active = true
        )
        AND user_id IN (
            SELECT id
            FROM public.users
            WHERE auth_id = auth.uid()
            AND is_active = true
        )
    );

-- RLS Policy: Users can update their own conversations
CREATE POLICY "Users can update their own conversations"
    ON public.conversations
    FOR UPDATE
    USING (
        user_id IN (
            SELECT id
            FROM public.users
            WHERE auth_id = auth.uid()
            AND is_active = true
        )
    )
    WITH CHECK (
        user_id IN (
            SELECT id
            FROM public.users
            WHERE auth_id = auth.uid()
            AND is_active = true
        )
    );

-- RLS Policy: Users can delete their own conversations
CREATE POLICY "Users can delete their own conversations"
    ON public.conversations
    FOR DELETE
    USING (
        user_id IN (
            SELECT id
            FROM public.users
            WHERE auth_id = auth.uid()
            AND is_active = true
        )
    );

-- Add comments for documentation
COMMENT ON TABLE public.conversations IS 'Stores chat conversations for the AI assistant platform';
COMMENT ON COLUMN public.conversations.id IS 'Unique conversation identifier';
COMMENT ON COLUMN public.conversations.tenant_id IS 'Reference to the tenant that owns this conversation';
COMMENT ON COLUMN public.conversations.user_id IS 'Reference to the user who created this conversation';
COMMENT ON COLUMN public.conversations.title IS 'Conversation title (max 500 characters)';
COMMENT ON COLUMN public.conversations.metadata IS 'Additional metadata stored as JSONB';
COMMENT ON COLUMN public.conversations.is_archived IS 'Whether the conversation is archived';
