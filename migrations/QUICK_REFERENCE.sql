-- Quick Reference SQL Queries for AI Assistant Platform
-- Common operations and useful queries for daily use

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check if all tables exist
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('tenants', 'users', 'conversations', 'messages', 'feedback', 'usage_metrics')
ORDER BY table_name;

-- Check RLS is enabled on all tables
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('conversations', 'messages', 'feedback', 'usage_metrics')
ORDER BY tablename;

-- Count RLS policies per table
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('conversations', 'messages', 'feedback', 'usage_metrics')
GROUP BY tablename
ORDER BY tablename;

-- Check all indexes
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('conversations', 'messages', 'feedback', 'usage_metrics')
ORDER BY tablename, indexname;

-- ============================================================================
-- TABLE SIZE AND GROWTH MONITORING
-- ============================================================================

-- Check table sizes
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS index_size
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('conversations', 'messages', 'feedback', 'usage_metrics')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Record counts per table
SELECT
    'conversations' as table_name,
    COUNT(*) as record_count
FROM conversations
UNION ALL
SELECT 'messages', COUNT(*) FROM messages
UNION ALL
SELECT 'feedback', COUNT(*) FROM feedback
UNION ALL
SELECT 'usage_metrics', COUNT(*) FROM usage_metrics
ORDER BY table_name;

-- ============================================================================
-- PERFORMANCE MONITORING
-- ============================================================================

-- Check index usage statistics
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan as times_used,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched,
    CASE
        WHEN idx_scan = 0 THEN 'UNUSED'
        WHEN idx_scan < 100 THEN 'LOW USAGE'
        ELSE 'GOOD'
    END as usage_status
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
AND tablename IN ('conversations', 'messages', 'feedback', 'usage_metrics')
ORDER BY idx_scan DESC;

-- Find slow queries (requires pg_stat_statements extension)
-- SELECT query, calls, mean_exec_time, max_exec_time
-- FROM pg_stat_statements
-- WHERE query LIKE '%conversations%' OR query LIKE '%messages%'
-- ORDER BY mean_exec_time DESC
-- LIMIT 10;

-- ============================================================================
-- DATA INTEGRITY CHECKS
-- ============================================================================

-- Check for orphaned messages (conversation_id not in conversations)
SELECT COUNT(*) as orphaned_messages
FROM messages m
LEFT JOIN conversations c ON m.conversation_id = c.id
WHERE c.id IS NULL;

-- Check for orphaned feedback (message_id not in messages)
SELECT COUNT(*) as orphaned_feedback
FROM feedback f
LEFT JOIN messages m ON f.message_id = m.id
WHERE m.id IS NULL;

-- Check for conversations without messages
SELECT
    c.id,
    c.title,
    c.created_at,
    COUNT(m.id) as message_count
FROM conversations c
LEFT JOIN messages m ON c.conversation_id = m.id
GROUP BY c.id, c.title, c.created_at
HAVING COUNT(m.id) = 0
ORDER BY c.created_at DESC;

-- Verify usage metrics token sum constraint
SELECT *
FROM usage_metrics
WHERE total_tokens != (prompt_tokens + completion_tokens)
LIMIT 10;

-- ============================================================================
-- TENANT STATISTICS
-- ============================================================================

-- Tenant activity summary
SELECT
    t.name as tenant_name,
    COUNT(DISTINCT u.id) as user_count,
    COUNT(DISTINCT c.id) as conversation_count,
    COUNT(DISTINCT m.id) as message_count,
    COUNT(DISTINCT f.id) as feedback_count
FROM tenants t
LEFT JOIN users u ON t.id = u.tenant_id
LEFT JOIN conversations c ON t.id = c.tenant_id
LEFT JOIN messages m ON c.id = m.conversation_id
LEFT JOIN feedback f ON m.id = f.message_id
GROUP BY t.id, t.name
ORDER BY message_count DESC;

-- Most active users by message count
SELECT
    u.name,
    u.email,
    t.name as tenant_name,
    COUNT(DISTINCT c.id) as conversation_count,
    COUNT(DISTINCT m.id) as message_count
FROM users u
JOIN tenants t ON u.tenant_id = t.id
LEFT JOIN conversations c ON u.id = c.user_id
LEFT JOIN messages m ON c.id = m.conversation_id
GROUP BY u.id, u.name, u.email, t.name
ORDER BY message_count DESC
LIMIT 20;

-- ============================================================================
-- USAGE METRICS QUERIES
-- ============================================================================

-- Daily token usage by tenant (last 7 days)
SELECT
    t.name as tenant_name,
    um.date,
    SUM(um.total_tokens) as total_tokens,
    SUM(um.request_count) as request_count,
    SUM(um.estimated_cost) as estimated_cost
FROM usage_metrics um
JOIN tenants t ON um.tenant_id = t.id
WHERE um.date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY t.name, um.date
ORDER BY um.date DESC, total_tokens DESC;

