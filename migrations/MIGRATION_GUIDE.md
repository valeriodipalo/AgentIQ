# Migration Execution Guide

## Overview
This guide provides step-by-step instructions for applying and rolling back database migrations for the AI Assistant Platform.

## Prerequisites
- Supabase project URL: https://lcflejsnwhvmpkkzkuqp.supabase.co
- Supabase service role key or database credentials
- Claude Desktop with Supabase MCP tools configured

## Migration Files

### Deployment Order
1. **003_create_conversations_table.sql** - Base conversations table
2. **004_create_messages_table.sql** - Messages table (depends on conversations)
3. **005_create_feedback_table.sql** - Feedback table (depends on messages)
4. **006_create_usage_metrics_table.sql** - Usage tracking (independent)

## Applying Migrations

### Using Supabase MCP Tools (Recommended)

You can apply migrations using the MCP tools through Claude Desktop. The MCP tool will handle:
- Reading the migration file
- Applying it to the database
- Tracking migration history

Example command structure:
```
Apply migration 003_create_conversations_table.sql to the database
```

### Using Supabase Dashboard

1. Log in to Supabase Dashboard: https://app.supabase.com
2. Navigate to SQL Editor
3. Copy contents of migration file
4. Execute the SQL
5. Verify tables were created in Table Editor

### Using Supabase CLI

```bash
# Initialize Supabase (if not already done)
supabase init

# Link to your project
supabase link --project-ref lcflejsnwhvmpkkzkuqp

# Apply migrations in order
supabase db push

# Or apply individual migration
psql $DATABASE_URL -f migrations/003_create_conversations_table.sql
```

## Verification Steps

After each migration, verify the changes:

### 1. Check Tables Were Created
```sql
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('conversations', 'messages', 'feedback', 'usage_metrics')
ORDER BY table_name;
```

Expected output:
```
table_name       | table_type
-----------------|-----------
conversations    | BASE TABLE
feedback         | BASE TABLE
messages         | BASE TABLE
usage_metrics    | BASE TABLE
```

### 2. Check Indexes
```sql
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('conversations', 'messages', 'feedback', 'usage_metrics')
ORDER BY tablename, indexname;
```

### 3. Check RLS Policies
```sql
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('conversations', 'messages', 'feedback', 'usage_metrics')
ORDER BY tablename, policyname;
```

Expected: 4 policies per table (SELECT, INSERT, UPDATE, DELETE)

### 4. Check Foreign Keys
```sql
SELECT
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
AND tc.table_name IN ('conversations', 'messages', 'feedback', 'usage_metrics')
ORDER BY tc.table_name;
```

### 5. Check Materialized Views
```sql
SELECT schemaname, matviewname, definition
FROM pg_matviews
WHERE schemaname = 'public'
AND matviewname IN ('message_feedback_summary', 'monthly_usage_summary');
```

### 6. Test RLS Policies

Create a test user and verify tenant isolation:

```sql
-- Create test tenant and user (as service role)
INSERT INTO public.tenants (id, name, slug)
VALUES ('test-tenant-1', 'Test Tenant 1', 'test-tenant-1');

INSERT INTO public.users (id, tenant_id, email, name, role)
VALUES ('test-user-1', 'test-tenant-1', 'test@example.com', 'Test User', 'user');

-- Test conversation creation
INSERT INTO public.conversations (tenant_id, user_id, title)
VALUES ('test-tenant-1', 'test-user-1', 'Test Conversation');

-- Verify RLS works (should only see own tenant's data)
SELECT * FROM public.conversations; -- Should only return test-tenant-1 conversations
```

### 7. Performance Testing

Test query performance with EXPLAIN ANALYZE:

```sql
-- Test conversation query performance
EXPLAIN ANALYZE
SELECT * FROM conversations
WHERE tenant_id = 'test-tenant-1'
AND is_archived = false
ORDER BY updated_at DESC
LIMIT 20;

-- Verify index is used (should see "Index Scan" in plan)

-- Test message query performance
EXPLAIN ANALYZE
SELECT * FROM messages
WHERE conversation_id = 'some-conversation-id'
ORDER BY created_at ASC;

-- Should use idx_messages_conversation_created
```

## Rollback Procedures

### Migration 006 - usage_metrics Rollback
```sql
BEGIN;

DROP VIEW IF EXISTS public.current_day_usage;
DROP MATERIALIZED VIEW IF EXISTS public.monthly_usage_summary CASCADE;
DROP FUNCTION IF EXISTS public.increment_usage_metrics(UUID, UUID, DATE, INTEGER, INTEGER, DECIMAL);
DROP TABLE IF EXISTS public.usage_metrics CASCADE;

COMMIT;
```

### Migration 005 - feedback Rollback
```sql
BEGIN;

DROP MATERIALIZED VIEW IF EXISTS public.message_feedback_summary CASCADE;
DROP TABLE IF EXISTS public.feedback CASCADE;

COMMIT;
```

### Migration 004 - messages Rollback
```sql
BEGIN;

DROP TRIGGER IF EXISTS trigger_messages_update_conversation ON public.messages;
DROP FUNCTION IF EXISTS public.update_conversation_timestamp();
DROP TABLE IF EXISTS public.messages CASCADE;

COMMIT;
```

### Migration 003 - conversations Rollback
```sql
BEGIN;

DROP TRIGGER IF EXISTS trigger_conversations_updated_at ON public.conversations;
DROP FUNCTION IF EXISTS public.update_updated_at_column();
DROP TABLE IF EXISTS public.conversations CASCADE;

COMMIT;
```

