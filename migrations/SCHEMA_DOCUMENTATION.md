# Database Schema Documentation

## Overview
This document provides comprehensive documentation for the AI Assistant Platform database schema, including table relationships, RLS policies, and usage patterns.

## Schema Architecture

### Entity Relationship Diagram
```
tenants (1) ----< (M) users
tenants (1) ----< (M) conversations
tenants (1) ----< (M) usage_metrics

users (1) ----< (M) conversations
users (1) ----< (M) feedback
users (1) ----< (M) usage_metrics

conversations (1) ----< (M) messages

messages (1) ----< (M) feedback
```

## Table Specifications

### 1. conversations
**Purpose**: Store chat conversations for the AI assistant platform

**Columns**:
- `id` (UUID, PK): Unique conversation identifier
- `tenant_id` (UUID, FK): Reference to tenants table
- `user_id` (UUID, FK): Reference to users table
- `title` (TEXT): Conversation title (max 500 characters)
- `metadata` (JSONB): Additional metadata (tags, categories, etc.)
- `is_archived` (BOOLEAN): Whether the conversation is archived
- `created_at` (TIMESTAMPTZ): Creation timestamp
- `updated_at` (TIMESTAMPTZ): Last update timestamp (auto-updated)

**Indexes**:
- `idx_conversations_tenant_id`: Query by tenant
- `idx_conversations_user_id`: Query by user
- `idx_conversations_tenant_user`: Composite index for tenant+user queries
- `idx_conversations_created_at`: Sort by creation date
- `idx_conversations_archived`: Filter active conversations
- `idx_conversations_tenant_archived`: Composite for tenant+archived queries

**Foreign Keys**:
- `tenant_id` → `tenants(id)` ON DELETE CASCADE
- `user_id` → `users(id)` ON DELETE CASCADE

**Triggers**:
- `trigger_conversations_updated_at`: Auto-update `updated_at` on row update

**RLS Policies**:
- SELECT: Users can view conversations from their tenant
- INSERT: Users can create conversations in their tenant
- UPDATE: Users can update their own conversations
- DELETE: Users can delete their own conversations

**Query Patterns**:
```sql
-- Get all active conversations for a user
SELECT * FROM conversations
WHERE user_id = ? AND is_archived = false
ORDER BY updated_at DESC;

-- Get conversations by tenant with pagination
SELECT * FROM conversations
WHERE tenant_id = ?
ORDER BY created_at DESC
LIMIT 20 OFFSET ?;
```

---

### 2. messages
**Purpose**: Store individual messages in conversations with performance metrics

**Columns**:
- `id` (UUID, PK): Unique message identifier
- `conversation_id` (UUID, FK): Reference to conversations table
- `role` (TEXT): Message role (user/assistant/system)
- `content` (TEXT): Message content
- `token_count` (INTEGER): Number of tokens used
- `model_used` (TEXT): LLM model used to generate response
- `latency_ms` (INTEGER): Response latency in milliseconds
- `metadata` (JSONB): Additional metadata (function calls, citations, etc.)
- `created_at` (TIMESTAMPTZ): Creation timestamp

**Indexes**:
- `idx_messages_conversation_id`: Query messages by conversation
- `idx_messages_created_at`: Sort by creation date
- `idx_messages_conversation_created`: Composite for conversation+date queries
- `idx_messages_role`: Filter by role
- `idx_messages_model_used`: Analytics by model (partial index)
- `idx_messages_token_count`: Analytics on token usage (partial index)

**Foreign Keys**:
- `conversation_id` → `conversations(id)` ON DELETE CASCADE

**Constraints**:
- `check_role_valid`: role must be 'user', 'assistant', or 'system'
- `check_content_not_empty`: content must not be empty
- `check_token_count_positive`: token_count >= 0 (if not null)
- `check_latency_positive`: latency_ms >= 0 (if not null)

**Triggers**:
- `trigger_messages_update_conversation`: Auto-update parent conversation's `updated_at`

**RLS Policies**:
- SELECT: Users can view messages from their tenant's conversations
- INSERT: Users can create messages in their tenant's conversations
- UPDATE: Users can update messages in their own conversations
- DELETE: Users can delete messages in their own conversations

**Query Patterns**:
```sql
-- Get all messages in a conversation (ordered chronologically)
SELECT * FROM messages
WHERE conversation_id = ?
ORDER BY created_at ASC;

-- Calculate average latency by model
SELECT model_used, AVG(latency_ms) as avg_latency
FROM messages
WHERE model_used IS NOT NULL
GROUP BY model_used;
```

---

### 3. feedback
**Purpose**: Store user feedback (thumbs up/down) on AI assistant messages

**Columns**:
- `id` (UUID, PK): Unique feedback identifier
- `message_id` (UUID, FK): Reference to messages table
- `user_id` (UUID, FK): Reference to users table
- `rating` (SMALLINT): Rating (1 for thumbs up, -1 for thumbs down)
- `comment` (TEXT): Optional text comment (max 5000 characters)
- `created_at` (TIMESTAMPTZ): Creation timestamp

