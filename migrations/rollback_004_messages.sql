-- Rollback Migration: Drop messages table and related objects
-- This script safely removes the messages table, triggers, and functions

BEGIN;

-- Drop triggers first
DROP TRIGGER IF EXISTS trigger_messages_update_conversation ON public.messages;

-- Drop functions
DROP FUNCTION IF EXISTS public.update_conversation_timestamp() CASCADE;

-- Drop the main table
DROP TABLE IF EXISTS public.messages CASCADE;

-- Log rollback completion
DO $$
BEGIN
    RAISE NOTICE 'Rollback completed: messages table, triggers, and functions dropped';
END $$;

COMMIT;