### Complete Rollback (All Tables)
```sql
BEGIN;

-- Rollback in reverse order
DROP VIEW IF EXISTS public.current_day_usage;
DROP MATERIALIZED VIEW IF EXISTS public.monthly_usage_summary CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.message_feedback_summary CASCADE;
DROP FUNCTION IF EXISTS public.increment_usage_metrics(UUID, UUID, DATE, INTEGER, INTEGER, DECIMAL);
DROP FUNCTION IF EXISTS public.update_conversation_timestamp();
DROP FUNCTION IF EXISTS public.update_updated_at_column();
DROP TABLE IF EXISTS public.usage_metrics CASCADE;
DROP TABLE IF EXISTS public.feedback CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;

COMMIT;
```

## Post-Migration Tasks

### 1. Refresh Materialized Views
```sql
REFRESH MATERIALIZED VIEW public.message_feedback_summary;
REFRESH MATERIALIZED VIEW public.monthly_usage_summary;
```

### 2. Update Statistics
```sql
ANALYZE public.conversations;
ANALYZE public.messages;
ANALYZE public.feedback;
ANALYZE public.usage_metrics;
```

### 3. Regenerate TypeScript Types

If using Supabase CLI:
```bash
supabase gen types typescript --project-id lcflejsnwhvmpkkzkuqp > database.types.ts
```

Or use the provided `database.types.ts` file in this directory.

### 4. Update Application Code

Update your application to use the new tables:

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from './migrations/database.types';

const supabase = createClient<Database>(
  'https://lcflejsnwhvmpkkzkuqp.supabase.co',
  'YOUR_ANON_KEY'
);

// Create a conversation
const { data: conversation, error } = await supabase
  .from('conversations')
  .insert({
    tenant_id: 'tenant-uuid',
    user_id: 'user-uuid',
    title: 'New Chat',
  })
  .select()
  .single();

// Add a message
const { data: message, error: msgError } = await supabase
  .from('messages')
  .insert({
    conversation_id: conversation.id,
    role: 'user',
    content: 'Hello!',
  })
  .select()
  .single();
```

### 5. Set Up Monitoring

Create monitoring queries for key metrics:

```sql
-- Daily active users
SELECT
    date,
    COUNT(DISTINCT user_id) as active_users
FROM usage_metrics
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY date
ORDER BY date DESC;

-- Feedback sentiment over time
SELECT
    DATE(f.created_at) as date,
    COUNT(*) FILTER (WHERE rating = 1) as positive,
    COUNT(*) FILTER (WHERE rating = -1) as negative,
    ROUND(AVG(rating), 2) as avg_rating
FROM feedback f
WHERE f.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(f.created_at)
ORDER BY date DESC;

-- Token usage by tenant
SELECT
    t.name as tenant_name,
    SUM(um.total_tokens) as total_tokens,
    SUM(um.estimated_cost) as total_cost
FROM usage_metrics um
JOIN tenants t ON um.tenant_id = t.id
WHERE um.date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY t.name
ORDER BY total_tokens DESC;
```

## Troubleshooting

### Issue: Migration Fails with "Relation Already Exists"
**Solution**: Table already exists. Either skip migration or drop table first.
```sql
DROP TABLE IF EXISTS public.conversations CASCADE;
```

### Issue: RLS Policies Not Working
**Solution**: Verify RLS is enabled and policies are created:
```sql
-- Check RLS is enabled
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname IN ('conversations', 'messages', 'feedback', 'usage_metrics');

-- Should show relrowsecurity = true for all tables
```

### Issue: Foreign Key Violations
**Solution**: Ensure parent tables exist and have required records:
```sql
-- Check if tenants and users tables exist
SELECT * FROM information_schema.tables
WHERE table_name IN ('tenants', 'users');

-- Verify test data
SELECT * FROM tenants LIMIT 1;
SELECT * FROM users LIMIT 1;
```

### Issue: Slow Query Performance
**Solution**: Verify indexes are created:
```sql
-- Check indexes
\d+ conversations
\d+ messages

-- Rebuild indexes if needed
REINDEX TABLE conversations;
REINDEX TABLE messages;
```

### Issue: Materialized View Out of Date
**Solution**: Refresh materialized views:
```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY message_feedback_summary;
REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_usage_summary;
```

## Scheduled Maintenance

Set up these recurring tasks:

### Daily Tasks
```sql
-- Refresh materialized views
REFRESH MATERIALIZED VIEW CONCURRENTLY message_feedback_summary;
REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_usage_summary;

-- Update table statistics
ANALYZE public.messages;
ANALYZE public.usage_metrics;
```

### Weekly Tasks
```sql
-- Vacuum tables to reclaim space
VACUUM ANALYZE public.conversations;
VACUUM ANALYZE public.messages;
VACUUM ANALYZE public.feedback;
VACUUM ANALYZE public.usage_metrics;

-- Check table sizes
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS index_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Monthly Tasks
```sql
-- Archive old conversations (if needed)
UPDATE conversations
SET is_archived = true
WHERE updated_at < CURRENT_DATE - INTERVAL '6 months'
AND is_archived = false;

-- Export old usage metrics to data warehouse
-- (Implementation depends on your data warehouse setup)
```

## Support

For issues or questions:
1. Check Supabase logs: https://app.supabase.com/project/lcflejsnwhvmpkkzkuqp/logs
2. Review schema documentation: See SCHEMA_DOCUMENTATION.md
3. Test RLS policies in SQL Editor with different user contexts

