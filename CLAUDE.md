# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
│   │   ├── chat/route.ts       # Main chat endpoint (Edge runtime, streaming)
│   │   ├── conversations/      # CRUD for conversations
│   │   ├── feedback/route.ts   # Message feedback submission
│   │   └── usage/route.ts      # Usage metrics endpoint
│   ├── chat/page.tsx           # Main chat UI (client component)
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
    ├── index.ts                # Application types
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

Six main tables with RLS enabled:
- `tenants` - Organization/company accounts with settings
- `users` - User profiles linked to tenants
- `conversations` - Chat sessions
- `messages` - Individual messages in conversations
- `feedback` - User ratings on assistant messages
- `usage_metrics` - Token usage tracking per user/day/model

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