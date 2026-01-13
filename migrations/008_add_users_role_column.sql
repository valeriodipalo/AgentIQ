-- Migration 008: Add role column to users table
-- Description: Add role-based access control for admin/user distinction
-- Date: 2026-01-13

-- Add role column to users table (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'role'
    ) THEN
        ALTER TABLE public.users
        ADD COLUMN role VARCHAR(50) NOT NULL DEFAULT 'user';
    END IF;
END $$;

-- Add check constraint for valid roles
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'check_role_valid'
        AND conrelid = 'public.users'::regclass
    ) THEN
        ALTER TABLE public.users
        ADD CONSTRAINT check_role_valid CHECK (role IN ('admin', 'user'));
    END IF;
END $$;

-- Create index on role for filtering (idempotent)
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- Create composite index for tenant+role queries (idempotent)
CREATE INDEX IF NOT EXISTS idx_users_tenant_role ON public.users(tenant_id, role);

-- Add comment for documentation
COMMENT ON COLUMN public.users.role IS 'User role: admin (can manage chatbots) or user (regular access)';
