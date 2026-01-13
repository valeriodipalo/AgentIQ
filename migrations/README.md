# Database Migrations - AI Assistant Platform

This directory contains all database migrations, documentation, and utilities for the AI Assistant Platform schema.

## Directory Structure

```
migrations/
├── README.md                           # This file
├── SCHEMA_DOCUMENTATION.md             # Comprehensive schema documentation
├── MIGRATION_GUIDE.md                  # Step-by-step migration instructions
├── database.types.ts                   # TypeScript type definitions
├── 003_create_conversations_table.sql  # Conversations table migration
├── 004_create_messages_table.sql       # Messages table migration
├── 005_create_feedback_table.sql       # Feedback table migration
├── 006_create_usage_metrics_table.sql  # Usage metrics table migration
├── rollback_003_conversations.sql      # Rollback script for conversations
├── rollback_004_messages.sql           # Rollback script for messages
├── rollback_005_feedback.sql           # Rollback script for feedback
├── rollback_006_usage_metrics.sql      # Rollback script for usage_metrics
├── rollback_all.sql                    # Complete rollback script
└── seed_test_data.sql                  # Test data seeding script
```

## Quick Start

### 1. Apply All Migrations

Execute migrations in order using your preferred method:

#### Option A: Using Supabase Dashboard
1. Go to https://app.supabase.com/project/lcflejsnwhvmpkkzkuqp/editor
2. Open SQL Editor
3. Execute each migration file in order (003 → 004 → 005 → 006)

#### Option B: Using Supabase CLI
```bash
# Link to project
supabase link --project-ref lcflejsnwhvmpkkzkuqp

# Apply migrations
supabase db push
```

#### Option C: Using psql
```bash
# Set your database URL
export DATABASE_URL="postgresql://[user]:[password]@[host]:5432/postgres"

# Apply migrations in order
psql $DATABASE_URL -f 003_create_conversations_table.sql
psql $DATABASE_URL -f 004_create_messages_table.sql
psql $DATABASE_URL -f 005_create_feedback_table.sql
psql $DATABASE_URL -f 006_create_usage_metrics_table.sql
```

### 2. Verify Installation

```sql
-- Check all tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('conversations', 'messages', 'feedback', 'usage_metrics')
ORDER BY table_name;

-- Check RLS is enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('conversations', 'messages', 'feedback', 'usage_metrics');
```

### 3. Seed Test Data (Optional)

```bash
psql $DATABASE_URL -f seed_test_data.sql
```

## Migration Details

### Migration 003: Conversations Table
**Purpose**: Store chat conversations between users and the AI assistant

**Key Features**:
- Tenant isolation via RLS
- Auto-updating `updated_at` timestamp
- Soft delete via `is_archived` flag
- JSONB metadata for extensibility

**Dependencies**: Requires `tenants` and `users` tables

### Migration 004: Messages Table
**Purpose**: Store individual messages within conversations

**Key Features**:
- Role-based message types (user/assistant/system)
- Performance metrics (token_count, latency_ms)
- Automatic conversation timestamp updates
- Indexed for fast retrieval

**Dependencies**: Requires `conversations` table (003)

### Migration 005: Feedback Table
**Purpose**: Store user feedback on AI responses

**Key Features**:
- Binary rating system (thumbs up/down)
- Optional text comments
- One feedback per user per message (unique constraint)
- Materialized view for aggregated statistics

**Dependencies**: Requires `messages` table (004) and `users` table

### Migration 006: Usage Metrics Table
**Purpose**: Track token usage and costs for billing/analytics

**Key Features**:
- Daily aggregation per tenant/user
- Atomic increment function for concurrent updates
- Monthly summary materialized view
- Real-time current day usage view

**Dependencies**: Requires `tenants` and `users` tables

## Schema Overview

```
┌─────────────┐
│   tenants   │
└──────┬──────┘
       │
       ├──────────────┐
       │              │
       ▼              ▼
┌─────────────┐  ┌─────────────┐
│    users    │  │usage_metrics│
└──────┬──────┘  └─────────────┘
       │
       ▼
┌─────────────┐
│conversations│
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  messages   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  feedback   │
└─────────────┘
```

## Row Level Security (RLS)

All tables implement comprehensive RLS policies for tenant isolation:

### Policy Pattern
1. **SELECT**: Users can view data from their own tenant
2. **INSERT**: Users can create data in their own tenant
3. **UPDATE**: Users can modify their own data
4. **DELETE**: Users can delete their own data

