# Multi-Company Deployment Feature

## Date: 2026-01-13

## Overview

Transform the platform to support multiple companies (tenants), where each company has their own agents (chatbots) and users. Admins can track all interactions organized by company → agent → user → conversation.

## Current State

The database schema **already supports multi-tenancy**:
- `tenants` table (represents companies)
- `users` table with `tenant_id` FK
- `chatbots` table with `tenant_id` FK
- `conversations` table with `tenant_id`, `user_id`, and `chatbot_id` FKs

**Current data:**
- 1 tenant (demo)
- 1 user (demo)
- 7 chatbots
- 18 conversations
- 65 messages
- 2 feedback records

## Requirements

### Phase 1: Admin Company Management (No Auth)
1. **Company (Tenant) Management**
   - List all companies
   - Create new company
   - Edit company details (name, slug, branding)
   - View company dashboard with stats

2. **User Management per Company**
   - List users by company
   - Create users (name, email) within a company
   - Assign user roles (admin/user)
   - View user activity

3. **Agent Assignment**
   - Agents (chatbots) are already tied to companies via `tenant_id`
   - Admin can view which agents belong to which company

4. **Conversation Tracking**
   - View conversations filtered by: Company → Agent → User
   - Drill down into conversation details with messages and feedback

### Phase 2: Public Chat Access (No Auth)
1. **Company-Specific Chat URLs**
   - `/chat?company=<slug>` or `/<company-slug>/chat`
   - Shows only agents for that company
   - Creates conversations linked to company

2. **User Identification (No Auth)**
   - Simple name/email prompt before chat
   - Creates or reuses user record in that company
   - Tracks all conversations for that user

### Phase 3: Future Authentication (Planned)
1. **Invite System**
   - Admin sends invite to email for specific company
   - User signs up via Supabase Auth
   - User linked to company via `auth_id` in users table

2. **Access Control**
   - Users only see their company's agents
   - RLS policies enforce company isolation

## Technical Approach

### Database Changes
**No schema changes required** - the existing schema supports this:
```
tenants (companies)
├── users (employees/customers)
├── chatbots (agents)
└── conversations
    ├── user_id → who chatted
    ├── chatbot_id → which agent
    └── messages → the chat content
        └── feedback → ratings
```

### New Admin Pages

| Route | Purpose |
|-------|---------|
| `/admin/companies` | List all companies |
| `/admin/companies/new` | Create company |
| `/admin/companies/[id]` | Company dashboard |
| `/admin/companies/[id]/users` | Manage company users |
| `/admin/companies/[id]/agents` | View company agents |
| `/admin/companies/[id]/conversations` | Browse conversations |

### New API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/admin/companies` | GET, POST | List/create companies |
| `/api/admin/companies/[id]` | GET, PUT, DELETE | Company CRUD |
| `/api/admin/companies/[id]/users` | GET, POST | Company users |
| `/api/admin/companies/[id]/stats` | GET | Company statistics |
| `/api/admin/conversations` | GET | List conversations with filters |
| `/api/admin/conversations/[id]` | GET | Conversation detail |

### Chat Flow Changes

**Current:** Single demo tenant, demo user
**New:**
1. User visits `/chat?company=acme-corp`
2. System loads company by slug
3. User enters name/email (stored in localStorage + DB)
4. User selects from company's published agents
5. Conversations tracked with correct tenant_id, user_id, chatbot_id

### Admin Dashboard Hierarchy

```
Admin Dashboard
├── Companies
│   ├── Acme Corp
│   │   ├── Users (5)
│   │   ├── Agents (3)
│   │   │   ├── Support Bot
│   │   │   ├── Sales Bot
│   │   │   └── FAQ Bot
│   │   └── Conversations (150)
│   │       ├── By Agent
│   │       │   ├── Support Bot (80)
│   │       │   ├── Sales Bot (50)
│   │       │   └── FAQ Bot (20)
│   │       └── By User
│   │           ├── john@acme.com (30)
│   │           ├── jane@acme.com (25)
│   │           └── ...
│   └── Beta Inc
│       └── ...
└── Analytics (Global)
```

## Implementation Steps

