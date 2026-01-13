# Multi-Agent Platform Migration - Apply Instructions

## Status: MIGRATIONS READY TO APPLY

All migration scripts have been created and are ready to be applied to your Supabase database.

## Quick Summary

4 new migrations have been created to transform your platform into a multi-agent chatbot system:

1. **Migration 007**: Create `chatbots` table with admin-controlled AI agent configurations
2. **Migration 008**: Add `role` column to `users` table (admin/user distinction)
3. **Migration 009**: Add `chatbot_id` column to `conversations` table
4. **Migration 010**: Rename `comment` to `notes` in `feedback` table

## Apply Migrations (Choose One Method)

### Method 1: Supabase Dashboard SQL Editor (RECOMMENDED)

1. Open your Supabase project dashboard: https://app.supabase.com
2. Navigate to: **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the contents of: `/migrations/apply_multi_agent_migrations.sql`
5. Click **Run** (or press Cmd+Enter)
6. Wait for completion (should take 2-5 seconds)

### Method 2: Individual Migrations

If you prefer to apply migrations one at a time:

1. Open SQL Editor in Supabase Dashboard
2. Run each migration in order:
   - `007_create_chatbots_table.sql`
   - `008_add_users_role_column.sql`
   - `009_add_conversations_chatbot_id.sql`
   - `010_add_feedback_notes_column.sql`

### Method 3: Command Line (If psql is available)

```bash
# Set your database connection URL
export DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.lcflejsnwhvmpkkzkuqp.supabase.co:5432/postgres"

# Apply all migrations
psql $DATABASE_URL -f /Users/valerio/Agent-Usage-Platform-Evalutions/migrations/apply_multi_agent_migrations.sql

# Or apply individually
psql $DATABASE_URL -f /Users/valerio/Agent-Usage-Platform-Evalutions/migrations/007_create_chatbots_table.sql
psql $DATABASE_URL -f /Users/valerio/Agent-Usage-Platform-Evalutions/migrations/008_add_users_role_column.sql
psql $DATABASE_URL -f /Users/valerio/Agent-Usage-Platform-Evalutions/migrations/009_add_conversations_chatbot_id.sql
psql $DATABASE_URL -f /Users/valerio/Agent-Usage-Platform-Evalutions/migrations/010_add_feedback_notes_column.sql
```

## Verify Migration Success

After applying migrations, run this verification query in SQL Editor:

```sql
-- Check all new objects were created
SELECT
  'chatbots table' as object_type,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chatbots')
    THEN '✓ Created' ELSE '✗ Missing' END as status
UNION ALL
SELECT
  'users.role column',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role')
    THEN '✓ Created' ELSE '✗ Missing' END
UNION ALL
SELECT
  'conversations.chatbot_id column',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'chatbot_id')
    THEN '✓ Created' ELSE '✗ Missing' END
UNION ALL
SELECT
  'feedback.notes column',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'feedback' AND column_name = 'notes')
    THEN '✓ Created' ELSE '✗ Missing' END;

-- Check indexes
SELECT
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE tablename IN ('chatbots', 'users', 'conversations', 'feedback')
AND schemaname = 'public'
ORDER BY tablename, indexname;

-- Check RLS policies
SELECT
  tablename,
  policyname,
  cmd as operation
FROM pg_policies
WHERE tablename = 'chatbots'
ORDER BY policyname;
```

Expected results:
- All 4 status checks should show "✓ Created"
- 8+ indexes should be listed for chatbots-related tables
- 6 RLS policies should exist on chatbots table

## Seed Test Data (Optional)

After migrations are applied, you can seed sample chatbots for testing:

```sql
-- Run in SQL Editor
-- Contents of: /migrations/seed_chatbots_data.sql
```

This will create 6 sample chatbots:
1. Customer Support Agent
2. Sales Assistant
3. Technical Documentation Assistant
4. Creative Writing Coach
5. Data Analysis Assistant (unpublished)
6. HR Onboarding Assistant

## Post-Migration Tasks

### 1. Assign Admin Role to Users

Update existing users who should have admin access:

```sql
-- Replace with actual admin emails
UPDATE public.users
SET role = 'admin'
WHERE email IN ('your-admin-email@company.com')
AND tenant_id = (SELECT id FROM public.tenants WHERE slug = 'your-tenant-slug');

-- Verify admin users
SELECT email, role, is_active
FROM public.users
WHERE role = 'admin';
```

### 2. Update TypeScript Types

Generate new database types:

```bash
cd /Users/valerio/Agent-Usage-Platform-Evalutions/ai-assistant-platform

# If you have Supabase CLI installed
npx supabase gen types typescript --project-id lcflejsnwhvmpkkzkuqp > src/types/database.ts

# Or manually update src/types/database.ts with new types
```

### 3. Test RLS Policies

Test that security policies work correctly:

