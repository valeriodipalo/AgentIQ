# Deployment Checklist - AI Assistant Platform Database

Use this checklist to ensure a smooth deployment of the database migrations.

## Pre-Deployment

### Environment Verification
- [ ] Confirmed target environment (staging/production)
- [ ] Verified Supabase project URL: https://lcflejsnwhvmpkkzkuqp.supabase.co
- [ ] Obtained necessary credentials (service role key or database connection string)
- [ ] Verified existing tables exist:
  - [ ] `tenants` table exists
  - [ ] `users` table exists
- [ ] Database backup completed (if production)
- [ ] Scheduled maintenance window (if production)

### Code Preparation
- [ ] Reviewed all migration files (003-006)
- [ ] Reviewed rollback scripts
- [ ] Confirmed migration order:
  1. 003_create_conversations_table.sql
  2. 004_create_messages_table.sql
  3. 005_create_feedback_table.sql
  4. 006_create_usage_metrics_table.sql

### Team Coordination
- [ ] Notified team of deployment
- [ ] Developer team ready for application updates
- [ ] Support team aware of potential issues
- [ ] Rollback procedure reviewed with team

## Deployment Steps

### Step 1: Apply Migration 003 (Conversations)
- [ ] Execute `003_create_conversations_table.sql`
- [ ] Verify table created:
  ```sql
  SELECT * FROM information_schema.tables
  WHERE table_name = 'conversations';
  ```
- [ ] Check indexes created (should be 6):
  ```sql
  SELECT indexname FROM pg_indexes
  WHERE tablename = 'conversations';
  ```
- [ ] Verify RLS enabled:
  ```sql
  SELECT relname, relrowsecurity FROM pg_class
  WHERE relname = 'conversations';
  ```
- [ ] Check RLS policies (should be 4):
  ```sql
  SELECT policyname FROM pg_policies
  WHERE tablename = 'conversations';
  ```
- [ ] Test trigger:
  ```sql
  -- Insert test conversation, update it, verify updated_at changed
  ```

### Step 2: Apply Migration 004 (Messages)
- [ ] Execute `004_create_messages_table.sql`
- [ ] Verify table created
- [ ] Check indexes created (should be 6)
- [ ] Verify RLS enabled
- [ ] Check RLS policies (should be 4)
- [ ] Test trigger (conversation timestamp update)
- [ ] Verify foreign key to conversations works

### Step 3: Apply Migration 005 (Feedback)
- [ ] Execute `005_create_feedback_table.sql`
- [ ] Verify table created
- [ ] Check indexes created (should be 5)
- [ ] Verify RLS enabled
- [ ] Check RLS policies (should be 4)
- [ ] Verify materialized view created: `message_feedback_summary`
- [ ] Refresh materialized view:
  ```sql
  REFRESH MATERIALIZED VIEW message_feedback_summary;
  ```
- [ ] Verify unique constraint (message_id, user_id)

### Step 4: Apply Migration 006 (Usage Metrics)
- [ ] Execute `006_create_usage_metrics_table.sql`
- [ ] Verify table created
- [ ] Check indexes created (should be 7)
- [ ] Verify RLS enabled
- [ ] Check RLS policies (should be 3)
- [ ] Verify function created: `increment_usage_metrics()`
- [ ] Verify materialized view created: `monthly_usage_summary`
- [ ] Verify view created: `current_day_usage`
- [ ] Test increment function:
  ```sql
  SELECT increment_usage_metrics(
    'test-tenant'::UUID,
    'test-user'::UUID,
    CURRENT_DATE,
    100, 200, 0.015
  );
  ```

## Post-Deployment Verification

### Database Structure
- [ ] All 4 tables created successfully
- [ ] Total 24 indexes created
- [ ] All foreign keys working
- [ ] All triggers functional
- [ ] All views accessible
- [ ] All functions executable

### RLS Policy Testing
- [ ] Test SELECT policy (view own tenant data):
  ```sql
  SET LOCAL jwt.claims.sub = 'user-uuid';
  SELECT * FROM conversations;
  ```
- [ ] Test INSERT policy (create in own tenant)
- [ ] Test UPDATE policy (modify own records)
- [ ] Test DELETE policy (remove own records)
- [ ] Test cross-tenant isolation (should return no data from other tenants)

### Performance Testing
- [ ] Run EXPLAIN ANALYZE on common queries:
  ```sql
  EXPLAIN ANALYZE
  SELECT * FROM conversations
  WHERE tenant_id = ? AND is_archived = false
  ORDER BY updated_at DESC LIMIT 20;
  ```
- [ ] Verify indexes are being used (look for "Index Scan")
- [ ] Check query execution time (should be < 50ms for typical queries)

### Data Integrity
- [ ] Test foreign key constraints:
  ```sql
  -- Try to insert message with non-existent conversation_id (should fail)
  INSERT INTO messages (conversation_id, role, content)
  VALUES ('non-existent-uuid', 'user', 'test');
  ```
- [ ] Test check constraints:
  ```sql
  -- Try to insert message with invalid role (should fail)
  INSERT INTO messages (conversation_id, role, content)
  VALUES ('valid-uuid', 'invalid', 'test');
  ```
- [ ] Test unique constraints (feedback):
  ```sql
  -- Try to insert duplicate feedback (should fail)
  ```