### Step 1: Admin Company Management
1. Create `/admin/companies` page (list view)
2. Create `/admin/companies/new` page (form)
3. Create `/admin/companies/[id]` page (dashboard)
4. Create API endpoints for company CRUD
5. Update admin sidebar navigation

### Step 2: User Management
1. Create `/admin/companies/[id]/users` page
2. Create API endpoints for user CRUD within company
3. Add user creation form

### Step 3: Conversation Browser
1. Create `/admin/conversations` page with filters
2. Create `/admin/conversations/[id]` page (detail view)
3. Create API endpoints for conversation listing

### Step 4: Chat Flow Updates
1. Add company parameter support to chat page
2. Add user identification flow (name/email prompt)
3. Update chat API to use company context
4. Update chatbot selection to filter by company

### Step 5: Testing & Polish
1. Create sample companies and users
2. Test full flow: company → user → agent → conversation
3. Verify admin tracking works correctly

## UI Mockups

### Company List (`/admin/companies`)
```
┌─────────────────────────────────────────────────────────┐
│ Companies                              [+ New Company]  │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Acme Corp                                           │ │
│ │ acme-corp · 5 users · 3 agents · 150 conversations  │ │
│ │ [View Dashboard]                                    │ │
│ └─────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Beta Inc                                            │ │
│ │ beta-inc · 2 users · 1 agent · 30 conversations     │ │
│ │ [View Dashboard]                                    │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Company Dashboard (`/admin/companies/[id]`)
```
┌─────────────────────────────────────────────────────────┐
│ ← Back to Companies                                     │
│                                                         │
│ Acme Corp                                    [Edit]     │
│ Slug: acme-corp                                         │
├─────────────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│ │ 5 Users  │ │ 3 Agents │ │ 150 Conv │ │ 89% 👍   │    │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘    │
├─────────────────────────────────────────────────────────┤
│ Quick Links                                             │
│ [Manage Users] [View Agents] [Browse Conversations]     │
├─────────────────────────────────────────────────────────┤
│ Recent Conversations                                    │
│ • john@acme.com with Support Bot - 2 hours ago          │
│ • jane@acme.com with Sales Bot - 5 hours ago            │
└─────────────────────────────────────────────────────────┘
```

### Conversation Browser (`/admin/conversations`)
```
┌─────────────────────────────────────────────────────────┐
│ Conversations                                           │
├─────────────────────────────────────────────────────────┤
│ Filters:                                                │
│ [Company ▼] [Agent ▼] [User ▼] [Date Range] [Search]   │
├─────────────────────────────────────────────────────────┤
│ Company      │ User          │ Agent       │ Messages   │
│──────────────┼───────────────┼─────────────┼───────────│
│ Acme Corp    │ john@acme.com │ Support Bot │ 12 msgs 👍 │
│ Acme Corp    │ jane@acme.com │ Sales Bot   │ 8 msgs     │
│ Beta Inc     │ bob@beta.com  │ Helper Bot  │ 5 msgs 👎  │
└─────────────────────────────────────────────────────────┘
```

## Chat URL Structure

| URL | Behavior |
|-----|----------|
| `/chat` | Shows company selector or default demo |
| `/chat?company=acme-corp` | Direct to Acme Corp's agents |
| `/c/acme-corp` | Short URL for company chat (optional) |

## Data Model Summary

```
Company (tenant)
├── name: "Acme Corp"
├── slug: "acme-corp"
├── branding: { logo, colors }
│
├── Users
│   ├── john@acme.com (admin)
│   └── jane@acme.com (user)
│
├── Agents (chatbots)
│   ├── Support Bot
│   ├── Sales Bot
│   └── FAQ Bot
│
└── Conversations
    └── Each has: user_id, chatbot_id, messages[], feedback[]
```

## Considerations

1. **No Auth Required Initially**
   - Users identified by email (localStorage + DB)
   - Company accessed via URL parameter
   - No login/password needed

2. **Future Auth Ready**
   - `users.auth_id` column exists for Supabase Auth linking
   - RLS policies can be enabled when auth is added
   - Invite system will use email-based signup

3. **Demo Mode**
   - Keep demo company for testing
   - Demo user still works for unauthenticated access

## Awaiting Confirmation

Please confirm this approach before implementation begins.
