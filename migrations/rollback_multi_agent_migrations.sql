-- Rollback Multi-Agent Platform Migrations
-- Description: Rollback all multi-agent migrations in reverse order
-- Date: 2026-01-13
-- Order: 010 -> 009 -> 008 -> 007

-- =============================================================================
-- ROLLBACK 010: Remove notes column from feedback table
-- =============================================================================

ALTER TABLE public.feedback DROP CONSTRAINT IF EXISTS check_notes_length;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'feedback' AND column_name = 'notes'
    ) THEN
        ALTER TABLE public.feedback RENAME COLUMN notes TO comment;
    END IF;
END $$;

ALTER TABLE public.feedback
ADD CONSTRAINT check_comment_length CHECK (comment IS NULL OR char_length(comment) <= 5000);

COMMENT ON COLUMN public.feedback.comment IS 'Optional text comment (max 5000 characters)';

-- =============================================================================
-- ROLLBACK 009: Remove chatbot_id column from conversations table
-- =============================================================================

DROP INDEX IF EXISTS idx_conversations_tenant_chatbot;
DROP INDEX IF EXISTS idx_conversations_chatbot_id;

ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS fk_conversations_chatbot;
ALTER TABLE public.conversations DROP COLUMN IF EXISTS chatbot_id;

-- =============================================================================
-- ROLLBACK 008: Remove role column from users table
-- =============================================================================

DROP INDEX IF EXISTS idx_users_tenant_role;
DROP INDEX IF EXISTS idx_users_role;

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS check_role_valid;
ALTER TABLE public.users DROP COLUMN IF EXISTS role;

-- =============================================================================
-- ROLLBACK 007: Drop chatbots table
-- =============================================================================

DROP POLICY IF EXISTS "Demo user can view published chatbots" ON public.chatbots;
DROP POLICY IF EXISTS "Admin users can delete chatbots in their tenant" ON public.chatbots;
DROP POLICY IF EXISTS "Admin users can update chatbots in their tenant" ON public.chatbots;
DROP POLICY IF EXISTS "Admin users can create chatbots in their tenant" ON public.chatbots;
DROP POLICY IF EXISTS "Users can view published chatbots in their tenant" ON public.chatbots;
DROP POLICY IF EXISTS "Admin users can view chatbots in their tenant" ON public.chatbots;

DROP TRIGGER IF EXISTS trigger_chatbots_updated_at ON public.chatbots;

DROP INDEX IF EXISTS idx_chatbots_name;
DROP INDEX IF EXISTS idx_chatbots_created_at;
DROP INDEX IF EXISTS idx_chatbots_tenant_published;
DROP INDEX IF EXISTS idx_chatbots_is_published;
DROP INDEX IF EXISTS idx_chatbots_created_by;
DROP INDEX IF EXISTS idx_chatbots_tenant_id;

DROP TABLE IF EXISTS public.chatbots;

-- =============================================================================
-- ROLLBACK COMPLETE
-- =============================================================================