-- Monthly usage summary
SELECT * FROM monthly_usage_summary
WHERE month >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '3 months')
ORDER BY month DESC, total_tokens DESC;

-- Current day usage (for rate limiting checks)
SELECT
    t.name as tenant_name,
    u.name as user_name,
    cdu.total_tokens,
    cdu.request_count,
    t.daily_token_limit,
    ROUND((cdu.total_tokens::DECIMAL / t.daily_token_limit) * 100, 2) as usage_percentage
FROM current_day_usage cdu
JOIN tenants t ON cdu.tenant_id = t.id
LEFT JOIN users u ON cdu.user_id = u.id
ORDER BY usage_percentage DESC;

-- Top token consumers (last 30 days)
SELECT
    t.name as tenant_name,
    u.name as user_name,
    SUM(um.total_tokens) as total_tokens,
    SUM(um.estimated_cost) as total_cost,
    AVG(um.total_tokens) as avg_daily_tokens
FROM usage_metrics um
JOIN tenants t ON um.tenant_id = t.id
LEFT JOIN users u ON um.user_id = u.id
WHERE um.date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY t.name, u.name
ORDER BY total_tokens DESC
LIMIT 20;

-- ============================================================================
-- FEEDBACK ANALYSIS
-- ============================================================================

-- Feedback summary statistics
SELECT
    COUNT(*) as total_feedback,
    COUNT(*) FILTER (WHERE rating = 1) as thumbs_up,
    COUNT(*) FILTER (WHERE rating = -1) as thumbs_down,
    ROUND(AVG(rating), 2) as avg_rating,
    ROUND(COUNT(*) FILTER (WHERE rating = 1) * 100.0 / COUNT(*), 2) as positive_percentage
FROM feedback;

-- Feedback trends over time
SELECT
    DATE(f.created_at) as date,
    COUNT(*) as total_feedback,
    COUNT(*) FILTER (WHERE f.rating = 1) as positive,
    COUNT(*) FILTER (WHERE f.rating = -1) as negative,
    ROUND(AVG(f.rating), 2) as avg_rating
FROM feedback f
WHERE f.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(f.created_at)
ORDER BY date DESC;

-- Messages with best feedback
SELECT
    m.id,
    LEFT(m.content, 100) as content_preview,
    m.model_used,
    mfs.thumbs_up,
    mfs.thumbs_down,
    mfs.avg_rating
FROM message_feedback_summary mfs
JOIN messages m ON mfs.message_id = m.id
WHERE mfs.total_feedback >= 3
ORDER BY mfs.avg_rating DESC, mfs.total_feedback DESC
LIMIT 20;

-- Messages with worst feedback
SELECT
    m.id,
    LEFT(m.content, 100) as content_preview,
    m.model_used,
    mfs.thumbs_up,
    mfs.thumbs_down,
    mfs.avg_rating
FROM message_feedback_summary mfs
JOIN messages m ON mfs.message_id = m.id
WHERE mfs.total_feedback >= 3
ORDER BY mfs.avg_rating ASC, mfs.total_feedback DESC
LIMIT 20;

-- ============================================================================
-- MESSAGE PERFORMANCE ANALYSIS
-- ============================================================================

-- Average latency by model
SELECT
    model_used,
    COUNT(*) as message_count,
    ROUND(AVG(latency_ms), 0) as avg_latency_ms,
    ROUND(MIN(latency_ms), 0) as min_latency_ms,
    ROUND(MAX(latency_ms), 0) as max_latency_ms,
    ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms), 0) as p95_latency_ms
FROM messages
WHERE latency_ms IS NOT NULL
GROUP BY model_used
ORDER BY avg_latency_ms ASC;

-- Average token count by role
SELECT
    role,
    COUNT(*) as message_count,
    ROUND(AVG(token_count), 0) as avg_tokens,
    SUM(token_count) as total_tokens
FROM messages
WHERE token_count IS NOT NULL
GROUP BY role
ORDER BY role;

-- Conversations with highest token usage
SELECT
    c.id,
    c.title,
    t.name as tenant_name,
    COUNT(m.id) as message_count,
    SUM(m.token_count) as total_tokens,
    ROUND(AVG(m.latency_ms), 0) as avg_latency_ms
FROM conversations c
JOIN tenants t ON c.tenant_id = t.id
LEFT JOIN messages m ON c.id = m.conversation_id
GROUP BY c.id, c.title, t.name
HAVING COUNT(m.id) > 0
ORDER BY total_tokens DESC NULLS LAST
LIMIT 20;

-- ============================================================================
-- MAINTENANCE OPERATIONS
-- ============================================================================

-- Refresh materialized views (run daily)
REFRESH MATERIALIZED VIEW CONCURRENTLY message_feedback_summary;
REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_usage_summary;

-- Vacuum and analyze tables (run weekly)
VACUUM ANALYZE public.conversations;
VACUUM ANALYZE public.messages;
VACUUM ANALYZE public.feedback;
VACUUM ANALYZE public.usage_metrics;