**Indexes**:
- `idx_feedback_message_id`: Query feedback by message
- `idx_feedback_user_id`: Query feedback by user
- `idx_feedback_rating`: Filter by rating
- `idx_feedback_created_at`: Sort by creation date
- `idx_feedback_message_rating`: Composite for analytics queries

**Foreign Keys**:
- `message_id` → `messages(id)` ON DELETE CASCADE
- `user_id` → `users(id)` ON DELETE CASCADE

**Constraints**:
- `check_rating_valid`: rating must be -1 or 1
- `check_comment_length`: comment max 5000 characters
- `uq_feedback_message_user`: One feedback per user per message (UNIQUE)

**Materialized View**: `message_feedback_summary`
- Aggregates feedback statistics per message (thumbs up/down counts, average rating)
- Refresh strategy: Manual or scheduled refresh

**RLS Policies**:
- SELECT: Users can view feedback from their tenant
- INSERT: Users can create feedback in their tenant
- UPDATE: Users can update their own feedback
- DELETE: Users can delete their own feedback

**Query Patterns**:
```sql
-- Get feedback for a specific message
SELECT * FROM feedback WHERE message_id = ?;

-- Get user's feedback history
SELECT f.*, m.content
FROM feedback f
JOIN messages m ON f.message_id = m.id
WHERE f.user_id = ?
ORDER BY f.created_at DESC;

-- Refresh materialized view
REFRESH MATERIALIZED VIEW message_feedback_summary;
```

---

### 4. usage_metrics
**Purpose**: Track token usage and costs per tenant/user for billing and analytics

**Columns**:
- `id` (UUID, PK): Unique usage metric identifier
- `tenant_id` (UUID, FK): Reference to tenants table
- `user_id` (UUID, FK): Reference to users table (nullable for tenant-level aggregates)
- `date` (DATE): Date of usage
- `total_tokens` (INTEGER): Total tokens (prompt + completion)
- `prompt_tokens` (INTEGER): Tokens in prompts
- `completion_tokens` (INTEGER): Tokens in completions
- `request_count` (INTEGER): Number of API requests
- `estimated_cost` (DECIMAL(10,4)): Estimated cost in USD
- `created_at` (TIMESTAMPTZ): Creation timestamp

**Indexes**:
- `idx_usage_metrics_tenant_id`: Query by tenant
- `idx_usage_metrics_user_id`: Query by user (partial index)
- `idx_usage_metrics_date`: Sort by date
- `idx_usage_metrics_tenant_date`: Composite for tenant+date queries
- `idx_usage_metrics_user_date`: Composite for user+date queries (partial)
- `idx_usage_metrics_created_at`: Sort by creation
- `idx_usage_metrics_tenant_user_date`: Composite for all dimensions

**Foreign Keys**:
- `tenant_id` → `tenants(id)` ON DELETE CASCADE
- `user_id` → `users(id)` ON DELETE SET NULL

**Constraints**:
- `check_total_tokens_positive`: total_tokens >= 0
- `check_prompt_tokens_positive`: prompt_tokens >= 0
- `check_completion_tokens_positive`: completion_tokens >= 0
- `check_request_count_positive`: request_count >= 0
- `check_cost_positive`: estimated_cost >= 0
- `check_tokens_sum`: total_tokens = prompt_tokens + completion_tokens
- `uq_usage_metrics_tenant_user_date`: One record per tenant/user/date (UNIQUE)

**Helper Functions**:
- `increment_usage_metrics()`: Atomically increment usage for a given tenant/user/date
  - Uses INSERT ... ON CONFLICT to handle concurrent updates safely

**Materialized View**: `monthly_usage_summary`
- Aggregates usage by month for billing and reporting
- Includes active_days count

**View**: `current_day_usage`
- Real-time view of today's usage (for rate limiting checks)

**RLS Policies**:
- SELECT: Users can view usage metrics from their tenant
- INSERT: System can insert (for background jobs)
- UPDATE: System can update (for background jobs)

**Query Patterns**:
```sql
-- Increment usage atomically
SELECT increment_usage_metrics(
    'tenant_id'::UUID,
    'user_id'::UUID,
    CURRENT_DATE,
    100, -- prompt_tokens
    200, -- completion_tokens
    0.0045 -- estimated_cost
);

-- Get tenant usage for current month
SELECT * FROM monthly_usage_summary
WHERE tenant_id = ?
AND month = DATE_TRUNC('month', CURRENT_DATE);

-- Check rate limit
SELECT total_tokens, request_count
FROM current_day_usage
WHERE tenant_id = ? AND user_id = ?;
```

---

## Row Level Security (RLS) Strategy

### Tenant Isolation Pattern
All tables implement tenant-based isolation through RLS policies that:
1. Verify the requesting user's `auth_id` matches `auth.uid()`
2. Check that the user is active (`is_active = true`)
3. Ensure data access is limited to the user's tenant

