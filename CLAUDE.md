# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---
## ⚠️ PRIORITY TASK - DELETE THIS SECTION WHEN COMPLETED ⚠️

**Task:** Verify Production API Data Retrieval Fix (from session 2026-01-13)

**Context:** RLS bypass fix was deployed (commit `1b6317c`) but verification was not completed.

**Steps to Execute:**
1. Test API endpoints directly:
   ```bash
   curl -s https://agent-iq-rose.vercel.app/api/chatbots | head -100
   curl -s https://agent-iq-rose.vercel.app/api/conversations | head -100
   ```

2. If APIs return empty or error:
   - Check Vercel function logs for errors
   - Verify `SUPABASE_SERVICE_ROLE_KEY` is set in Vercel environment variables
   - Check if `createAdminClient()` is working correctly

3. If APIs return data successfully:
   - Test the full user flow: landing page → invite code → workspace
   - Confirm chatbots and conversations display correctly

4. **DELETE THIS ENTIRE SECTION** from CLAUDE.md once verified working

**Files Changed in Fix:**
- `src/app/api/chatbots/route.ts` - Added admin client for demo mode
- `src/app/api/chatbots/[id]/route.ts` - New route created
- `src/app/api/conversations/route.ts` - Added admin client for all methods
- `src/app/api/companies/[id]/chatbots/route.ts` - Removed invalid `avatar_url` column

---

## Development Workflow Rules

**Before implementing any new feature or functionality:**

1. First check the current date and time
2. Create a project document in the `/docs` folder named `YYYY-MM-DD-function-name.md`
3. In the document, describe:
   - What the feature/implementation will do
   - The approach, components and agents involved
   - Any dependencies or considerations
4. Wait for user confirmation before proceeding with implementation

This ensures alignment on requirements before any code is written.

## Project Overview

Multi-tenant AI chat platform built with Next.js 16 and Supabase. The platform enables corporate clients to deploy AI assistants with tenant-specific configurations, usage tracking, and feedback collection.

**Production URL:** https://agent-iq-rose.vercel.app

## Commands

```bash
# Development
cd ai-assistant-platform && npm run dev    # Start dev server at localhost:3000

# Build and production
cd ai-assistant-platform && npm run build  # Build for production
cd ai-assistant-platform && npm run start  # Start production server

# Linting
cd ai-assistant-platform && npm run lint   # Run ESLint
```

## Architecture

### Directory Structure

- `ai-assistant-platform/` - Next.js application (App Router)
- `migrations/` - Supabase SQL migrations and seed data

### Key Application Structure

```
ai-assistant-platform/src/
├── app/
│   ├── api/
│   │   ├── admin/
│   │   │   ├── analytics/      # Usage analytics API
│   │   │   ├── chatbots/       # Admin CRUD for chatbots
│   │   │   ├── companies/      # Company (tenant) management API
│   │   │   │   ├── route.ts    # List/create companies
│   │   │   │   └── [id]/       # Single company CRUD, users, stats
│   │   │   └── conversations/  # Conversation browser API with filters
│   │   ├── chat/route.ts       # Main chat endpoint (Edge runtime, streaming)
│   │   ├── chatbots/route.ts   # Public chatbots list endpoint
│   │   ├── companies/[slug]/   # Public company info by slug
│   │   ├── conversations/      # CRUD for conversations
│   │   ├── feedback/route.ts   # Message feedback submission
│   │   └── usage/route.ts      # Usage metrics endpoint
│   ├── admin/                  # Admin panel pages
│   │   ├── layout.tsx          # Admin sidebar layout
│   │   ├── page.tsx            # Admin dashboard
│   │   ├── analytics/          # Usage analytics
│   │   ├── chatbots/           # Chatbot management (list, new, edit)
│   │   ├── companies/          # Company management
│   │   │   ├── page.tsx        # Companies list
│   │   │   ├── new/            # Create company
│   │   │   └── [id]/           # Company dashboard, users management
│   │   └── conversations/      # Conversation browser with filters
│   ├── chat/page.tsx           # Main chat UI (supports company context)
│   ├── chatbots/page.tsx       # User control panel (chatbot selection)
│   └── page.tsx                # Landing page
├── components/
│   ├── chat/                   # Chat-specific components
│   └── ui/                     # Reusable UI components (Button, Input)
├── lib/
│   ├── config/index.ts         # Centralized configuration with env validation
│   ├── supabase/
│   │   ├── client.ts           # Browser-side Supabase client (singleton)
│   │   └── server.ts           # Server-side client + admin client
│   ├── tenant/                 # Tenant resolution utilities
│   └── usage/                  # Usage tracking helpers
├── middleware.ts               # Auth session refresh, protected routes
└── types/
    ├── index.ts                # Application types (includes ChatbotSettings)
    └── database.ts             # Supabase database types
```

