# Admin Chatbot Management API Routes

## Date: 2026-01-13
## Author: Backend Developer Agent

---

## Overview

This document describes the implementation of backend API routes for the admin chatbot management system in the AI Assistant Platform.

## Feature Description

Create RESTful API routes to manage chatbots within the multi-tenant platform. These routes will enable:
- Admin users to create, read, update, and delete chatbots
- Public users to list published chatbots
- Analytics endpoints for usage statistics

## API Routes to Implement

### 1. `/api/admin/chatbots/route.ts`
**Purpose**: List and create chatbots for admin users

| Method | Description |
|--------|-------------|
| GET | List all chatbots for the tenant (including unpublished) |
| POST | Create a new chatbot |

### 2. `/api/admin/chatbots/[id]/route.ts`
**Purpose**: Single chatbot operations

| Method | Description |
|--------|-------------|
| GET | Get chatbot by ID |
| PUT | Update chatbot |
| DELETE | Delete chatbot |

### 3. `/api/chatbots/route.ts`
**Purpose**: Public chatbots list for users

| Method | Description |
|--------|-------------|
| GET | List only published chatbots for the tenant |

### 4. `/api/admin/analytics/route.ts`
**Purpose**: Usage analytics for admin dashboard

| Method | Description |
|--------|-------------|
| GET | Return usage stats (conversations, messages, feedback) |

## Technical Approach

### Authentication Pattern
- Follow the demo mode pattern from `/api/chat/route.ts`
- When not authenticated, use:
  - `DEMO_USER_ID = '00000000-0000-0000-0000-000000000002'`
  - `DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000001'`

### Database Schema Reference
The `chatbots` table contains:
- `id` - UUID primary key
- `tenant_id` - Foreign key to tenants
- `name` - Chatbot display name
- `description` - Chatbot description
- `system_prompt` - Custom system prompt
- `model` - LLM model to use
- `temperature` - Generation temperature
- `max_tokens` - Maximum response tokens
- `settings` - JSON for additional settings
- `is_published` - Boolean for visibility
- `created_by` - User who created the chatbot
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

### Components Used
- `createServerClient` from `@/lib/supabase/server`
- `NextRequest`, `NextResponse` from `next/server`
- TypeScript types from `@/types`

### Error Handling
Standard error codes following existing patterns:
- `VALIDATION_ERROR` (400)
- `UNAUTHORIZED` (401)
- `FORBIDDEN` (403)
- `NOT_FOUND` (404)
- `SUPABASE_ERROR` (500)
- `INTERNAL_ERROR` (500)

## Dependencies
- Next.js App Router
- Supabase client
- Existing types from `@/types`

## Files to Create
1. `/src/app/api/admin/chatbots/route.ts`
2. `/src/app/api/admin/chatbots/[id]/route.ts`
3. `/src/app/api/chatbots/route.ts`
4. `/src/app/api/admin/analytics/route.ts`

## Testing Considerations
- All routes should work in demo mode without authentication
- Validate input parameters
- Return proper HTTP status codes
- Include TypeScript typing for all responses
