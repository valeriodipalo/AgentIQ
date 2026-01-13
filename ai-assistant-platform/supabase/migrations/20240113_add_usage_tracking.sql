-- Migration: Add Usage Tracking
-- Description: Creates usage_metrics table and increment_usage_metrics function
-- Created: 2024-01-13

-- ============================================================================
-- Usage Metrics Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.usage_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    model VARCHAR(100) NOT NULL,
    prompt_tokens INTEGER NOT NULL DEFAULT 0,
    completion_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER GENERATED ALWAYS AS (prompt_tokens + completion_tokens) STORED,
    estimated_cost DECIMAL(10, 6) NOT NULL DEFAULT 0,
    request_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Unique constraint for daily aggregation per user/model
    CONSTRAINT unique_daily_user_model UNIQUE (tenant_id, user_id, date, model)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_usage_metrics_tenant_date
    ON public.usage_metrics(tenant_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_usage_metrics_user_date
    ON public.usage_metrics(user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_usage_metrics_date
    ON public.usage_metrics(date DESC);

-- Enable Row Level Security
ALTER TABLE public.usage_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only view their own usage metrics
CREATE POLICY "Users can view own usage metrics"
    ON public.usage_metrics
    FOR SELECT
    USING (auth.uid() = user_id);

-- Only server (service role) can insert/update usage metrics
CREATE POLICY "Service role can manage usage metrics"
    ON public.usage_metrics
    FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================================
-- Increment Usage Metrics Function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.increment_usage_metrics(
    p_tenant_id UUID,
    p_user_id UUID,
    p_prompt_tokens INTEGER,
    p_completion_tokens INTEGER,
    p_model VARCHAR(100),
    p_estimated_cost DECIMAL(10, 6)
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Insert or update the usage metrics for today
    INSERT INTO public.usage_metrics (
        tenant_id,
        user_id,
        date,
        model,
        prompt_tokens,
        completion_tokens,
        estimated_cost,
        request_count,
        updated_at
    )
    VALUES (
        p_tenant_id,
        p_user_id,
        CURRENT_DATE,
        p_model,
        p_prompt_tokens,
        p_completion_tokens,
        p_estimated_cost,
        1,
        NOW()
    )
    ON CONFLICT (tenant_id, user_id, date, model)
    DO UPDATE SET
        prompt_tokens = usage_metrics.prompt_tokens + EXCLUDED.prompt_tokens,
        completion_tokens = usage_metrics.completion_tokens + EXCLUDED.completion_tokens,
        estimated_cost = usage_metrics.estimated_cost + EXCLUDED.estimated_cost,
        request_count = usage_metrics.request_count + 1,
        updated_at = NOW();
END;
$$;

-- Grant execute permission to authenticated users (function will check internally)
GRANT EXECUTE ON FUNCTION public.increment_usage_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_usage_metrics TO service_role;

-- ============================================================================
-- Usage Summary View
-- ============================================================================

CREATE OR REPLACE VIEW public.user_usage_summary AS
SELECT
    user_id,
    tenant_id,
    DATE_TRUNC('month', date) AS month,
    SUM(prompt_tokens) AS total_prompt_tokens,
    SUM(completion_tokens) AS total_completion_tokens,
    SUM(prompt_tokens + completion_tokens) AS total_tokens,
    SUM(estimated_cost) AS total_cost,
    SUM(request_count) AS total_requests,
    COUNT(DISTINCT date) AS active_days
FROM public.usage_metrics
GROUP BY user_id, tenant_id, DATE_TRUNC('month', date);

-- ============================================================================
-- Tenant Usage Summary View
-- ============================================================================

CREATE OR REPLACE VIEW public.tenant_usage_summary AS
SELECT
    tenant_id,
    DATE_TRUNC('month', date) AS month,
    SUM(prompt_tokens) AS total_prompt_tokens,
    SUM(completion_tokens) AS total_completion_tokens,
    SUM(prompt_tokens + completion_tokens) AS total_tokens,
    SUM(estimated_cost) AS total_cost,
    SUM(request_count) AS total_requests,
    COUNT(DISTINCT user_id) AS active_users,
    COUNT(DISTINCT date) AS active_days
FROM public.usage_metrics
GROUP BY tenant_id, DATE_TRUNC('month', date);

-- ============================================================================
-- Helper Function: Get User's Daily Usage
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_daily_usage(
    p_user_id UUID,
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    date DATE,
    model VARCHAR(100),
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    total_tokens INTEGER,
    estimated_cost DECIMAL(10, 6),
    request_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Verify the user can only access their own data
    IF p_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    RETURN QUERY
    SELECT
        um.date,
        um.model,
        um.prompt_tokens,
        um.completion_tokens,
        um.total_tokens,
        um.estimated_cost,
        um.request_count
    FROM public.usage_metrics um
    WHERE um.user_id = p_user_id
        AND um.date BETWEEN p_start_date AND p_end_date
    ORDER BY um.date DESC, um.model;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_daily_usage TO authenticated;

-- ============================================================================
-- Helper Function: Get Tenant's Usage Summary
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_tenant_usage_summary(
    p_tenant_id UUID,
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    total_prompt_tokens BIGINT,
    total_completion_tokens BIGINT,
    total_tokens BIGINT,
    total_cost DECIMAL(12, 6),
    total_requests BIGINT,
    active_users BIGINT,
    daily_breakdown JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_tenant_id UUID;
BEGIN
    -- Get the tenant_id of the current user
    SELECT u.tenant_id INTO v_user_tenant_id
    FROM public.users u
    WHERE u.id = auth.uid();

    -- Only allow users to access their own tenant's data
    IF v_user_tenant_id != p_tenant_id THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    RETURN QUERY
    SELECT
        COALESCE(SUM(um.prompt_tokens)::BIGINT, 0),
        COALESCE(SUM(um.completion_tokens)::BIGINT, 0),
        COALESCE(SUM(um.prompt_tokens + um.completion_tokens)::BIGINT, 0),
        COALESCE(SUM(um.estimated_cost), 0)::DECIMAL(12, 6),
        COALESCE(SUM(um.request_count)::BIGINT, 0),
        COUNT(DISTINCT um.user_id)::BIGINT,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'date', um.date,
                    'tokens', um.prompt_tokens + um.completion_tokens,
                    'cost', um.estimated_cost,
                    'requests', um.request_count
                )
                ORDER BY um.date DESC
            ),
            '[]'::JSONB
        )
    FROM public.usage_metrics um
    WHERE um.tenant_id = p_tenant_id
        AND um.date BETWEEN p_start_date AND p_end_date;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_tenant_usage_summary TO authenticated;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE public.usage_metrics IS 'Tracks daily token usage and costs per user and model';
COMMENT ON FUNCTION public.increment_usage_metrics IS 'Atomically increments usage metrics for a user, creating a new record if needed';
COMMENT ON FUNCTION public.get_user_daily_usage IS 'Returns daily usage breakdown for a user within a date range';
COMMENT ON FUNCTION public.get_tenant_usage_summary IS 'Returns aggregated usage summary for a tenant within a date range';
