# Plan: Analytics Improvements & Demo Label Fix

## Date: 2026-01-15
## Status: PLANNING
## Priority: HIGH

---

## Overview

Fix the incorrect "demo data" label and enhance analytics with company-level filtering and user-level granularity.

---

## Issues to Fix

### 1. Demo Data Label Showing Incorrectly

**Problem**: Conversations and Analytics pages show "viewing demo data" even when viewing real data.

**Root Cause**: The pages check for demo mode but don't account for session-based authentication.

**Files to Update**:
- `/src/app/admin/conversations/page.tsx`
- `/src/app/admin/analytics/page.tsx`

**Fix**: Remove or update the demo mode indicator logic to check actual data source.

---

### 2. Analytics Enhancements

**Current State**: Analytics shows aggregate data without filtering capabilities.

**Required Features**:

#### A. Company-Level Filtering
- Dropdown to select specific company
- Show usage metrics per company
- Show feedback summary per company

#### B. User-Level Granularity
- Drill down from company → users
- See conversations per user
- See feedback given by each user
- Usage metrics per user

#### C. Feedback Analysis
- Positive/negative feedback counts
- Feedback trends over time
- Link to view actual conversations with feedback

---

## Implementation Plan

### Phase 1: Fix Demo Label (Quick Fix)

**Files**:
1. `/src/app/admin/conversations/page.tsx` - Remove/fix demo indicator
2. `/src/app/admin/analytics/page.tsx` - Remove/fix demo indicator

### Phase 2: Analytics API Enhancement

**New/Updated API Endpoints**:

1. `GET /api/admin/analytics` - Update to support filters:
   - `?company_id=xxx` - Filter by company
   - `?user_id=xxx` - Filter by user
   - `?date_from=xxx&date_to=xxx` - Date range

2. `GET /api/admin/analytics/feedback` - New endpoint:
   - Feedback summary by company/user
   - Positive/negative breakdown
   - Recent feedback with message context

3. `GET /api/admin/analytics/users` - New endpoint:
   - List users with their usage stats
   - Filter by company
   - Include conversation count, message count, feedback given

### Phase 3: Analytics UI Enhancement

**Updated Pages**:

1. `/src/app/admin/analytics/page.tsx`:
   - Add company filter dropdown
   - Add date range picker
   - Show company-level metrics cards
   - Add feedback summary section

2. New component: `/src/components/admin/UserAnalyticsTable.tsx`:
   - Table showing users with stats
   - Click to drill down to user detail

3. New component: `/src/components/admin/FeedbackSummary.tsx`:
   - Positive/negative counts
   - Trend chart
   - Recent feedback list

### Phase 4: User Detail View

**New Page**: `/src/app/admin/analytics/users/[id]/page.tsx`
- User profile info
- Conversation history
- Feedback given
- Usage over time

---

## Data Model

### Analytics Query Structure

```sql
-- Company-level usage
SELECT
  t.id as company_id,
  t.name as company_name,
  COUNT(DISTINCT c.id) as conversation_count,
  COUNT(DISTINCT m.id) as message_count,
  COUNT(DISTINCT u.id) as user_count,
  SUM(CASE WHEN f.rating = 1 THEN 1 ELSE 0 END) as positive_feedback,
  SUM(CASE WHEN f.rating = -1 THEN 1 ELSE 0 END) as negative_feedback
FROM tenants t
LEFT JOIN conversations c ON c.tenant_id = t.id
LEFT JOIN messages m ON m.conversation_id = c.id
LEFT JOIN users u ON u.tenant_id = t.id
LEFT JOIN feedback f ON f.message_id = m.id
GROUP BY t.id, t.name;

-- User-level usage (for a company)
SELECT
  u.id as user_id,
  u.name as user_name,
  u.email,
  COUNT(DISTINCT c.id) as conversation_count,
  COUNT(DISTINCT m.id) as message_count,
  SUM(CASE WHEN f.rating = 1 THEN 1 ELSE 0 END) as positive_feedback,
  SUM(CASE WHEN f.rating = -1 THEN 1 ELSE 0 END) as negative_feedback,
  MAX(c.updated_at) as last_active
FROM users u
LEFT JOIN conversations c ON c.user_id = u.id
LEFT JOIN messages m ON m.conversation_id = c.id AND m.role = 'user'
LEFT JOIN feedback f ON f.conversation_id = c.id
WHERE u.tenant_id = $company_id
GROUP BY u.id, u.name, u.email;
```

---

## UI Mockup

### Analytics Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│ Analytics                                                    │
├─────────────────────────────────────────────────────────────┤
│ Filters:                                                     │
│ [Company: All ▼] [Date: Last 30 days ▼] [Apply]             │
├─────────────────────────────────────────────────────────────┤
│ Overview Cards:                                              │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│ │ Users    │ │ Convs    │ │ Messages │ │ Feedback │        │
│ │   125    │ │   450    │ │  2,340   │ │ 👍 89%   │        │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
├─────────────────────────────────────────────────────────────┤
│ Usage by Company:                                            │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ Company        │ Users │ Convs │ Msgs  │ Feedback    │   │
│ ├───────────────────────────────────────────────────────┤   │
│ │ Acme Corp      │  45   │  180  │  920  │ 👍92% 👎8%  │   │
│ │ TechStart Inc  │  32   │  120  │  580  │ 👍85% 👎15% │   │
│ │ Demo Company   │   3   │   15  │   45  │ 👍100%      │   │
│ └───────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│ [Click company row to see user-level details]               │
└─────────────────────────────────────────────────────────────┘
```

### User Detail View (after clicking company)

```
┌─────────────────────────────────────────────────────────────┐
│ ← Back to Analytics    Acme Corp - Users                     │
├─────────────────────────────────────────────────────────────┤
│ Users in Acme Corp:                                          │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ User           │ Email          │ Convs │ Feedback   │   │
│ ├───────────────────────────────────────────────────────┤   │
│ │ John Smith     │ john@acme.com  │  25   │ 👍18 👎2   │   │
│ │ Jane Doe       │ jane@acme.com  │  18   │ 👍15 👎1   │   │
│ └───────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│ [Click user row to see their conversations]                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Files to Create/Modify

### New Files:
1. `/src/app/api/admin/analytics/feedback/route.ts`
2. `/src/app/api/admin/analytics/users/route.ts`
3. `/src/app/admin/analytics/company/[id]/page.tsx`
4. `/src/components/admin/CompanyAnalyticsTable.tsx`
5. `/src/components/admin/UserAnalyticsTable.tsx`
6. `/src/components/admin/FeedbackSummary.tsx`

### Modified Files:
1. `/src/app/admin/conversations/page.tsx` - Remove demo label
2. `/src/app/admin/analytics/page.tsx` - Add filters and company table
3. `/src/app/api/admin/analytics/route.ts` - Add filter support

---

## Success Criteria

1. ✅ No "demo data" label when viewing real data
2. ✅ Can filter analytics by company
3. ✅ Can see user-level stats within a company
4. ✅ Can see feedback breakdown (positive/negative)
5. ✅ Can click through to view user's conversations
6. ✅ Date range filtering works

---

## Estimated Scope

- **Demo Label Fix**: 2 files, minor changes
- **Analytics API**: 3 endpoints (1 new, 2 modified)
- **Analytics UI**: 3 new components, 2 modified pages
- **User Detail**: 1 new page

