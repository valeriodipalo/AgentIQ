-- Migration 007: Create chatbots table
-- Description: Store admin-created AI agent configurations for multi-agent platform
-- Date: 2026-01-13

-- Create chatbots table
CREATE TABLE IF NOT EXISTS public.chatbots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    system_prompt TEXT NOT NULL,
    model VARCHAR(100) NOT NULL DEFAULT 'gpt-4-turbo-preview',
    temperature DECIMAL(3,2) NOT NULL DEFAULT 0.7,
    max_tokens INTEGER NOT NULL DEFAULT 2048,
    settings JSONB DEFAULT '{}'::jsonb,
    is_published BOOLEAN NOT NULL DEFAULT false,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Foreign key constraints
    CONSTRAINT fk_chatbots_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES public.tenants(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_chatbots_created_by
        FOREIGN KEY (created_by)
        REFERENCES public.users(id)
        ON DELETE RESTRICT,

    -- Validation constraints
    CONSTRAINT check_name_not_empty CHECK (char_length(TRIM(name)) > 0),
    CONSTRAINT check_name_length CHECK (char_length(name) <= 255),
    CONSTRAINT check_system_prompt_not_empty CHECK (char_length(TRIM(system_prompt)) > 0),
    CONSTRAINT check_model_not_empty CHECK (char_length(TRIM(model)) > 0),
    CONSTRAINT check_temperature_range CHECK (temperature >= 0.0 AND temperature <= 2.0),
    CONSTRAINT check_max_tokens_positive CHECK (max_tokens > 0 AND max_tokens <= 128000)
);

-- Create indexes for performance optimization
CREATE INDEX idx_chatbots_tenant_id ON public.chatbots(tenant_id);
CREATE INDEX idx_chatbots_created_by ON public.chatbots(created_by);
CREATE INDEX idx_chatbots_is_published ON public.chatbots(is_published) WHERE is_published = true;
CREATE INDEX idx_chatbots_tenant_published ON public.chatbots(tenant_id, is_published);
CREATE INDEX idx_chatbots_created_at ON public.chatbots(created_at DESC);
CREATE INDEX idx_chatbots_name ON public.chatbots(tenant_id, name);

-- Create trigger for updated_at (reuse existing function)
CREATE TRIGGER trigger_chatbots_updated_at
    BEFORE UPDATE ON public.chatbots
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.chatbots ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admin users can view all chatbots in their tenant
CREATE POLICY "Admin users can view chatbots in their tenant"
    ON public.chatbots
    FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id
            FROM public.users
            WHERE auth_id = auth.uid()
            AND is_active = true
            AND role = 'admin'
        )
    );

-- RLS Policy: Regular users can view only published chatbots in their tenant
CREATE POLICY "Users can view published chatbots in their tenant"
    ON public.chatbots
    FOR SELECT
    USING (
        is_published = true
        AND tenant_id IN (
            SELECT tenant_id
            FROM public.users
            WHERE auth_id = auth.uid()
            AND is_active = true
        )
    );

-- RLS Policy: Admin users can create chatbots in their tenant
CREATE POLICY "Admin users can create chatbots in their tenant"
    ON public.chatbots
    FOR INSERT
    WITH CHECK (
        tenant_id IN (
            SELECT tenant_id
            FROM public.users
            WHERE auth_id = auth.uid()
            AND is_active = true
            AND role = 'admin'
        )
        AND created_by IN (
            SELECT id
            FROM public.users
            WHERE auth_id = auth.uid()
            AND is_active = true
            AND role = 'admin'
        )
    );

-- RLS Policy: Admin users can update chatbots in their tenant
CREATE POLICY "Admin users can update chatbots in their tenant"
    ON public.chatbots
    FOR UPDATE
    USING (
        tenant_id IN (
            SELECT tenant_id
            FROM public.users
            WHERE auth_id = auth.uid()
            AND is_active = true
            AND role = 'admin'
        )
    )
    WITH CHECK (
        tenant_id IN (
            SELECT tenant_id
            FROM public.users
            WHERE auth_id = auth.uid()
            AND is_active = true
            AND role = 'admin'
        )
    );

-- RLS Policy: Admin users can delete chatbots in their tenant
CREATE POLICY "Admin users can delete chatbots in their tenant"
    ON public.chatbots
    FOR DELETE
    USING (
        tenant_id IN (
            SELECT tenant_id
            FROM public.users
            WHERE auth_id = auth.uid()
            AND is_active = true
            AND role = 'admin'
        )
    );

-- RLS Policy: Allow demo user to SELECT published chatbots (for testing without auth)
CREATE POLICY "Demo user can view published chatbots"
    ON public.chatbots
    FOR SELECT
    USING (
        is_published = true
        AND auth.uid() IS NULL -- No auth required for demo access
    );

-- Add comments for documentation
COMMENT ON TABLE public.chatbots IS 'Stores AI agent configurations created by admin users';
COMMENT ON COLUMN public.chatbots.id IS 'Unique chatbot identifier';
COMMENT ON COLUMN public.chatbots.tenant_id IS 'Reference to the tenant that owns this chatbot';
COMMENT ON COLUMN public.chatbots.name IS 'Chatbot display name (max 255 characters)';
COMMENT ON COLUMN public.chatbots.description IS 'Optional description of chatbot purpose and capabilities';
COMMENT ON COLUMN public.chatbots.system_prompt IS 'System prompt that defines chatbot behavior and personality';
COMMENT ON COLUMN public.chatbots.model IS 'LLM model identifier (e.g., gpt-4-turbo-preview, gpt-3.5-turbo)';
COMMENT ON COLUMN public.chatbots.temperature IS 'Sampling temperature (0.0-2.0, default 0.7)';
COMMENT ON COLUMN public.chatbots.max_tokens IS 'Maximum tokens in response (1-128000)';
COMMENT ON COLUMN public.chatbots.settings IS 'Additional configuration parameters as JSONB';
COMMENT ON COLUMN public.chatbots.is_published IS 'Whether the chatbot is available to users';
COMMENT ON COLUMN public.chatbots.created_by IS 'Reference to admin user who created this chatbot';
COMMENT ON COLUMN public.chatbots.created_at IS 'Timestamp when chatbot was created';
COMMENT ON COLUMN public.chatbots.updated_at IS 'Timestamp when chatbot was last updated';