### Data Flow

1. Chat requests go to `/api/chat` (Edge runtime for streaming)
2. Server validates auth via Supabase middleware
3. User's tenant and settings loaded from database
4. Messages stored in `messages` table, conversations tracked
5. Usage metrics updated via `increment_usage_metrics` RPC
6. Response streamed using Vercel AI SDK

### Database Schema

Nine main tables with RLS enabled:
- `tenants` - Organization/company accounts with settings
- `users` - User profiles linked to tenants (with `invited_via` reference)
- `invite_codes` - Invite codes for company access (code, max_uses, expires_at)
- `invite_redemptions` - Tracks which users redeemed which codes
- `chatbots` - AI assistant configurations with extended model parameters
- `conversations` - Chat sessions (linked to chatbots)
- `messages` - Individual messages in conversations
- `feedback` - User ratings on assistant messages
- `usage_metrics` - Token usage tracking per user/day/model

### Multi-Company Architecture

The platform supports multiple companies (tenants) with isolated data:

```
Company (tenant)
├── name, slug, branding
├── Invite Codes
│   ├── code, max_uses, current_uses, expires_at
│   └── Redemptions (tracks who used each code)
├── Users (employees/customers)
│   ├── name, email, role (admin/user)
│   ├── invited_via → which invite code
│   └── auth_id (for future Supabase Auth)
├── Chatbots (agents)
│   ├── Assigned to company via tenant_id
│   └── is_published controls visibility
└── Conversations
    ├── user_id → who chatted
    ├── chatbot_id → which agent
    └── messages → chat content with feedback
```

### Invite Code System

Users join companies via invite codes. The flow is:

1. **Admin creates invite code** at `/admin/companies/[id]/invites`
   - Auto-generated or custom code
   - Optional max uses and expiration date
   - Can deactivate/delete codes

2. **User enters code** on landing page (`/`)
   - Code validated via `/api/invite/validate`
   - Shows company name and branding

3. **User completes registration** at `/join?code=XXX`
   - Enters name and email
   - Code redeemed via `/api/invite/redeem`
   - Session created and stored in localStorage

4. **User accesses workspace** at `/workspace`
   - Session-based authentication (no Supabase Auth required)
   - Access to assigned chatbots
   - Conversation history

**Invite Code APIs:**
- `POST /api/invite/validate` - Check if code is valid
- `POST /api/invite/redeem` - Redeem code and create/login user
- `POST /api/invite/lookup` - Lookup existing user by email

**Admin Invite APIs:**
- `GET /api/admin/companies/[id]/invites` - List codes with stats
- `POST /api/admin/companies/[id]/invites` - Create new code
- `GET/PUT/DELETE /api/admin/companies/[id]/invites/[code]` - Manage single code

### Session Management

Sessions are stored in localStorage (key: `agent_iq_session`):

```typescript
interface UserSession {
  user: { id: string; name: string; email: string; };
  company: { id: string; name: string; slug: string; branding: {...} | null; };
  token: string;
  created_at: string;
  last_active: string;
}
```

**Session utilities** in `/src/lib/session/index.ts`:
- `getSession()` - Get current session or null
- `saveSession(session)` - Save session to localStorage
- `clearSession()` - Remove session (logout)
- `isSessionValid(session)` - Check if session is still valid (30 day expiry)

**Workspace Routes** (require valid session):
- `/workspace` - Home with chatbot list and recent conversations
- `/workspace/chat?agent=ID` - Chat with specific chatbot
- `/workspace/history` - Full conversation history

**Legacy Company Access:**
- URL pattern: `/chat?company=<slug>` still works
- User identification via name/email prompt (stored in localStorage)
- Only shows published chatbots for that company

**Admin Hierarchy:**
- `/admin/companies` - List all companies with stats
- `/admin/companies/[id]` - Company dashboard (users, agents, conversations)
- `/admin/companies/[id]/invites` - Invite code management
- `/admin/conversations` - Browse all conversations with filters (company, agent, user)

