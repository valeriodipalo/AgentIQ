# Admin Conversation Evaluation Feature

## Date: 2026-01-13

## Overview

Add comprehensive conversation evaluation capabilities to the admin dashboard, allowing administrators to review and analyze chat conversations, view feedback, and assess chatbot performance.

## Feature Requirements

### 1. Conversation Browser Page (`/admin/conversations`)

A new admin page to browse and filter all conversations:

**Filtering & Organization:**
- **By Chatbot (Agent)**: Primary filter - select which chatbot's conversations to view
- **By User**: Secondary filter - filter conversations by user
- **By Date Range**: Start and end date pickers
- **By Feedback Status**: All / Has Positive / Has Negative / Has Notes / No Feedback

**List View:**
- Conversation title (or first message preview)
- Chatbot name (badge)
- User identifier
- Message count
- Feedback summary (thumbs up/down counts)
- Created date
- Last activity date

### 2. Conversation Detail View (`/admin/conversations/[id]`)

View a complete conversation with all messages and feedback:

**Message Display:**
- Full chat thread with user and assistant messages
- Proper styling to differentiate roles
- Timestamps for each message
- Message IDs for reference

**Feedback Display (per assistant message):**
- Feedback rating (positive/negative) indicator
- User notes if provided
- Timestamp of feedback

**Conversation Metadata:**
- Chatbot used
- User info
- Conversation duration
- Total tokens used (if tracked)

### 3. Feedback Analytics Enhancement

Enhance the existing `/admin/analytics` page:

**New Metrics:**
- Feedback by chatbot (breakdown per agent)
- Feedback trends over time (chart)
- Common feedback patterns
- Messages with notes (for qualitative review)

**Feedback Details Table:**
- List of all feedback with:
  - Message preview
  - Rating
  - Notes
  - User
  - Chatbot
  - Date

## Technical Approach

### Database Queries

**Conversations with Feedback Aggregation:**
```sql
SELECT
  c.id,
  c.title,
  c.created_at,
  c.updated_at,
  cb.name as chatbot_name,
  cb.id as chatbot_id,
  u.email as user_email,
  COUNT(m.id) as message_count,
  COUNT(CASE WHEN f.rating = 1 THEN 1 END) as positive_feedback,
  COUNT(CASE WHEN f.rating = -1 THEN 1 END) as negative_feedback,
  COUNT(CASE WHEN f.notes IS NOT NULL THEN 1 END) as notes_count
FROM conversations c
LEFT JOIN chatbots cb ON c.chatbot_id = cb.id
LEFT JOIN users u ON c.user_id = u.id
LEFT JOIN messages m ON m.conversation_id = c.id
LEFT JOIN feedback f ON f.message_id = m.id
WHERE c.tenant_id = $tenant_id
GROUP BY c.id, cb.name, cb.id, u.email
ORDER BY c.updated_at DESC;
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/conversations` | GET | List conversations with filters |
| `/api/admin/conversations/[id]` | GET | Get conversation detail with messages and feedback |
| `/api/admin/feedback` | GET | List all feedback with filters |

### Components to Build

**New Files:**
- `src/app/admin/conversations/page.tsx` - Conversation list page
- `src/app/admin/conversations/[id]/page.tsx` - Conversation detail page
- `src/app/api/admin/conversations/route.ts` - Conversations API
- `src/app/api/admin/conversations/[id]/route.ts` - Single conversation API

**Modified Files:**
- `src/app/admin/layout.tsx` - Add navigation link
- `src/app/admin/analytics/page.tsx` - Add feedback breakdown section

### UI Components

**ConversationList:**
- Table with sortable columns
- Pagination (20 per page)
- Quick filters (chatbot dropdown, date range)
- Search by conversation title

**ConversationViewer:**
- Chat-style message display
- Feedback indicators on assistant messages
- Collapsible metadata panel
- Export conversation button (optional)

**FeedbackBadge:**
- Small component showing feedback status
- Clickable to show notes in tooltip

## Implementation Steps

1. **Create API endpoints** for admin conversations
2. **Build conversation list page** with filtering
3. **Build conversation detail page** with message viewer
4. **Add navigation** to admin sidebar
5. **Enhance analytics page** with feedback breakdown
6. **Add feedback detail table** to analytics

## Dependencies

- Existing admin layout and styling
- Supabase queries with joins
- Existing chatbot and user data

## Considerations

- **Performance**: Conversations list could be large - implement proper pagination and lazy loading
- **Privacy**: Ensure tenant isolation in all queries
- **Demo Mode**: Support unauthenticated demo access with sample data
- **RLS**: May need to use admin client for cross-table queries

## Mockup Structure

```
/admin/conversations
├── Filter Bar: [Chatbot ▼] [User ▼] [Date Range] [Feedback ▼] [Search...]
├── Conversations Table
│   ├── Row: "How to reset password" | Support Bot | user@example.com | 8 msgs | 👍2 👎0 | Jan 13
│   ├── Row: "Product inquiry" | Sales Bot | demo@test.com | 12 msgs | 👍1 👎1 📝 | Jan 12
│   └── ...
└── Pagination: [< 1 2 3 ... >]

/admin/conversations/[id]
├── Header: "How to reset password" - Support Bot - user@example.com
├── Chat Messages
│   ├── User: "I forgot my password"
│   ├── Assistant: "I can help you reset..." [👍 Rated Positive]
│   ├── User: "Thanks, that worked!"
│   └── Assistant: "You're welcome..." [👍 Rated Positive] [📝 "Very helpful response"]
└── Metadata Panel: Created: Jan 13 | Messages: 4 | Duration: 5 min
```

## Awaiting Confirmation

Please confirm this approach before implementation begins.
