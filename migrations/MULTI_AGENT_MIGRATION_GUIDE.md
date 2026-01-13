# Multi-Agent Chatbot Platform Migration Guide

## Overview

This guide covers the database migrations required to transform the AI Assistant Platform into a multi-agent chatbot platform, allowing admin users to create and configure multiple AI agents with different personalities and capabilities.

## Migration Summary

| Migration | Description | Dependencies | Risk Level |
|-----------|-------------|--------------|------------|
| 007 | Create `chatbots` table | Requires `tenants`, `users` | LOW |
| 008 | Add `role` column to `users` | None | LOW |
| 009 | Add `chatbot_id` to `conversations` | Requires migration 007 | LOW |
| 010 | Rename `comment` to `notes` in `feedback` | None | LOW |

## Architecture Changes

### New Tables

#### `chatbots` Table
Stores admin-created AI agent configurations with customizable parameters:
- **Purpose**: Define multiple AI agents with unique personalities and settings
- **Key Features**:
  - Configurable system prompts, models, and parameters
  - Publish/unpublish control for gradual rollout
  - Full audit trail (created_by, timestamps)
  - RLS enforced admin-only CRUD operations

### Modified Tables

#### `users` Table
- **Added**: `role` column (VARCHAR 50, default 'user')
- **Values**: 'admin' or 'user'
- **Purpose**: Role-based access control for chatbot management
- **Backward Compatible**: Existing users default to 'user' role

#### `conversations` Table
- **Added**: `chatbot_id` column (UUID, nullable)
- **Purpose**: Link conversations to specific chatbots
- **Backward Compatible**: NULL for existing conversations

#### `feedback` Table
- **Changed**: `comment` renamed to `notes`
- **Purpose**: More semantic naming for written feedback
- **Backward Compatible**: Data preserved during rename

## Row Level Security (RLS) Policies

### Chatbots Table Policies

1. **Admin users can view chatbots in their tenant**
   - Operation: SELECT
   - Scope: All chatbots in admin's tenant
   - Requirement: User must have role='admin'

2. **Users can view published chatbots in their tenant**
   - Operation: SELECT
   - Scope: Only published chatbots
   - Requirement: User must be active in tenant

3. **Admin users can create chatbots in their tenant**
   - Operation: INSERT
   - Scope: Admin's tenant only
   - Requirement: User must have role='admin'

4. **Admin users can update chatbots in their tenant**
   - Operation: UPDATE
   - Scope: Admin's tenant only
   - Requirement: User must have role='admin'

5. **Admin users can delete chatbots in their tenant**
   - Operation: DELETE
   - Scope: Admin's tenant only
   - Requirement: User must have role='admin'

6. **Demo user can view published chatbots**
   - Operation: SELECT
   - Scope: All published chatbots
   - Requirement: No authentication (for demo/testing)

## Performance Considerations

### Indexes Created

#### Chatbots Table
- `idx_chatbots_tenant_id` - Filter by tenant
- `idx_chatbots_created_by` - Filter by creator
- `idx_chatbots_is_published` (partial) - Filter published only
- `idx_chatbots_tenant_published` - Composite for common query
- `idx_chatbots_created_at` - Sort by creation date
- `idx_chatbots_name` - Composite for name search

#### Users Table
- `idx_users_role` - Filter by role
- `idx_users_tenant_role` - Composite for tenant+role queries

#### Conversations Table
- `idx_conversations_chatbot_id` - Filter by chatbot
- `idx_conversations_tenant_chatbot` - Composite query optimization

### Query Performance

Expected query times (with 10,000 chatbots, 100,000 conversations):
- List published chatbots for tenant: < 10ms
- Get chatbot configuration: < 5ms
- List conversations for chatbot: < 20ms
- Check user role: < 5ms

## Migration Instructions

### Option 1: Apply All Migrations at Once

