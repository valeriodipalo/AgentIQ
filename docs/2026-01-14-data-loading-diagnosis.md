# Data Loading Issue - Deep Analysis and Resolution Plan

## Date: 2026-01-14
## Issue: Production API not returning data from database

---

## Executive Summary

The platform deployed to Vercel at `https://agent-iq-rose.vercel.app` was unable to retrieve data from the Supabase database. A fix was applied on 2026-01-13 (commit `1b6317c`) but verification was not completed.

---

## Root Cause Analysis

### The Architecture Problem

The application uses a **hybrid authentication model**:

1. **Frontend**: Uses `localStorage` for session management (custom sessions, not Supabase Auth)
2. **Backend**: API routes were using Supabase client that expects Supabase Auth

### The RLS Policy Conflict

```
┌─────────────────────────────────────────────────────────────────┐
│                        REQUEST FLOW                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  User (no Supabase Auth)                                        │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────────┐                                           │
│  │ API Route       │                                           │
│  │ /api/chatbots   │                                           │
│  └────────┬────────┘                                           │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────┐                                           │
│  │createServerClient│ ◄── Uses ANON key, respects RLS          │
│  └────────┬────────┘                                           │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────┐                                           │
│  │ Supabase RLS    │                                           │
│  │ auth.uid()=NULL │ ◄── No Supabase session = NULL user       │
│  └────────┬────────┘                                           │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────┐                                           │
│  │ BLOCKED!        │ ◄── RLS policies deny access              │
│  │ Empty results   │                                           │
│  └─────────────────┘                                           │
└─────────────────────────────────────────────────────────────────┘
```

### Why RLS Blocks Queries

The RLS policies on tables like `chatbots`, `conversations`, `messages` are typically:
- `auth.uid() = user_id` - Requires authenticated Supabase user
- Since the app uses localStorage sessions, `auth.uid()` returns `NULL`
- Policy evaluation: `NULL = user_id` → FALSE → Row blocked

### The Fix Applied

The fix switches to `createAdminClient()` (service role key) in demo mode:

```typescript
// Before (broken):
const supabase = await createServerClient(); // Respects RLS, auth.uid()=NULL

// After (fixed):
const isDemoMode = !user;
const supabase = isDemoMode ? createAdminClient() : authClient; // Bypasses RLS in demo
```

---

## Potential Failure Points

### 1. Missing Environment Variable
- `SUPABASE_SERVICE_ROLE_KEY` might not be set in Vercel
- `createAdminClient()` throws error if key missing (line 55-57 in server.ts)

### 2. Vercel Deployment State
- Deployment might be using cached build without the fix
- Environment variables might not be propagated

### 3. Demo Data Missing
- Demo tenant `00000000-0000-0000-0000-000000000001` might not have chatbots
- Demo user `00000000-0000-0000-0000-000000000002` might not have conversations

### 4. Column Reference Errors
- `avatar_url` column was being queried but doesn't exist (fixed in same commit)

---

## Step-by-Step Verification Plan

### STEP 1: Test API Endpoints Directly

**Action:** Run curl commands against production API

```bash
# Test chatbots endpoint
curl -s https://agent-iq-rose.vercel.app/api/chatbots | jq .

# Test conversations endpoint
curl -s https://agent-iq-rose.vercel.app/api/conversations | jq .
```

**Expected Results:**
- Status 200
- JSON with `chatbots` or `conversations` array
- `demo_mode: true` flag present

**If Error:**
- `INTERNAL_ERROR` → Check Vercel function logs
- Empty array → Check demo data exists
- Network error → Check deployment status

---

### STEP 2: Check Vercel Function Logs

**Action:** Check Vercel dashboard or CLI for function errors

```bash
# Using Vercel CLI (if installed)
vercel logs agent-iq-rose.vercel.app --output json | jq '.[] | select(.type=="function")'

# Or via Dashboard:
# Vercel → Project → Functions → View Logs
```

**Look for:**
- `SUPABASE_SERVICE_ROLE_KEY is required` error
- Supabase connection errors
- Any stack traces or exceptions

---

### STEP 3: Verify Environment Variables

**Action:** Check Vercel environment variables

```bash
# Via Vercel CLI
vercel env ls

# Required variables:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY  ← CRITICAL for admin client
# - OPENAI_API_KEY
```

**If Missing:**
- Add `SUPABASE_SERVICE_ROLE_KEY` via Vercel dashboard
- Trigger new deployment after adding

---

### STEP 4: Verify Demo Data in Database

**Action:** Query Supabase directly to check demo data exists

```sql
-- Check demo tenant exists
SELECT * FROM tenants WHERE id = '00000000-0000-0000-0000-000000000001';

-- Check published chatbots for demo tenant
SELECT id, name, is_published
FROM chatbots
WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
  AND is_published = true;

-- Check demo user exists
SELECT * FROM users WHERE id = '00000000-0000-0000-0000-000000000002';

-- Check conversations for demo user
SELECT id, title
FROM conversations
WHERE user_id = '00000000-0000-0000-0000-000000000002';
```

**If Missing:**
- Run seed data migration
- Check migrations folder for demo data scripts

---

### STEP 5: Verify Deployment Has Latest Code

**Action:** Confirm deployed code matches committed fix

```bash
# Check latest commit locally
git log --oneline -3

# Should show:
# ec5b191 Add prompt history for RLS bypass fix session
# 36b50e5 Add priority task for API verification in next session
# 1b6317c Fix RLS bypass: use admin client for demo/session-based auth

# Check Vercel deployment
# Vercel Dashboard → Deployments → Check Git Commit SHA
```

**If Mismatch:**
- Trigger manual redeploy: `vercel --prod`
- Or push empty commit to trigger CI

---

### STEP 6: Test Full User Flow

**Action:** Walk through the complete user journey

1. Open `https://agent-iq-rose.vercel.app/`
2. Enter an invite code (or navigate to chatbots page)
3. Verify chatbots list loads
4. Start a conversation
5. Verify messages are saved and loaded

**Note:** Use browser DevTools Network tab to inspect API responses

---

## Files Modified in Fix

| File | Change |
|------|--------|
| `src/app/api/chatbots/route.ts` | Added admin client for demo mode |
| `src/app/api/chatbots/[id]/route.ts` | Created new route with admin client |
| `src/app/api/conversations/route.ts` | Added admin client for all methods |
| `src/app/api/companies/[id]/chatbots/route.ts` | Removed invalid `avatar_url` column |

---

## Potential Additional Fixes Needed

### If API Still Fails After Verification

1. **Check RLS Policies in Supabase Dashboard**
   - Navigate to Authentication → Policies
   - Verify policies allow service role access

2. **Test Admin Client Locally**
   ```bash
   cd ai-assistant-platform && npm run dev
   # Then test: curl http://localhost:3000/api/chatbots
   ```

3. **Add Debug Logging**
   - Temporarily add `console.log` statements
   - Deploy and check Vercel function logs

4. **Verify Service Role Key Format**
   - Key should start with `eyJ...`
   - No trailing whitespace or newlines

---

## Conclusion

The root cause was an **authentication model mismatch** between the frontend (localStorage sessions) and backend (RLS expecting Supabase Auth). The fix correctly switches to admin client for demo mode.

**Recommended next steps:**
1. Execute STEP 1-6 in order
2. Document findings after each step
3. If all passes, delete the priority task from CLAUDE.md
4. If issues remain, implement additional fixes as documented above
