-- Rollback 008: Remove role column from users table
-- Description: Remove role-based access control column
-- Date: 2026-01-13

-- Drop indexes
DROP INDEX IF EXISTS idx_users_tenant_role;
DROP INDEX IF EXISTS idx_users_role;

-- Drop check constraint
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS check_role_valid;

-- Drop column
ALTER TABLE public.users DROP COLUMN IF EXISTS role;
