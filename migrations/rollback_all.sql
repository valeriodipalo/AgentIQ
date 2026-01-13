-- Complete Rollback: Drop all tables created in migrations 003-006
-- WARNING: This will delete all data in conversations, messages, feedback, and usage_metrics tables
-- Use this script only if you want to completely reverse all migrations

BEGIN;

-- Drop in reverse dependency order

-- 1. Drop usage_metrics (006)
DROP VIEW IF EXISTS public.current_day_usage CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.monthly_usage_summary CASCADE;
DROP FUNCTION IF EXISTS public.increment_usage_metrics(UUID, UUID, DATE, INTEGER, INTEGER, DECIMAL) CASCADE;
DROP TABLE IF EXISTS public.usage_metrics CASCADE;

-- 2. Drop feedback (005) - depends on messages
DROP MATERIALIZED VIEW IF EXISTS public.message_feedback_summary CASCADE;
DROP TABLE IF EXISTS public.feedback CASCADE;

-- 3. Drop messages (004) - depends on conversations
DROP TRIGGER IF EXISTS trigger_messages_update_conversation ON public.messages;
DROP FUNCTION IF EXISTS public.update_conversation_timestamp() CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;

-- 4. Drop conversations (003)
DROP TRIGGER IF EXISTS trigger_conversations_updated_at ON public.conversations;
DROP TABLE IF EXISTS public.conversations CASCADE;

-- 5. Drop shared functions (only if not used by other tables)
-- Uncomment if you're sure no other tables use this function
-- DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

-- Log rollback completion
DO $$
BEGIN
    RAISE NOTICE '=======================================================';
    RAISE NOTICE 'Complete rollback finished successfully';
    RAISE NOTICE 'The following objects have been dropped:';
    RAISE NOTICE '  - conversations table';
    RAISE NOTICE '  - messages table';
    RAISE NOTICE '  - feedback table';
    RAISE NOTICE '  - usage_metrics table';
    RAISE NOTICE '  - All related views, triggers, and functions';
    RAISE NOTICE '=======================================================';
END $$;

COMMIT;
