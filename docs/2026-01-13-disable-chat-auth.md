# Disable Chat Authentication for Testing

## Date: 2026-01-13
## Feature: Bypass authentication in chat API for testing

---

## What was implemented

Temporarily disabled authentication requirements in the `/api/chat` endpoint to allow testing the fundamental chat functionality without requiring user login.

## Changes Made

### 1. Database Setup
- Created demo tenant (id: `00000000-0000-0000-0000-000000000001`, slug: `demo`)
- Created demo user (id: `00000000-0000-0000-0000-000000000002`, email: `demo@example.com`)

### 2. Chat Route (`/api/chat/route.ts`)
- Modified authentication check to use demo user/tenant when not authenticated
- Uses admin client (service role) to bypass RLS for demo mode
- Fixed schema mismatches:
  - `loadTenantSettings()` now queries `llm_model`, `temperature`, `max_tokens`, `system_prompt` columns
  - `getOrCreateConversation()` now uses `is_archived` instead of `status`

### 3. Schema Fixes (TypeScript types and routes)
- Updated `src/types/database.ts` to match actual Supabase schema
- Updated `src/types/index.ts` - `Conversation` interface uses `is_archived` boolean
- Updated all conversation routes to use `is_archived` instead of `status` column
- Updated feedback route to convert rating to/from integer (-1/1)
- Updated usage route to return empty data (usage_metrics table not implemented)

### 4. Files Modified
- `src/app/api/chat/route.ts`
- `src/app/api/conversations/route.ts`
- `src/app/api/conversations/[id]/route.ts`
- `src/app/api/conversations/[id]/messages/route.ts`
- `src/app/api/feedback/route.ts`
- `src/app/api/usage/route.ts`
- `src/lib/usage/index.ts`
- `src/types/database.ts`
- `src/types/index.ts`

## Testing

The app should now allow unauthenticated users to use the chat feature with the demo tenant.

## TODO for Production

- Re-enable authentication in chat route
- Implement `usage_metrics` table and RPC functions
- Add proper user registration flow