### Materialized Views
- [ ] Verify `message_feedback_summary` has correct data structure
- [ ] Verify `monthly_usage_summary` has correct aggregations
- [ ] Test refresh performance (should complete in < 5 seconds for empty tables)

## Optional: Seed Test Data

- [ ] Execute `seed_test_data.sql` (only in staging)
- [ ] Verify test data created:
  - [ ] 3 test tenants
  - [ ] 6 test users
  - [ ] 7 test conversations
  - [ ] 14 test messages
  - [ ] 7 feedback entries
  - [ ] 11 usage metrics records
- [ ] Run sample queries against test data
- [ ] Clean up test data when finished:
  ```sql
  DELETE FROM tenants WHERE slug LIKE 'test-%';
  ```

## Application Integration

### Update Application Code
- [ ] Import TypeScript types from `database.types.ts`
- [ ] Update Supabase client initialization
- [ ] Update conversation creation logic
- [ ] Update message insertion logic
- [ ] Update feedback handling
- [ ] Update usage tracking
- [ ] Test all database operations from application

### Example Code Updates
- [ ] Conversation CRUD operations working
- [ ] Message streaming/insertion working
- [ ] Feedback submission working
- [ ] Usage tracking working
- [ ] Error handling for database operations
- [ ] Transaction handling where needed

## Monitoring Setup

### Database Monitoring
- [ ] Set up query performance monitoring
- [ ] Monitor table size growth:
  ```sql
  SELECT schemaname, tablename,
         pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
  FROM pg_tables WHERE schemaname = 'public';
  ```
- [ ] Monitor index usage:
  ```sql
  SELECT schemaname, tablename, indexname, idx_scan
  FROM pg_stat_user_indexes
  WHERE schemaname = 'public'
  ORDER BY idx_scan DESC;
  ```
- [ ] Monitor slow queries (> 100ms)

### Application Monitoring
- [ ] Monitor database connection pool
- [ ] Track query error rates
- [ ] Monitor RLS policy violations (should be zero)
- [ ] Track materialized view refresh time

### Alerts Configuration
- [ ] Alert on slow queries (> 1 second)
- [ ] Alert on high error rate (> 1%)
- [ ] Alert on table size growth (> 50% week-over-week)
- [ ] Alert on materialized view refresh failures

## Scheduled Maintenance

### Daily Tasks (Automated)
- [ ] Schedule daily materialized view refresh:
  ```sql
  REFRESH MATERIALIZED VIEW CONCURRENTLY message_feedback_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_usage_summary;
  ```
- [ ] Set up cron job or Supabase Edge Function for refresh

### Weekly Tasks (Automated)
- [ ] Schedule weekly VACUUM ANALYZE:
  ```bash
  VACUUM ANALYZE public.conversations;
  VACUUM ANALYZE public.messages;
  VACUUM ANALYZE public.feedback;
  VACUUM ANALYZE public.usage_metrics;
  ```

### Monthly Tasks (Manual)
- [ ] Review table sizes and growth trends
- [ ] Review slow query log
- [ ] Archive old conversations (if needed)
- [ ] Update documentation with lessons learned

## Documentation

- [ ] Update team documentation with new schema
- [ ] Document common query patterns
- [ ] Create runbook for common operations
- [ ] Document troubleshooting procedures
- [ ] Share TypeScript types with frontend team

## Rollback Plan (If Needed)

### Rollback Readiness
- [ ] Rollback scripts tested in staging
- [ ] Team knows how to execute rollback
- [ ] Database backup available for restore
- [ ] Application can handle missing tables (graceful degradation)

### Rollback Execution (Only if critical issues)
1. [ ] Stop application traffic (if possible)
2. [ ] Execute rollback scripts in reverse order:
   - [ ] `rollback_006_usage_metrics.sql`
   - [ ] `rollback_005_feedback.sql`
   - [ ] `rollback_004_messages.sql`
   - [ ] `rollback_003_conversations.sql`
3. [ ] Verify tables removed
4. [ ] Restore from backup if needed
5. [ ] Resume application traffic
6. [ ] Document issue and root cause

## Sign-off

### Deployment Team
- [ ] Database Administrator signed off: _________________ Date: _______
- [ ] Backend Lead signed off: _________________ Date: _______
- [ ] DevOps signed off: _________________ Date: _______

### Verification
- [ ] All checklist items completed
- [ ] No critical issues found
- [ ] Application working with new schema
- [ ] Monitoring configured and active
- [ ] Team trained on new schema

### Post-Deployment Review (Within 7 Days)
- [ ] Review deployment process
- [ ] Document lessons learned
- [ ] Update checklist based on experience
- [ ] Plan for next migration (if any)

## Notes and Issues

### Issues Encountered
```
Issue 1:
- Description:
- Resolution:
- Time to resolve:

Issue 2:
- Description:
- Resolution:
- Time to resolve:
```

### Performance Observations
```
- Initial table sizes:
- Query performance:
- Index usage:
- RLS overhead:
```

### Recommendations for Future
```
- What went well:
- What could be improved:
- Process changes needed:
```

---

**Deployment Date**: _______________
**Deployment Duration**: _______________
**Completed By**: _______________
**Status**: [ ] Success [ ] Partial [ ] Rollback

