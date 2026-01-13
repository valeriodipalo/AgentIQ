-- Rollback 007: Drop chatbots table
-- Description: Remove chatbots table and related objects
-- Date: 2026-01-13

-- Drop RLS policies
DROP POLICY IF EXISTS "Demo user can view published chatbots" ON public.chatbots;
DROP POLICY IF EXISTS "Admin users can delete chatbots in their tenant" ON public.chatbots;
DROP POLICY IF EXISTS "Admin users can update chatbots in their tenant" ON public.chatbots;
DROP POLICY IF EXISTS "Admin users can create chatbots in their tenant" ON public.chatbots;
DROP POLICY IF EXISTS "Users can view published chatbots in their tenant" ON public.chatbots;
DROP POLICY IF EXISTS "Admin users can view chatbots in their tenant" ON public.chatbots;

-- Drop trigger
DROP TRIGGER IF EXISTS trigger_chatbots_updated_at ON public.chatbots;

-- Drop indexes
DROP INDEX IF EXISTS idx_chatbots_name;
DROP INDEX IF EXISTS idx_chatbots_created_at;
DROP INDEX IF EXISTS idx_chatbots_tenant_published;
DROP INDEX IF EXISTS idx_chatbots_is_published;
DROP INDEX IF EXISTS idx_chatbots_created_by;
DROP INDEX IF EXISTS idx_chatbots_tenant_id;

-- Drop table
DROP TABLE IF EXISTS public.chatbots;
