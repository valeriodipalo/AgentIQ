-- Rollback Migration: Drop conversations table and related objects
-- This script safely removes the conversations table and triggers

BEGIN;

-- Drop triggers first
DROP TRIGGER IF EXISTS trigger_conversations_updated_at ON public.conversations;

-- Drop functions (only if not used by other tables)
-- Note: update_updated_at_column() might be used by other tables
-- Uncomment the line below only if no other tables use this function
-- DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

-- Drop the main table
DROP TABLE IF EXISTS public.conversations CASCADE;

-- Log rollback completion
DO $$
BEGIN
    RAISE NOTICE 'Rollback completed: conversations table and triggers dropped';
    RAISE NOTICE 'Note: update_updated_at_column() function was NOT dropped (may be used elsewhere)';
END $$;

COMMIT;
