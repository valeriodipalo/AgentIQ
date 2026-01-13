# Admin & User Platform - Multi-Agent Chatbot System

## Date: 2026-01-13
## Request: Transform platform into admin/user system with customizable chatbots

---

## Feature Overview

Create a two-sided platform:
1. **Admin UI**: Manage chatbots, view user activity and usage analytics
2. **User UI**: Select and chat with published chatbots, provide feedback

---

## Detailed Requirements

### Admin Side

| Feature | Description |
|---------|-------------|
| **Chatbot Creation** | Create chatbots with: name, system prompt, model, temperature, max_tokens, other params |
| **Chatbot Management** | Edit, publish/unpublish, delete chatbots |
| **Usage Analytics** | View user activity, conversations, token usage, costs |
| **User Management** | View registered users and their usage |

### User Side

| Feature | Description |
|---------|-------------|
| **Chatbot Selection** | Browse and select from published chatbots |
| **Chat Interface** | Chat with selected chatbot (existing, with memory fix) |
| **Conversation History** | Start new chats, save, and revisit past conversations |
| **Feedback System** | Thumbs up/down + written notes per message |

---

## Database Schema Changes

### New Tables

```sql
-- Chatbots table (admin-created agents)
CREATE TABLE chatbots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    system_prompt TEXT NOT NULL,
    model VARCHAR(100) NOT NULL DEFAULT 'gpt-4-turbo-preview',
    temperature DECIMAL(3,2) DEFAULT 0.7,
    max_tokens INTEGER DEFAULT 2048,
    settings JSONB DEFAULT '{}',  -- Additional params
    is_published BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link conversations to chatbots
ALTER TABLE conversations ADD COLUMN chatbot_id UUID REFERENCES chatbots(id);

-- Enhanced feedback with notes
ALTER TABLE feedback ADD COLUMN notes TEXT;
```

### User Roles

```sql
-- Add role to users table
ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'user';
-- Roles: 'admin', 'user'
```

---

## UI Pages to Create

### Admin Pages
- `/admin` - Dashboard with usage overview
- `/admin/chatbots` - List/manage chatbots
- `/admin/chatbots/new` - Create chatbot form
- `/admin/chatbots/[id]` - Edit chatbot
- `/admin/analytics` - Usage analytics
- `/admin/users` - User management

### User Pages
- `/` - Landing page (updated)
- `/chatbots` - Browse available chatbots
- `/chat` - Chat interface (updated with chatbot selection)
- `/chat/[chatbotId]` - Chat with specific chatbot
- `/conversations` - User's conversation history

---

## Implementation Plan & Agent Assignment

### Phase 1: Database Schema
**Agent**: `supabase-schema-architect`
- Design and apply migrations for chatbots table
- Add chatbot_id to conversations
- Add notes to feedback
- Add role to users
- Create RLS policies for admin/user access

### Phase 2: Admin Backend APIs
**Agent**: `backend-developer`
- `/api/admin/chatbots` - CRUD for chatbots
- `/api/admin/analytics` - Usage statistics
- `/api/admin/users` - User listing
- Admin authentication middleware

### Phase 3: Admin UI
**Agent**: `frontend-developer` + `ui-designer`
- Admin layout with sidebar navigation
- Chatbot creation/edit forms
- Analytics dashboard with charts
- User activity tables

### Phase 4: User Backend Updates
**Agent**: `backend-developer`
- Update `/api/chat` to use chatbot settings
- `/api/chatbots` - List published chatbots
- `/api/conversations` - User's conversations with pagination
- Update feedback API to support notes

### Phase 5: User UI Updates
**Agent**: `frontend-developer` + `react-specialist`
- Chatbot selection page
- Updated chat interface with chatbot context
- Conversation history sidebar (real data, not mock)
- Enhanced feedback component with notes

### Phase 6: Integration & Testing
**Agent**: `fullstack-developer`
- End-to-end testing
- Fix integration issues
- Performance optimization

---

## Tech Stack Alignment

| Component | Technology |
|-----------|------------|
| Database | Supabase (PostgreSQL) - existing |
| Backend | Next.js API Routes (Edge) - existing |
| Frontend | React 19 + Tailwind CSS 4 - existing |
| Auth | Supabase Auth - existing (needs role-based access) |
| State | Zustand - existing |
| Charts | Recharts or Chart.js (new) |

---

## Execution Order

1. **Schema first** - Database changes with supabase-schema-architect
2. **Backend APIs** - Admin and user APIs with backend-developer
3. **Admin UI** - Dashboard and management with frontend-developer
4. **User UI updates** - Chatbot selection and history with react-specialist
5. **Integration** - Testing and polish with fullstack-developer

---

## Estimated Scope

| Phase | Complexity | Files |
|-------|------------|-------|
| Schema | Medium | 2-3 migrations |
| Admin Backend | Medium | 4-5 API routes |
| Admin UI | High | 6-8 pages/components |
| User Backend | Low | 2-3 API updates |
| User UI | Medium | 4-5 components |

---

## Awaiting Confirmation

Please confirm to proceed with this implementation plan. I will orchestrate the specialized agents in the order specified above.