```bash
# Via Supabase SQL Editor
cat migrations/apply_multi_agent_migrations.sql | pbcopy
# Paste and execute in Supabase SQL Editor

# Or via psql
psql $DATABASE_URL -f migrations/apply_multi_agent_migrations.sql
```

### Option 2: Apply Individual Migrations

```bash
psql $DATABASE_URL -f migrations/007_create_chatbots_table.sql
psql $DATABASE_URL -f migrations/008_add_users_role_column.sql
psql $DATABASE_URL -f migrations/009_add_conversations_chatbot_id.sql
psql $DATABASE_URL -f migrations/010_add_feedback_notes_column.sql
```

### Seed Test Data

```bash
# After migrations, seed sample chatbots
psql $DATABASE_URL -f migrations/seed_chatbots_data.sql
```

This creates 6 sample chatbots:
1. Customer Support Agent (published)
2. Sales Assistant (published)
3. Technical Documentation Assistant (published)
4. Creative Writing Coach (published)
5. Data Analysis Assistant (unpublished - work in progress)
6. HR Onboarding Assistant (published)

## Rollback Instructions

### Full Rollback (All Migrations)

```bash
psql $DATABASE_URL -f migrations/rollback_multi_agent_migrations.sql
```

### Individual Rollbacks (Reverse Order)

```bash
psql $DATABASE_URL -f migrations/rollback_010_feedback_notes.sql
psql $DATABASE_URL -f migrations/rollback_009_conversations_chatbot.sql
psql $DATABASE_URL -f migrations/rollback_008_users_role.sql
psql $DATABASE_URL -f migrations/rollback_007_chatbots.sql
```

## Testing Checklist

### Pre-Migration Testing
- [ ] Backup database
- [ ] Test migrations in staging environment
- [ ] Verify existing data integrity
- [ ] Review RLS policies for security vulnerabilities

### Post-Migration Testing
- [ ] Verify chatbots table created successfully
- [ ] Confirm RLS policies prevent unauthorized access
- [ ] Test admin user can create/update/delete chatbots
- [ ] Test regular user can only view published chatbots
- [ ] Test demo user can view published chatbots without auth
- [ ] Verify conversations can link to chatbots
- [ ] Confirm existing conversations still work (NULL chatbot_id)
- [ ] Test feedback notes column renamed correctly
- [ ] Run performance tests on indexed queries
- [ ] Verify foreign key constraints work
- [ ] Test rollback procedure in staging

### Security Testing
- [ ] Attempt cross-tenant chatbot access (should fail)
- [ ] Attempt regular user creating chatbot (should fail)
- [ ] Attempt user viewing unpublished chatbot (should fail)
- [ ] Verify admin cannot delete chatbot from other tenant
- [ ] Test demo user access restrictions

## Data Migration Considerations

### Existing Data Compatibility

1. **Conversations**: All existing conversations will have `chatbot_id = NULL`
   - No data loss or modification
   - Application should handle NULL chatbot_id gracefully

2. **Users**: All existing users default to `role = 'user'`
   - Manually update admin users after migration:
   ```sql
   UPDATE public.users
   SET role = 'admin'
   WHERE email IN ('admin@example.com', 'other-admin@example.com');
   ```

3. **Feedback**: Column rename preserves all data
   - `comment` → `notes` (seamless rename)

### Post-Migration Tasks

1. **Assign Admin Roles**
   ```sql
   UPDATE public.users
   SET role = 'admin'
   WHERE tenant_id = 'YOUR_TENANT_ID'
   AND email IN ('admin@company.com');
   ```

2. **Create Initial Chatbots**
   - Use Supabase Dashboard or API to create first chatbots
   - Publish when ready for user access

3. **Update Application Code**
   - Add chatbot selection to chat interface
   - Implement admin chatbot management UI
   - Update conversation creation to include chatbot_id
   - Handle NULL chatbot_id for backward compatibility

## TypeScript Type Definitions

### Generate Updated Types