### Policy Performance Optimization
- Policies use indexed columns (`tenant_id`, `user_id`, `auth_id`)
- Subqueries are optimized to use primary key lookups
- Active user checks prevent deactivated accounts from accessing data

### Admin Override Considerations
For admin operations (e.g., background jobs, data exports):
- Use service role key (bypasses RLS)
- Or create specific admin policies with role-based checks

---

## Migration Strategy

### Deployment Order
1. `003_create_conversations_table.sql`
2. `004_create_messages_table.sql` (depends on conversations)
3. `005_create_feedback_table.sql` (depends on messages)
4. `006_create_usage_metrics_table.sql` (independent)

### Rollback Plan
Each migration should have a corresponding rollback script:

```sql
-- Rollback 006
DROP VIEW IF EXISTS current_day_usage;
DROP MATERIALIZED VIEW IF EXISTS monthly_usage_summary;
DROP FUNCTION IF EXISTS increment_usage_metrics;
DROP TABLE IF EXISTS public.usage_metrics;

-- Rollback 005
DROP MATERIALIZED VIEW IF EXISTS message_feedback_summary;
DROP TABLE IF EXISTS public.feedback;

-- Rollback 004
DROP FUNCTION IF EXISTS update_conversation_timestamp;
DROP TABLE IF EXISTS public.messages;

-- Rollback 003
DROP FUNCTION IF EXISTS update_updated_at_column;
DROP TABLE IF EXISTS public.conversations;
```

### Testing Checklist
- [ ] All foreign key constraints work correctly
- [ ] RLS policies prevent cross-tenant data access
- [ ] Indexes improve query performance (use EXPLAIN ANALYZE)
- [ ] Triggers fire correctly (test updated_at, conversation timestamp)
- [ ] Constraints validate data (test invalid roles, negative values)
- [ ] Materialized views can be refreshed successfully
- [ ] Helper functions work with concurrent access

---

## Performance Considerations

### Query Optimization
- Use composite indexes for common query patterns
- Leverage partial indexes for filtered queries
- Consider BRIN indexes for time-series data (created_at columns)

### Maintenance Tasks
```sql
-- Refresh materialized views (schedule daily)
REFRESH MATERIALIZED VIEW CONCURRENTLY message_feedback_summary;
REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_usage_summary;

-- Vacuum and analyze (schedule weekly)
VACUUM ANALYZE public.conversations;
VACUUM ANALYZE public.messages;
VACUUM ANALYZE public.feedback;
VACUUM ANALYZE public.usage_metrics;

-- Monitor table bloat
SELECT schemaname, tablename,
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Estimated Storage Requirements
- **messages**: ~1KB per message (varies by content length)
- **conversations**: ~500 bytes per conversation
- **feedback**: ~200 bytes per feedback entry
- **usage_metrics**: ~150 bytes per daily record

For 1000 active users:
- 100 conversations/user/month: ~50MB
- 50 messages/conversation: ~5GB/month
- 10% feedback rate: ~100MB/month
- Daily usage metrics: ~5MB/month

---

## Security Best Practices

### Data Encryption
- Enable encryption at rest in Supabase project settings
- Use SSL/TLS for all database connections
- Store sensitive data (API keys, credentials) in Vault, not in database

### Audit Logging
Consider adding an audit log table:
```sql
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID,
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL, -- INSERT, UPDATE, DELETE
    row_id UUID NOT NULL,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Backup Strategy
- Daily automated backups (Supabase handles this)
- Test restore procedures quarterly
- Export critical data to external storage monthly

---

## TypeScript Integration

See `database.types.ts` for generated TypeScript types that match this schema.

Usage example:
```typescript
import { Database } from './database.types';

type Conversation = Database['public']['Tables']['conversations']['Row'];
type Message = Database['public']['Tables']['messages']['Insert'];
```

---

## Monitoring and Alerts

### Key Metrics to Track
1. **Performance**:
   - Average query response time per table
   - Slow query log (queries > 1 second)
   - Index usage statistics

2. **Usage**:
   - Daily token consumption per tenant
   - Request rate per tenant/user
   - Storage growth rate

3. **Quality**:
   - Feedback rating distribution
   - Average message latency
   - Error rate in message generation

### Alert Thresholds
- Query response time > 100ms for 95th percentile
- Daily token usage > tenant limit
- Table size growth > 50% week-over-week
- RLS policy violations (should be zero)

---

## Future Enhancements

### Potential Additions
1. **Full-text search**: Add GIN index on `messages.content` for semantic search
2. **Partitioning**: Partition `messages` and `usage_metrics` by date for better performance
3. **Archival**: Move old conversations to cold storage after 6 months
4. **Analytics**: Add pre-computed aggregation tables for dashboard queries
5. **Real-time**: Enable Supabase Realtime for live conversation updates

### Schema Evolution
When adding new columns or tables:
1. Create migration script with proper constraints
2. Update RLS policies to include new tables
3. Regenerate TypeScript types
4. Update this documentation
5. Test with realistic data volumes