**Demo Mode:**
- Uses `DEMO_USER_ID` and `DEMO_TENANT_ID` for unauthenticated access
- Admin client bypasses RLS policies in demo mode
- Demo tenant: `00000000-0000-0000-0000-000000000001`
- Demo user: `00000000-0000-0000-0000-000000000002`

### Chatbot Configuration

Chatbots support extended model parameters stored in a `settings` JSONB column:

**Model Parameters (`settings.model_params`):**
- `top_p` - Nucleus sampling (0-1, alternative to temperature)
- `frequency_penalty` - Reduces token repetition (-2 to 2)
- `presence_penalty` - Encourages new topics (-2 to 2)

**Provider Options (`settings.provider_options`):**
- `reasoning_effort` - For reasoning models: 'none', 'low', 'medium', 'high'
- `text_verbosity` - Response detail level: 'low', 'medium', 'high'
- `store` - Store completions for retrieval

**Reasoning Models:** `o1`, `o3`, `o3-mini`, `gpt-5.1` support reasoning parameters.

### Authentication

- Supabase Auth handles authentication
- Middleware refreshes sessions on all routes
- Protected routes: `/chat`, `/api/chat`, `/api/conversations`, `/api/feedback`
- Auth enforcement currently disabled in middleware (TODO comment)

## Environment Variables

Required:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key

Server-only:
- `SUPABASE_SERVICE_ROLE_KEY` - For admin operations
- `OPENAI_API_KEY` - OpenAI API access

Optional:
- `TENANT_SLUG` - Default tenant identifier
- `OPENAI_MODEL` - Default model (defaults to gpt-4-turbo-preview)
- `NEXT_PUBLIC_APP_URL` - Application URL

## Key Technologies

- **Next.js 16** with App Router
- **Vercel AI SDK** (`ai`, `@ai-sdk/openai`, `@ai-sdk/react`) for streaming chat
- **Supabase** with `@supabase/ssr` for auth and database
- **Tailwind CSS 4** for styling
- **Zustand** for client state management
- **TypeScript 5** with strict typing

## Vercel Deployment

The app is deployed on Vercel with the following configuration:

**Project Settings (in Vercel Dashboard):**
- **Root Directory:** `ai-assistant-platform`
- **Framework Preset:** Next.js
- **Build Command:** `npm run build` (auto-detected)
- **Output Directory:** `.next` (auto-detected)

**Environment Variables (set in Vercel Dashboard):**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`

**Important Notes:**
- The `rootDirectory` setting must be configured in Vercel Dashboard, NOT in `vercel.json`
- Environment variables must be set before deployment for build-time access
- The `vercel.json` file at repository root only contains framework and region settings

## Database Migrations

Migrations are in `/migrations/` directory. Each has a corresponding rollback file. Run via Supabase CLI or dashboard SQL editor.

Key stored procedures:
- `increment_usage_metrics` - Atomic usage tracking updates
- `get_user_daily_usage` - Usage reports by date range
- `get_tenant_usage_summary` - Tenant-level aggregations

### Prompt History Documentation

**CRITICAL RULE**: When the user requests to save the prompt history, you MUST:

1. **Create a prompt history file** in the `/prompts` directory with naming format: `YYYY-MM-DD-descrizione-argomento.md`
2. **Transcribe prompts IDENTICALLY** - Copy user prompts exactly as written, word for word, without modifications
3. **Document content** must include:
   - Date and session information
   - Complete chronological list of ALL user prompts
   - Notes on any attached screenshots or images (describe what they showed)
   - Final result summary
   - List of files modified during the session
4. **Maintain original formatting** - Preserve line breaks, capitalization, punctuation exactly as the user wrote them

This ensures a complete audit trail of the conversation and decision-making process.

Example prompt history file structure:
```markdown
# Cronologia Prompt - Sessione YYYY-MM-DD

## Data: YYYY-MM-DD
## Argomento: [Brief description]

---

## Prompt 1
```
[Exact user prompt, word for word]
```

**Note:** [Any context about attached images/screenshots]

---

## Prompt 2
```
[Exact user prompt, word for word]
```

---

## Risultato Finale

**Implementazione:** [What was implemented]

**File modificati:**
- `file1.tsx` - [What changed]
- `file2.css` - [What changed]

**Documentazione:** [Link to related docs]
```

**Why this matters:**
- Creates a permanent record of the conversation flow
- Documents user requirements in their exact words
- Helps understand the reasoning behind implementation choices
- Useful for debugging or revisiting decisions later
- Provides context for code reviews and future maintenance