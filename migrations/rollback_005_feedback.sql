-- Rollback Migration: Drop feedback table and related objects
-- This script safely removes the feedback table and materialized view

BEGIN;

-- Drop materialized view first
DROP MATERIALIZED VIEW IF EXISTS public.message_feedback_summary CASCADE;

-- Drop the main table
DROP TABLE IF EXISTS public.feedback CASCADE;

-- Log rollback completion
DO $$
BEGIN
    RAISE NOTICE 'Rollback completed: feedback table and message_feedback_summary view dropped';
END $$;

COMMIT;
