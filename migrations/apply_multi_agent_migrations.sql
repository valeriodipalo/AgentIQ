-- Apply Multi-Agent Platform Migrations
-- Description: Master migration script for multi-agent chatbot platform
-- Date: 2026-01-13
-- Order: 007 -> 008 -> 009 -> 010

-- =============================================================================
-- MIGRATION 007: Create chatbots table
-- =============================================================================

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

    CONSTRAINT fk_chatbots_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES public.tenants(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_chatbots_created_by
        FOREIGN KEY (created_by)
        REFERENCES public.users(id)
        ON DELETE RESTRICT,
    CONSTRAINT check_name_not_empty CHECK (char_length(TRIM(name)) > 0),
    CONSTRAINT check_name_length CHECK (char_length(name) <= 255),
    CONSTRAINT check_system_prompt_not_empty CHECK (char_length(TRIM(system_prompt)) > 0),
    CONSTRAINT check_model_not_empty CHECK (char_length(TRIM(model)) > 0),
    CONSTRAINT check_temperature_range CHECK (temperature >= 0.0 AND temperature <= 2.0),
    CONSTRAINT check_max_tokens_positive CHECK (max_tokens > 0 AND max_tokens <= 128000)
);

CREATE INDEX IF NOT EXISTS idx_chatbots_tenant_id ON public.chatbots(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chatbots_created_by ON public.chatbots(created_by);
CREATE INDEX IF NOT EXISTS idx_chatbots_is_published ON public.chatbots(is_published) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_chatbots_tenant_published ON public.chatbots(tenant_id, is_published);
CREATE INDEX IF NOT EXISTS idx_chatbots_created_at ON public.chatbots(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chatbots_name ON public.chatbots(tenant_id, name);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'trigger_chatbots_updated_at'
        AND tgrelid = 'public.chatbots'::regclass
    ) THEN
        CREATE TRIGGER trigger_chatbots_updated_at
            BEFORE UPDATE ON public.chatbots
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

ALTER TABLE public.chatbots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin users can view chatbots in their tenant" ON public.chatbots;
CREATE POLICY "Admin users can view chatbots in their tenant"
    ON public.chatbots FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id FROM public.users
            WHERE auth_id = auth.uid() AND is_active = true AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Users can view published chatbots in their tenant" ON public.chatbots;
CREATE POLICY "Users can view published chatbots in their tenant"
    ON public.chatbots FOR SELECT
    USING (
        is_published = true AND tenant_id IN (
            SELECT tenant_id FROM public.users
            WHERE auth_id = auth.uid() AND is_active = true
        )
    );

DROP POLICY IF EXISTS "Admin users can create chatbots in their tenant" ON public.chatbots;
CREATE POLICY "Admin users can create chatbots in their tenant"
    ON public.chatbots FOR INSERT
    WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM public.users
            WHERE auth_id = auth.uid() AND is_active = true AND role = 'admin'
        )
        AND created_by IN (
            SELECT id FROM public.users
            WHERE auth_id = auth.uid() AND is_active = true AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Admin users can update chatbots in their tenant" ON public.chatbots;
CREATE POLICY "Admin users can update chatbots in their tenant"
    ON public.chatbots FOR UPDATE
    USING (
        tenant_id IN (
            SELECT tenant_id FROM public.users
            WHERE auth_id = auth.uid() AND is_active = true AND role = 'admin'
        )
    )
    WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM public.users
            WHERE auth_id = auth.uid() AND is_active = true AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Admin users can delete chatbots in their tenant" ON public.chatbots;
CREATE POLICY "Admin users can delete chatbots in their tenant"
    ON public.chatbots FOR DELETE
    USING (
        tenant_id IN (
            SELECT tenant_id FROM public.users
            WHERE auth_id = auth.uid() AND is_active = true AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Demo user can view published chatbots" ON public.chatbots;
CREATE POLICY "Demo user can view published chatbots"
    ON public.chatbots FOR SELECT
    USING (is_published = true AND auth.uid() IS NULL);

COMMENT ON TABLE public.chatbots IS 'Stores AI agent configurations created by admin users';

-- =============================================================================
-- MIGRATION 008: Add role column to users table
-- =============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'role'
    ) THEN
        ALTER TABLE public.users ADD COLUMN role VARCHAR(50) NOT NULL DEFAULT 'user';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'check_role_valid' AND conrelid = 'public.users'::regclass
    ) THEN
        ALTER TABLE public.users ADD CONSTRAINT check_role_valid CHECK (role IN ('admin', 'user'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_tenant_role ON public.users(tenant_id, role);

COMMENT ON COLUMN public.users.role IS 'User role: admin (can manage chatbots) or user (regular access)';

-- =============================================================================
-- MIGRATION 009: Add chatbot_id column to conversations table
-- =============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'conversations' AND column_name = 'chatbot_id'
    ) THEN
        ALTER TABLE public.conversations ADD COLUMN chatbot_id UUID NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_conversations_chatbot' AND conrelid = 'public.conversations'::regclass
    ) THEN
        ALTER TABLE public.conversations
        ADD CONSTRAINT fk_conversations_chatbot
            FOREIGN KEY (chatbot_id)
            REFERENCES public.chatbots(id)
            ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_conversations_chatbot_id ON public.conversations(chatbot_id);
CREATE INDEX IF NOT EXISTS idx_conversations_tenant_chatbot ON public.conversations(tenant_id, chatbot_id);

COMMENT ON COLUMN public.conversations.chatbot_id IS 'Reference to the chatbot used in this conversation (nullable for backward compatibility)';

-- =============================================================================
-- MIGRATION 010: Add notes column to feedback table
-- =============================================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'feedback' AND column_name = 'comment'
    ) THEN
        ALTER TABLE public.feedback RENAME COLUMN comment TO notes;

        IF EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'check_comment_length' AND conrelid = 'public.feedback'::regclass
        ) THEN
            ALTER TABLE public.feedback DROP CONSTRAINT check_comment_length;
        END IF;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'feedback' AND column_name = 'notes'
    ) THEN
        ALTER TABLE public.feedback ADD COLUMN notes TEXT NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'check_notes_length' AND conrelid = 'public.feedback'::regclass
    ) THEN
        ALTER TABLE public.feedback
        ADD CONSTRAINT check_notes_length CHECK (notes IS NULL OR char_length(notes) <= 5000);
    END IF;
END $$;

COMMENT ON COLUMN public.feedback.notes IS 'Optional written feedback from user (max 5000 characters)';

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================
