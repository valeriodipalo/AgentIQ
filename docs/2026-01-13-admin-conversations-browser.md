# Admin Conversations Browser Implementation

## Date: 2026-01-13

## Feature Overview

Create an admin conversations browser with comprehensive filtering and a detailed conversation view. This enables administrators to browse, search, and analyze all conversations across companies, users, and chatbots.

## Components to Create

### 1. Conversations List Page (`/admin/conversations/page.tsx`)

**Purpose:** Display a searchable, filterable list of all conversations across the platform.

**Features:**
- Comprehensive filters:
  - Company dropdown (filter by tenant)
  - Agent/Chatbot dropdown
  - User dropdown
  - Date range picker (start/end date)
  - Has feedback toggle (yes/no/all)
- Search by conversation title
- Table columns:
  - Title
  - Company name
  - User name/email
  - Agent/Chatbot name
  - Message count
  - Feedback summary (thumbs up/down counts)
  - Created date
- Click row to navigate to detail view
- Pagination with page info

**API Endpoint:** `GET /api/admin/conversations` (already exists)

### 2. Conversation Detail Page (`/admin/conversations/[id]/page.tsx`)

**Purpose:** Display full conversation details with all messages and feedback.

**Features:**
- Header section:
  - Conversation title
  - Company (tenant) info
  - User info
  - Agent/Chatbot info
  - Created/Updated timestamps
- Chat-style message display:
  - Alternating user/assistant messages
  - Styled similarly to `/chat` page
  - Feedback indicators on assistant messages (thumbs up/down with notes)
- Metadata panel:
  - Total message count
  - Feedback summary (positive/negative/total)
  - Token usage (if available)
  - Model used per message

**API Endpoint:** `GET /api/admin/conversations/[id]` (already exists)

## Technical Approach

### Patterns to Follow
- List page pattern from `/admin/chatbots/page.tsx`
  - Debounced search
  - Pagination state management
  - Table with hover states
  - Loading and error states
- Message display pattern from `/chat/page.tsx` and `ChatMessage.tsx`
  - Avatar icons for user/assistant
  - Markdown rendering for assistant messages
  - Feedback button display

### State Management
- Local state with useState for:
  - Filter values (company, agent, user, date range, has_feedback)
  - Search query with debouncing
  - Pagination (page, per_page)
  - Loading/error states
  - Conversation data

### Styling
- Tailwind CSS with dark mode support
- Match existing admin panel aesthetics
- Responsive design for mobile/desktop

## Dependencies
- Existing UI components: Button, Input
- Icons from lucide-react
- Existing API endpoints (no backend changes needed)

## Files to Create
1. `/ai-assistant-platform/src/app/admin/conversations/page.tsx`
2. `/ai-assistant-platform/src/app/admin/conversations/[id]/page.tsx`

## Files to Modify
1. `/ai-assistant-platform/src/app/admin/layout.tsx` - Add "Conversations" nav item

## Implementation Notes
- Use same dark mode color scheme as existing admin pages
- Filter dropdowns will need to fetch available options (companies, users, chatbots)
- Date inputs use native date picker for simplicity
- Conversation detail includes read-only view of messages (no interaction)
