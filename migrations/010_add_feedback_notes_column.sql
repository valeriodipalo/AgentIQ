-- Migration 010: Add notes column to feedback table
-- Description: Allow users to provide written feedback alongside ratings
-- Date: 2026-01-13

-- Rename existing 'comment' column to 'notes' if it exists, or add 'notes' if it doesn't
DO $$
BEGIN
    -- Check if 'comment' column exists
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'feedback'
        AND column_name = 'comment'
    ) THEN
        -- Rename 'comment' to 'notes'
        ALTER TABLE public.feedback
        RENAME COLUMN comment TO notes;

        -- Drop old constraint if it exists
        IF EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'check_comment_length'
            AND conrelid = 'public.feedback'::regclass
        ) THEN
            ALTER TABLE public.feedback
            DROP CONSTRAINT check_comment_length;
        END IF;
    END IF;

    -- Add 'notes' column if it doesn't exist (in case migration is run on fresh schema)
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'feedback'
        AND column_name = 'notes'
    ) THEN
        ALTER TABLE public.feedback
        ADD COLUMN notes TEXT NULL;
    END IF;
END $$;

-- Add check constraint for notes length (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'check_notes_length'
        AND conrelid = 'public.feedback'::regclass
    ) THEN
        ALTER TABLE public.feedback
        ADD CONSTRAINT check_notes_length CHECK (notes IS NULL OR char_length(notes) <= 5000);
    END IF;
END $$;

-- Update comment for documentation
COMMENT ON COLUMN public.feedback.notes IS 'Optional written feedback from user (max 5000 characters)';
