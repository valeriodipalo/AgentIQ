-- Rollback 010: Remove notes column from feedback table
-- Description: Revert feedback notes column back to comment
-- Date: 2026-01-13

-- Drop constraint
ALTER TABLE public.feedback DROP CONSTRAINT IF EXISTS check_notes_length;

-- Rename 'notes' back to 'comment' if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'feedback'
        AND column_name = 'notes'
    ) THEN
        ALTER TABLE public.feedback
        RENAME COLUMN notes TO comment;
    END IF;
END $$;

-- Re-add original constraint
ALTER TABLE public.feedback
ADD CONSTRAINT check_comment_length CHECK (comment IS NULL OR char_length(comment) <= 5000);

-- Update comment
COMMENT ON COLUMN public.feedback.comment IS 'Optional text comment (max 5000 characters)';
