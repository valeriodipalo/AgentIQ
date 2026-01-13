-- Migration: Create feedback table
-- Description: Store user feedback (thumbs up/down) on AI assistant messages

-- Create feedback table
CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL,
    user_id UUID NOT NULL,
    rating SMALLINT NOT NULL,
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Foreign key constraints
    CONSTRAINT fk_feedback_message
        FOREIGN KEY (message_id)
        REFERENCES public.messages(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_feedback_user
        FOREIGN KEY (user_id)
        REFERENCES public.users(id)
        ON DELETE CASCADE,

    -- Validation constraints
    CONSTRAINT check_rating_valid CHECK (rating IN (-1, 1)),
    CONSTRAINT check_comment_length CHECK (comment IS NULL OR char_length(comment) <= 5000),

    -- Ensure one feedback per user per message
    CONSTRAINT uq_feedback_message_user UNIQUE (message_id, user_id)
);

-- Create indexes for performance optimization
CREATE INDEX idx_feedback_message_id ON public.feedback(message_id);
CREATE INDEX idx_feedback_user_id ON public.feedback(user_id);
CREATE INDEX idx_feedback_rating ON public.feedback(rating);
CREATE INDEX idx_feedback_created_at ON public.feedback(created_at DESC);

-- Create composite index for analytics queries
CREATE INDEX idx_feedback_message_rating ON public.feedback(message_id, rating);

-- Enable Row Level Security
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view feedback from their tenant
CREATE POLICY "Users can view feedback from their tenant"
    ON public.feedback
    FOR SELECT
    USING (
        message_id IN (
            SELECT m.id
            FROM public.messages m
            INNER JOIN public.conversations c ON m.conversation_id = c.id
            INNER JOIN public.users u ON c.tenant_id = u.tenant_id
            WHERE u.auth_id = auth.uid()
            AND u.is_active = true
        )
    );

-- RLS Policy: Users can create feedback in their tenant
CREATE POLICY "Users can create feedback in their tenant"
    ON public.feedback
    FOR INSERT
    WITH CHECK (
        message_id IN (
            SELECT m.id
            FROM public.messages m
            INNER JOIN public.conversations c ON m.conversation_id = c.id
            INNER JOIN public.users u ON c.tenant_id = u.tenant_id
            WHERE u.auth_id = auth.uid()
            AND u.is_active = true
        )
        AND user_id IN (
            SELECT id
            FROM public.users
            WHERE auth_id = auth.uid()
            AND is_active = true
        )
    );

-- RLS Policy: Users can update their own feedback
CREATE POLICY "Users can update their own feedback"
    ON public.feedback
    FOR UPDATE
    USING (
        user_id IN (
            SELECT id
            FROM public.users
            WHERE auth_id = auth.uid()
            AND is_active = true
        )
    )
    WITH CHECK (
        user_id IN (
            SELECT id
            FROM public.users
            WHERE auth_id = auth.uid()
            AND is_active = true
        )
    );

-- RLS Policy: Users can delete their own feedback
CREATE POLICY "Users can delete their own feedback"
    ON public.feedback
    FOR DELETE
    USING (
        user_id IN (
            SELECT id
            FROM public.users
            WHERE auth_id = auth.uid()
            AND is_active = true
        )
    );

-- Create materialized view for feedback analytics (optional, for performance)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.message_feedback_summary AS
SELECT
    m.id as message_id,
    c.conversation_id,
    c.tenant_id,
    COUNT(*) as total_feedback,
    COUNT(*) FILTER (WHERE f.rating = 1) as thumbs_up,
    COUNT(*) FILTER (WHERE f.rating = -1) as thumbs_down,
    ROUND(AVG(f.rating), 2) as avg_rating
FROM public.messages m
LEFT JOIN public.conversations c ON m.conversation_id = c.id
LEFT JOIN public.feedback f ON m.id = f.message_id
GROUP BY m.id, c.conversation_id, c.tenant_id;

-- Create index on materialized view
CREATE INDEX idx_message_feedback_summary_message ON public.message_feedback_summary(message_id);
CREATE INDEX idx_message_feedback_summary_tenant ON public.message_feedback_summary(tenant_id);

-- Add comments for documentation
COMMENT ON TABLE public.feedback IS 'Stores user feedback (thumbs up/down) on AI assistant messages';
COMMENT ON COLUMN public.feedback.id IS 'Unique feedback identifier';
COMMENT ON COLUMN public.feedback.message_id IS 'Reference to the message being rated';
COMMENT ON COLUMN public.feedback.user_id IS 'Reference to the user providing feedback';
COMMENT ON COLUMN public.feedback.rating IS 'Rating: 1 for thumbs up, -1 for thumbs down';
COMMENT ON COLUMN public.feedback.comment IS 'Optional text comment (max 5000 characters)';
COMMENT ON MATERIALIZED VIEW public.message_feedback_summary IS 'Aggregated feedback statistics per message';
