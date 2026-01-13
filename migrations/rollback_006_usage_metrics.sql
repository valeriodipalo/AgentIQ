-- Rollback Migration: Drop usage_metrics table and related objects
-- This script safely removes the usage_metrics table, views, and functions

BEGIN;

-- Drop dependent views first
DROP VIEW IF EXISTS public.current_day_usage CASCADE;

-- Drop materialized views
DROP MATERIALIZED VIEW IF EXISTS public.monthly_usage_summary CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS public.increment_usage_metrics(UUID, UUID, DATE, INTEGER, INTEGER, DECIMAL) CASCADE;

-- Drop the main table
DROP TABLE IF EXISTS public.usage_metrics CASCADE;

-- Log rollback completion
DO $$
BEGIN
    RAISE NOTICE 'Rollback completed: usage_metrics table and related objects dropped';
END $$;

COMMIT;