-- Update table statistics
ANALYZE public.conversations;
ANALYZE public.messages;
ANALYZE public.feedback;
ANALYZE public.usage_metrics;

-- ============================================================================
-- CLEANUP OPERATIONS
-- ============================================================================

-- Archive old conversations (older than 6 months)
UPDATE conversations
SET is_archived = true
WHERE updated_at < CURRENT_DATE - INTERVAL '6 months'
AND is_archived = false;

-- Delete test data
DELETE FROM tenants WHERE slug LIKE 'test-%';

-- ============================================================================
-- COMMON CRUD OPERATIONS
-- ============================================================================

-- Create a conversation
INSERT INTO conversations (tenant_id, user_id, title, metadata)
VALUES (
    'tenant-uuid',
    'user-uuid',
    'New Conversation',
    '{"tags": ["example"], "category": "general"}'::jsonb
)
RETURNING *;

-- Add a message to conversation
INSERT INTO messages (conversation_id, role, content, token_count, model_used, latency_ms)
VALUES (
    'conversation-uuid',
    'user',
    'Hello, how can you help me?',
    10,
    NULL,
    NULL
)
RETURNING *;

-- Add assistant response
INSERT INTO messages (conversation_id, role, content, token_count, model_used, latency_ms)
VALUES (
    'conversation-uuid',
    'assistant',
    'I can help you with various tasks...',
    150,
    'gpt-4',
    1250
)
RETURNING *;

-- Add feedback to a message
INSERT INTO feedback (message_id, user_id, rating, comment)
VALUES (
    'message-uuid',
    'user-uuid',
    1,
    'Very helpful response!'
)
ON CONFLICT (message_id, user_id)
DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment
RETURNING *;

-- Increment usage metrics
SELECT increment_usage_metrics(
    'tenant-uuid'::UUID,
    'user-uuid'::UUID,
    CURRENT_DATE,
    100,  -- prompt_tokens
    200,  -- completion_tokens
    0.015 -- estimated_cost
);

-- ============================================================================
-- DEBUGGING QUERIES
-- ============================================================================

-- Check active database connections
SELECT
    datname,
    usename,
    application_name,
    client_addr,
    state,
    query,
    query_start
FROM pg_stat_activity
WHERE datname = current_database()
ORDER BY query_start DESC;

-- Check for locks
SELECT
    pg_class.relname,
    pg_locks.locktype,
    pg_locks.mode,
    pg_locks.granted,
    pg_stat_activity.query
FROM pg_locks
JOIN pg_class ON pg_locks.relation = pg_class.oid
JOIN pg_stat_activity ON pg_locks.pid = pg_stat_activity.pid
WHERE pg_class.relname IN ('conversations', 'messages', 'feedback', 'usage_metrics');

-- Check RLS policy definitions
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('conversations', 'messages', 'feedback', 'usage_metrics')
ORDER BY tablename, policyname;

-- ============================================================================
-- EXPORT QUERIES (for reporting/analytics)
-- ============================================================================

-- Export conversation data for analysis
SELECT
    c.id as conversation_id,
    c.title,
    c.created_at,
    c.updated_at,
    c.is_archived,
    t.name as tenant_name,
    u.name as user_name,
    COUNT(m.id) as message_count,
    SUM(m.token_count) as total_tokens,
    AVG(m.latency_ms) as avg_latency,
    COUNT(f.id) as feedback_count,
    AVG(f.rating) as avg_feedback_rating
FROM conversations c
JOIN tenants t ON c.tenant_id = t.id
JOIN users u ON c.user_id = u.id
LEFT JOIN messages m ON c.id = m.conversation_id
LEFT JOIN feedback f ON m.id = f.message_id
GROUP BY c.id, c.title, c.created_at, c.updated_at, c.is_archived, t.name, u.name
ORDER BY c.created_at DESC;

-- Export usage metrics for billing
SELECT
    t.name as tenant_name,
    um.date,
    um.user_id,
    u.name as user_name,
    um.total_tokens,
    um.prompt_tokens,
    um.completion_tokens,
    um.request_count,
    um.estimated_cost
FROM usage_metrics um
JOIN tenants t ON um.tenant_id = t.id
LEFT JOIN users u ON um.user_id = u.id
WHERE um.date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
ORDER BY t.name, um.date DESC;

-- ============================================================================
-- NOTES
-- ============================================================================

/*
Usage Tips:
1. Always run SELECT queries before UPDATE/DELETE operations
2. Use EXPLAIN ANALYZE to check query performance
3. Refresh materialized views daily for accurate analytics
4. Monitor table sizes and index usage regularly
5. Test RLS policies with different user contexts
6. Use transactions for multi-step operations
7. Always have backups before running cleanup operations

Performance Tips:
- Use indexes for WHERE clauses
- Avoid SELECT * in production queries
- Use LIMIT for large result sets
- Use materialized views for expensive aggregations
- Monitor slow query log

Security Tips:
- Never disable RLS in production
- Use service role key only for admin operations
- Validate user context before queries
- Audit access patterns regularly
*/