```bash
cd ai-assistant-platform
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.ts
```

### Key Type Changes

```typescript
// New table type
type Chatbot = Database['public']['Tables']['chatbots']['Row'];

// Updated types
type User = {
  // ... existing fields
  role: 'admin' | 'user';
};

type Conversation = {
  // ... existing fields
  chatbot_id: string | null;
};

type Feedback = {
  // ... existing fields
  notes: string | null; // renamed from 'comment'
};
```

## Monitoring and Alerts

### Metrics to Track

1. **Chatbot Usage**
   - Number of conversations per chatbot
   - Average response quality by chatbot (feedback ratings)
   - Popular chatbots by tenant

2. **Performance**
   - Query response times for chatbot-related queries
   - RLS policy overhead (should be < 10ms)
   - Index usage statistics

3. **Security**
   - Failed authorization attempts
   - Cross-tenant access attempts (should be zero)
   - Admin action audit log

### Recommended Queries

```sql
-- Chatbot usage by tenant
SELECT
  c.tenant_id,
  cb.name as chatbot_name,
  COUNT(DISTINCT conv.id) as conversation_count,
  AVG(f.rating) as avg_rating
FROM public.chatbots cb
LEFT JOIN public.conversations conv ON cb.id = conv.chatbot_id
LEFT JOIN public.messages m ON conv.id = m.conversation_id
LEFT JOIN public.feedback f ON m.id = f.message_id
WHERE c.tenant_id = 'YOUR_TENANT_ID'
GROUP BY c.tenant_id, cb.name
ORDER BY conversation_count DESC;

-- Admin users by tenant
SELECT t.name, COUNT(*) as admin_count
FROM public.users u
JOIN public.tenants t ON u.tenant_id = t.id
WHERE u.role = 'admin'
GROUP BY t.name;

-- Unpublished chatbots (work in progress)
SELECT tenant_id, name, created_at, updated_at
FROM public.chatbots
WHERE is_published = false
ORDER BY updated_at DESC;
```

## Troubleshooting

### Common Issues

1. **RLS Policy Preventing Access**
   - Check user's `is_active` status
   - Verify user has correct `role`
   - Confirm user is in correct tenant

2. **Foreign Key Constraint Violations**
   - Ensure `created_by` references valid user
   - Verify `tenant_id` exists in tenants table
   - Check `chatbot_id` exists before linking conversation

3. **Migration Fails on Existing Data**
   - Migrations are idempotent - safe to re-run
   - Check constraint violations on existing data
   - Review error messages for specific issues

### Debug Queries

```sql
-- Check if migrations applied
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('chatbots', 'users', 'conversations', 'feedback')
ORDER BY table_name, ordinal_position;

-- Verify RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'chatbots';

-- Check indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename IN ('chatbots', 'users', 'conversations')
AND schemaname = 'public';
```

## Future Enhancements

### Potential Additions

1. **Chatbot Categories/Tags**
   - Add `category` and `tags` columns
   - Enable filtering by use case

2. **Version Control for Chatbots**
   - Track prompt/setting changes over time
   - Ability to rollback to previous versions

3. **A/B Testing**
   - Compare chatbot performance
   - Automatic traffic splitting

4. **Analytics Dashboard**
   - Chatbot performance metrics
   - User engagement tracking
   - Feedback sentiment analysis

5. **Function Calling Support**
   - Store function definitions in settings JSONB
   - Enable tool use for advanced chatbots

## Support and Documentation

- **Schema Documentation**: See `SCHEMA_DOCUMENTATION.md`
- **Migration History**: See individual migration files
- **Rollback Procedures**: See rollback SQL files
- **Test Data**: See `seed_chatbots_data.sql`

## Changelog

### 2026-01-13
- Initial multi-agent migration
- Created chatbots table with full RLS
- Added role-based access control to users
- Linked conversations to chatbots
- Renamed feedback comment to notes
- Added comprehensive test data
