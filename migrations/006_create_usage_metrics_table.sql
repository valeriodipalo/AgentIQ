-- Migration: Create usage_metrics table
-- Description: Track token usage and costs per tenant/user for billing and analytics

-- Create usage_metrics table
CREATE TABLE IF NOT EXISTS public.usage_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID,
    date DATE NOT NULL,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    prompt_tokens INTEGER NOT NULL DEFAULT 0,
    completion_tokens INTEGER NOT NULL DEFAULT 0,
    request_count INTEGER NOT NULL DEFAULT 0,
    estimated_cost DECIMAL(10, 4) NOT NULL DEFAULT 0.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Foreign key constraints
    CONSTRAINT fk_usage_metrics_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES public.tenants(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_usage_metrics_user
        FOREIGN KEY (user_id)
        REFERENCES public.users(id)
        ON DELETE SET NULL,

    -- Validation constraints
    CONSTRAINT check_total_tokens_positive CHECK (total_tokens >= 0),
    CONSTRAINT check_prompt_tokens_positive CHECK (prompt_tokens >= 0),
    CONSTRAINT check_completion_tokens_positive CHECK (completion_tokens >= 0),
    CONSTRAINT check_request_count_positive CHECK (request_count >= 0),
    CONSTRAINT check_cost_positive CHECK (estimated_cost >= 0),
    CONSTRAINT check_tokens_sum CHECK (total_tokens = prompt_tokens + completion_tokens),

    -- Ensure one record per tenant/user/date combination
    CONSTRAINT uq_usage_metrics_tenant_user_date UNIQUE (tenant_id, user_id, date)
);

-- Create indexes for performance optimization
CREATE INDEX idx_usage_metrics_tenant_id ON public.usage_metrics(tenant_id);
CREATE INDEX idx_usage_metrics_user_id ON public.usage_metrics(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_usage_metrics_date ON public.usage_metrics(date DESC);
CREATE INDEX idx_usage_metrics_tenant_date ON public.usage_metrics(tenant_id, date DESC);
CREATE INDEX idx_usage_metrics_user_date ON public.usage_metrics(user_id, date DESC) WHERE user_id IS NOT NULL;
CREATE INDEX idx_usage_metrics_created_at ON public.usage_metrics(created_at DESC);

-- Create composite index for common queries
CREATE INDEX idx_usage_metrics_tenant_user_date ON public.usage_metrics(tenant_id, user_id, date DESC);

-- Enable Row Level Security
ALTER TABLE public.usage_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view usage metrics from their tenant
CREATE POLICY "Users can view usage metrics from their tenant"
    ON public.usage_metrics
    FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id
            FROM public.users
            WHERE auth_id = auth.uid()
            AND is_active = true
        )
    );

-- RLS Policy: System can insert usage metrics (for background jobs)
CREATE POLICY "System can insert usage metrics"
    ON public.usage_metrics
    FOR INSERT
    WITH CHECK (true);

-- RLS Policy: System can update usage metrics (for background jobs)
CREATE POLICY "System can update usage metrics"
    ON public.usage_metrics
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Create function to aggregate daily usage
CREATE OR REPLACE FUNCTION increment_usage_metrics(
    p_tenant_id UUID,
    p_user_id UUID,
    p_date DATE,
    p_prompt_tokens INTEGER,
    p_completion_tokens INTEGER,
    p_estimated_cost DECIMAL
)
RETURNS void AS $$
BEGIN
    INSERT INTO public.usage_metrics (
        tenant_id,
        user_id,
        date,
        total_tokens,
        prompt_tokens,
        completion_tokens,
        request_count,
        estimated_cost
    ) VALUES (
        p_tenant_id,
        p_user_id,
        p_date,
        p_prompt_tokens + p_completion_tokens,
        p_prompt_tokens,
        p_completion_tokens,
        1,
        p_estimated_cost
    )
    ON CONFLICT (tenant_id, user_id, date)
    DO UPDATE SET
        total_tokens = usage_metrics.total_tokens + p_prompt_tokens + p_completion_tokens,
        prompt_tokens = usage_metrics.prompt_tokens + p_prompt_tokens,
        completion_tokens = usage_metrics.completion_tokens + p_completion_tokens,
        request_count = usage_metrics.request_count + 1,
        estimated_cost = usage_metrics.estimated_cost + p_estimated_cost;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create materialized view for monthly usage summary
CREATE MATERIALIZED VIEW IF NOT EXISTS public.monthly_usage_summary AS
SELECT
    tenant_id,
    user_id,
    DATE_TRUNC('month', date) as month,
    SUM(total_tokens) as total_tokens,
    SUM(prompt_tokens) as prompt_tokens,
    SUM(completion_tokens) as completion_tokens,
    SUM(request_count) as request_count,
    SUM(estimated_cost) as estimated_cost,
    COUNT(DISTINCT date) as active_days
FROM public.usage_metrics
GROUP BY tenant_id, user_id, DATE_TRUNC('month', date);

-- Create indexes on materialized view
CREATE INDEX idx_monthly_usage_summary_tenant ON public.monthly_usage_summary(tenant_id);
CREATE INDEX idx_monthly_usage_summary_user ON public.monthly_usage_summary(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_monthly_usage_summary_month ON public.monthly_usage_summary(month DESC);
CREATE INDEX idx_monthly_usage_summary_tenant_month ON public.monthly_usage_summary(tenant_id, month DESC);

-- Create view for current day usage (for rate limiting checks)
CREATE OR REPLACE VIEW public.current_day_usage AS
SELECT
    tenant_id,
    user_id,
    date,
    total_tokens,
    request_count
FROM public.usage_metrics
WHERE date = CURRENT_DATE;

-- Add comments for documentation
COMMENT ON TABLE public.usage_metrics IS 'Tracks token usage and costs per tenant/user for billing and analytics';
COMMENT ON COLUMN public.usage_metrics.id IS 'Unique usage metric identifier';
COMMENT ON COLUMN public.usage_metrics.tenant_id IS 'Reference to the tenant';
COMMENT ON COLUMN public.usage_metrics.user_id IS 'Reference to the user (NULL for tenant-level aggregates)';
COMMENT ON COLUMN public.usage_metrics.date IS 'Date of usage (one record per tenant/user/date)';
COMMENT ON COLUMN public.usage_metrics.total_tokens IS 'Total tokens used (prompt + completion)';
COMMENT ON COLUMN public.usage_metrics.prompt_tokens IS 'Tokens in prompts';
COMMENT ON COLUMN public.usage_metrics.completion_tokens IS 'Tokens in completions';
COMMENT ON COLUMN public.usage_metrics.request_count IS 'Number of API requests';
COMMENT ON COLUMN public.usage_metrics.estimated_cost IS 'Estimated cost in USD';
COMMENT ON FUNCTION increment_usage_metrics IS 'Atomically increment usage metrics for a given tenant/user/date';
COMMENT ON MATERIALIZED VIEW public.monthly_usage_summary IS 'Aggregated monthly usage statistics';
COMMENT ON VIEW public.current_day_usage IS 'Current day usage for rate limiting checks';