### Testing RLS
```sql
-- Test as regular user (will be filtered by RLS)
SELECT * FROM conversations; -- Only shows user's tenant data

-- Test as service role (bypasses RLS)
-- Use service_role key for admin operations
```

## Performance Optimization

### Indexes
All tables include optimized indexes for common query patterns:
- Foreign key columns (tenant_id, user_id, etc.)
- Timestamp columns for sorting
- Composite indexes for complex queries
- Partial indexes for filtered queries

### Materialized Views
- `message_feedback_summary`: Aggregated feedback statistics
- `monthly_usage_summary`: Monthly usage aggregates

**Refresh Schedule**: Daily (recommended)
```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY message_feedback_summary;
REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_usage_summary;
```

## Maintenance Tasks

### Daily
```sql
-- Refresh materialized views
REFRESH MATERIALIZED VIEW CONCURRENTLY message_feedback_summary;
REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_usage_summary;
```

### Weekly
```sql
-- Vacuum and analyze
VACUUM ANALYZE public.conversations;
VACUUM ANALYZE public.messages;
VACUUM ANALYZE public.feedback;
VACUUM ANALYZE public.usage_metrics;
```

### Monthly
```sql
-- Archive old conversations
UPDATE conversations
SET is_archived = true
WHERE updated_at < CURRENT_DATE - INTERVAL '6 months'
AND is_archived = false;
```

## TypeScript Integration

Import the generated types in your application:

```typescript
import type { Database } from './migrations/database.types';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient<Database>(
  'https://lcflejsnwhvmpkkzkuqp.supabase.co',
  process.env.SUPABASE_ANON_KEY!
);

// Type-safe queries
const { data: conversations } = await supabase
  .from('conversations')
  .select('*')
  .eq('tenant_id', tenantId);
```

## Rollback Procedures

### Rollback Single Migration
```bash
# Rollback most recent migration
psql $DATABASE_URL -f rollback_006_usage_metrics.sql
```

### Rollback All Migrations
```bash
# WARNING: This deletes all data!
psql $DATABASE_URL -f rollback_all.sql
```

### Rollback Order
Always rollback in reverse order of application:
1. `rollback_006_usage_metrics.sql`
2. `rollback_005_feedback.sql`
3. `rollback_004_messages.sql`
4. `rollback_003_conversations.sql`

## Troubleshooting

### Issue: "relation already exists"
**Solution**: Table was already created. Skip migration or use rollback first.

### Issue: RLS policies blocking queries
**Solution**: Verify you're authenticated and user is active:
```sql
SELECT auth.uid(); -- Should return your user UUID
SELECT * FROM users WHERE auth_id = auth.uid(); -- Should return your user record
```

### Issue: Slow queries
**Solution**: Check if indexes are being used:
```sql
EXPLAIN ANALYZE SELECT * FROM messages WHERE conversation_id = 'your-id';
-- Should show "Index Scan" if index is used
```

### Issue: Materialized view out of date
**Solution**: Refresh the view:
```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY message_feedback_summary;
```

## Documentation Files

- **SCHEMA_DOCUMENTATION.md**: Detailed schema architecture, table specifications, and best practices
- **MIGRATION_GUIDE.md**: Step-by-step instructions for applying and rolling back migrations
- **database.types.ts**: TypeScript type definitions for type-safe database access

## Monitoring Queries

### Check Table Sizes
```sql
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
```

### Monitor Active Connections
```sql
SELECT
    datname,
    usename,
    application_name,
    state,
    COUNT(*)
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY datname, usename, application_name, state;
```

### Check Index Usage
```sql
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
AND tablename IN ('conversations', 'messages', 'feedback', 'usage_metrics')
ORDER BY idx_scan DESC;
```

## Support and Resources

- **Supabase Dashboard**: https://app.supabase.com/project/lcflejsnwhvmpkkzkuqp
- **Supabase Docs**: https://supabase.com/docs
- **PostgreSQL Docs**: https://www.postgresql.org/docs/
- **RLS Guide**: https://supabase.com/docs/guides/auth/row-level-security

## Contributing

When adding new migrations:

1. Create migration file with sequential number: `007_description.sql`
2. Create corresponding rollback file: `rollback_007_description.sql`
3. Update `SCHEMA_DOCUMENTATION.md` with table details
4. Update `database.types.ts` with new types
5. Add verification steps to `MIGRATION_GUIDE.md`
6. Test migration and rollback in staging environment

## Version History

- **v1.0** (2026-01-13): Initial schema with conversations, messages, feedback, and usage_metrics tables

