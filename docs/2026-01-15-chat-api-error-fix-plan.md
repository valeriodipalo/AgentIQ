# Plan: Fix Chat API "Message Required" Error

## Date: 2026-01-15
## Status: RESOLVED - Awaiting Deployment
## Priority: CRITICAL

---

## Error Description

```
Failed to load resource: the server responded with a status of 400 ()
Chat error: Error: {"code":"VALIDATION_ERROR","message":"Message is required and must be a non-empty string"}
```

---

## Root Cause Analysis

### Current State
- **Fix was committed**: `0d21915` - "Fix chat API to support AI SDK v6 format"
- **Fix was pushed to GitHub**: Confirmed
- **Deployment Status**: OLD version still running (API docs don't show `user_id` or `messages` support)

### The Problem
The frontend uses AI SDK v6 `useChat` hook which sends:
```json
{
  "messages": [{ "role": "user", "content": "Hello" }],
  "user_id": "...",
  "chatbot_id": "..."
}
```

But the OLD deployed backend expects:
```json
{
  "message": "Hello"
}
```

---

## Agent Orchestration Plan

### Phase 1: Error Detective - Verify Root Cause
**Agent**: `error-detective`
**Objective**: Confirm the mismatch between frontend request format and backend expectation

**Tasks**:
1. Analyze the frontend `useChat` implementation in `/src/app/workspace/chat/page.tsx`
2. Verify the `sendMessage` call format at lines 168-178
3. Confirm AI SDK v6 sends `messages` array, not single `message` field
4. Document the exact request payload being sent

**Expected Output**:
- Confirmation that frontend sends `{ messages: [...], user_id, chatbot_id }`
- Confirmation that backend expects `{ message: "..." }`

---

### Phase 2: Debugger - Verify Fix Implementation
**Agent**: `debugger`
**Objective**: Validate that the committed fix correctly handles both formats

**Tasks**:
1. Review `/src/app/api/chat/route.ts` for the fix implementation
2. Verify the `ExtendedChatRequest` interface includes `messages?: AISDKMessage[]`
3. Verify the message extraction logic handles both formats:
   - Legacy: `message` field
   - AI SDK: `messages` array (extract last user message)
4. Verify `user_id` session mode handling
5. Run local build to confirm no TypeScript errors

**Validation Checklist**:
- [ ] `AISDKMessage` interface defined
- [ ] `messages` field in `ExtendedChatRequest`
- [ ] Message extraction from `messages` array works
- [ ] `user_id` validation and tenant lookup works
- [ ] Build passes without errors

---

### Phase 3: Fullstack Developer - Verify Deployment
**Agent**: `fullstack-developer`
**Objective**: Ensure the fix is properly deployed to production

**Tasks**:
1. Check Vercel deployment dashboard for deployment status
2. Verify the latest commit `0d21915` was deployed
3. If deployment failed, identify the cause
4. If deployment succeeded but not live, check for caching issues
5. Trigger manual redeployment if necessary

**Deployment Verification**:
```bash
# Check if new API shows user_id support
curl -s https://agent-iq-rose.vercel.app/api/chat | grep -q "user_id"
```

---

### Phase 4: Fullstack Developer - End-to-End Test
**Agent**: `fullstack-developer`
**Objective**: Test the complete chat flow after deployment

**Tasks**:
1. Access https://agent-iq-rose.vercel.app/
2. Login with a test user via invite code
3. Navigate to workspace
4. Select a published chatbot
5. Send a test message
6. Verify response is received
7. Check browser console for any errors

**Test Cases**:
- [ ] New conversation with message works
- [ ] Existing conversation continuation works
- [ ] Message appears in conversation history
- [ ] No 400 errors in console

---

## Immediate Actions

### Action 1: Check Vercel Deployment (Manual)
The user should:
1. Go to https://vercel.com/dashboard
2. Find the AgentIQ project
3. Check if deployment for commit `0d21915` succeeded
4. If failed, check build logs for errors

### Action 2: Force Redeployment (If Needed)
```bash
# From repo root
git commit --allow-empty -m "Trigger redeployment"
git push origin main
```

### Action 3: Local Testing (While Waiting)
```bash
cd ai-assistant-platform
npm run dev
# Then test at http://localhost:3000
```

---

## Files Involved

| File | Status | Purpose |
|------|--------|---------|
| `/src/app/api/chat/route.ts` | Modified | Handle AI SDK message format |
| `/src/app/workspace/chat/page.tsx` | Unchanged | Frontend chat interface |
| `/src/app/admin/chatbots/new/page.tsx` | Modified | Default values |
| `/src/app/api/admin/chatbots/route.ts` | Modified | Default values |

---

## Success Criteria

1. Chat API returns 200 status on valid requests
2. Messages are sent and responses received
3. Conversation history is properly saved
4. No "Message is required" errors in console

---

## Agent Findings

### Debugger Agent - Fix Verification
**Status: VERIFIED CORRECT**

The fix properly handles both formats:
- `AISDKMessage` interface defined
- `messages` array field added to `ExtendedChatRequest`
- Message extraction logic correctly:
  1. First checks for `legacyMessage` (single `message` field)
  2. Falls back to extracting last user message from `messages` array
- `user_id` session mode handled BEFORE company mode
- Build passes without errors

### Error Detective Agent - Frontend Analysis
**Status: VERIFIED CORRECT**

Frontend correctly sends:
```json
{
  "messages": [{ "role": "user", "content": "Hello" }],
  "chatbot_id": "...",
  "conversation_id": null,
  "user_id": "...",
  "company_id": "..."
}
```

The AI SDK v6 `DefaultChatTransport` converts `{ text: input }` into the `messages` array format.

### Resolution
- **Commit `0d21915`**: Contains the correct fix
- **Commit `1267eb3`**: Empty commit to trigger redeployment
- **Action**: Wait for Vercel deployment to complete (2-3 minutes)

---

## Rollback Plan

If the fix causes other issues:
1. Revert commit: `git revert 0d21915`
2. Push: `git push origin main`
3. Investigate further with local debugging
