# Admin Conversations API Endpoint

## Date: 2026-01-13
## Feature: Admin Conversations Browsing API

---

## Overview

Create an admin API endpoint for browsing all conversations with comprehensive filtering, searching, and aggregation capabilities. This endpoint will be used by the admin panel to view and analyze chat conversations across the platform.

## Approach

### Files to Create

1. **`/ai-assistant-platform/src/app/api/admin/conversations/route.ts`**
   - GET endpoint for listing conversations with filters
   - Support for multiple filter parameters
   - Pagination support
   - Aggregation of message counts and feedback

2. **`/ai-assistant-platform/src/app/api/admin/conversations/[id]/route.ts`**
   - GET endpoint for single conversation detail
   - Full message history with feedback
   - Related entity information (user, chatbot, tenant)

### Filter Parameters (List Endpoint)

| Parameter | Type | Description |
|-----------|------|-------------|
| `company_id` | UUID | Filter by tenant_id |
| `chatbot_id` | UUID | Filter by chatbot/agent |
| `user_id` | UUID | Filter by user |
| `search` | string | Search in conversation title |
| `has_feedback` | boolean | Filter conversations with/without feedback |
| `page` | number | Page number (default: 1) |
| `per_page` | number | Items per page (default: 20) |
| `sort_by` | string | Sort field (created_at, updated_at) |
| `sort_order` | string | Sort direction (asc, desc) |

### Response Structure (List)

```typescript
{
  conversations: [{
    id: string,
    title: string,
    created_at: string,
    updated_at: string,
    company: { id: string, name: string },
    user: { id: string, email: string },
    chatbot: { id: string, name: string } | null,
    message_count: number,
    feedback_summary: {
      positive: number,
      negative: number,
      total: number
    }
  }],
  pagination: {
    page: number,
    per_page: number,
    total: number,
    total_pages: number
  }
}
```

### Response Structure (Detail)

```typescript
{
  conversation: {
    id: string,
    title: string,
    created_at: string,
    updated_at: string,
    company: { id: string, name: string, slug: string },
    user: { id: string, email: string, full_name: string },
    chatbot: { id: string, name: string, model: string } | null,
    messages: [{
      id: string,
      role: string,
      content: string,
      created_at: string,
      feedback: { rating: string, notes: string } | null
    }],
    feedback_summary: {
      positive: number,
      negative: number,
      total: number
    }
  }
}
```

### Database Relationships

```
conversations.tenant_id → tenants.id
conversations.user_id → users.id
conversations.chatbot_id → chatbots.id
messages.conversation_id → conversations.id
feedback.message_id → messages.id
```

## Components Involved

- Supabase admin client (server.ts)
- Database tables: conversations, users, chatbots, tenants, messages, feedback
- TypeScript types from database.ts

## Dependencies

- Existing admin client setup in `/lib/supabase/server.ts`
- Database schema with all required tables
- TypeScript types for database entities

## Considerations

- Use admin client to bypass RLS for cross-tenant queries
- Efficient pagination with count queries
- Proper error handling for invalid filters
- Sort order validation
- Handle null chatbot_id gracefully (conversations without assigned chatbot)