```sql
-- Test 1: Regular user cannot create chatbots (should return 0)
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "user-uuid"}';
INSERT INTO public.chatbots (tenant_id, name, system_prompt, created_by)
VALUES ('tenant-id', 'Test Bot', 'Test prompt', 'user-id');
-- Expected: Permission denied or 0 rows inserted

-- Test 2: Admin user can create chatbots (should succeed)
-- First, ensure test user has admin role
-- Then try insert with admin user auth

-- Test 3: User can only view published chatbots
SELECT COUNT(*) FROM public.chatbots WHERE is_published = true;
-- Should return only published bots

-- Test 4: Admin can view all chatbots
-- Should return both published and unpublished
```

## Rollback Instructions

If you need to rollback the migrations:

1. Open Supabase SQL Editor
2. Run: `/migrations/rollback_multi_agent_migrations.sql`

This will safely remove all changes in reverse order.

## Migration Files Reference

### Created Files

| File | Purpose | Location |
|------|---------|----------|
| `007_create_chatbots_table.sql` | Create chatbots table | `/migrations/` |
| `008_add_users_role_column.sql` | Add role to users | `/migrations/` |
| `009_add_conversations_chatbot_id.sql` | Link conversations to chatbots | `/migrations/` |
| `010_add_feedback_notes_column.sql` | Rename comment to notes | `/migrations/` |
| `apply_multi_agent_migrations.sql` | Master migration file | `/migrations/` |
| `rollback_multi_agent_migrations.sql` | Rollback all changes | `/migrations/` |
| `rollback_007_chatbots.sql` | Rollback chatbots table | `/migrations/` |
| `rollback_008_users_role.sql` | Rollback role column | `/migrations/` |
| `rollback_009_conversations_chatbot.sql` | Rollback chatbot_id | `/migrations/` |
| `rollback_010_feedback_notes.sql` | Rollback notes column | `/migrations/` |
| `seed_chatbots_data.sql` | Sample chatbot data | `/migrations/` |
| `MULTI_AGENT_MIGRATION_GUIDE.md` | Comprehensive guide | `/migrations/` |

## Database Schema Changes Summary

### New Table: `chatbots`

```sql
CREATE TABLE public.chatbots (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    system_prompt TEXT NOT NULL,
    model VARCHAR(100) DEFAULT 'gpt-4-turbo-preview',
    temperature DECIMAL(3,2) DEFAULT 0.7,
    max_tokens INTEGER DEFAULT 2048,
    settings JSONB DEFAULT '{}',
    is_published BOOLEAN DEFAULT false,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Modified Tables

| Table | Column Added | Type | Default | Notes |
|-------|--------------|------|---------|-------|
| `users` | `role` | VARCHAR(50) | 'user' | Values: 'admin' or 'user' |
| `conversations` | `chatbot_id` | UUID | NULL | FK to chatbots(id) |
| `feedback` | `notes` | TEXT | NULL | Renamed from 'comment' |

### Indexes Created

- `idx_chatbots_tenant_id` - Filter by tenant
- `idx_chatbots_created_by` - Filter by creator
- `idx_chatbots_is_published` - Filter published (partial)
- `idx_chatbots_tenant_published` - Composite tenant+published
- `idx_chatbots_created_at` - Sort by date
- `idx_chatbots_name` - Search by name
- `idx_users_role` - Filter by role
- `idx_users_tenant_role` - Composite tenant+role
- `idx_conversations_chatbot_id` - Filter by chatbot
- `idx_conversations_tenant_chatbot` - Composite tenant+chatbot

### RLS Policies Created

All policies on `chatbots` table:
1. Admin users can view all chatbots in their tenant
2. Regular users can view only published chatbots
3. Admin users can create chatbots
4. Admin users can update chatbots
5. Admin users can delete chatbots
6. Demo users can view published chatbots (no auth)

## Architecture Benefits

After applying these migrations, your platform will support:

- **Multiple AI Agents**: Create unlimited chatbots with unique personalities
- **Role-Based Access**: Admins manage chatbots, users consume them
- **Tenant Isolation**: Each tenant has their own chatbot library
- **Gradual Rollout**: Publish/unpublish control for testing
- **Conversation Tracking**: Link conversations to specific chatbots
- **Enhanced Feedback**: Written notes supplement ratings

## Support

For questions or issues:
1. Review `MULTI_AGENT_MIGRATION_GUIDE.md` for detailed documentation
2. Check `SCHEMA_DOCUMENTATION.md` for schema reference
3. Test migrations in staging before production

## Next Steps After Migration

1. Apply migrations (see above)
2. Verify success with verification query
3. Assign admin roles to appropriate users
4. Seed test data (optional)
5. Update application code to:
   - Show chatbot selector in UI
   - Pass chatbot_id when creating conversations
   - Implement admin chatbot management interface
6. Update TypeScript types
7. Test RLS policies
8. Deploy to production

## Estimated Time

- Migration execution: 2-5 seconds
- Verification: 30 seconds
- Admin role assignment: 1-2 minutes
- TypeScript type update: 2-3 minutes
- Total: **5-10 minutes**

---

**Ready to apply?** Copy `/migrations/apply_multi_agent_migrations.sql` to Supabase SQL Editor and click Run!
