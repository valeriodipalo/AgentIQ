# UX Optimization: Invite Code Flow

## Date: 2026-01-13

## Overview

Redesign the user experience to create a seamless onboarding flow using invite codes, replacing the current URL-based company access with a more intuitive code-based system.

---

## Current State Analysis

### Current User Flow (Problems)
```
1. User receives URL: /chat?company=acme-corp
2. User visits URL
3. Modal asks for Name/Email
4. User selects chatbot
5. User starts chatting
```

**Issues:**
- URL-based access feels technical
- No sense of "joining" a workspace
- Company slug exposed in URL
- No validation that user should have access
- No memorable way to return to workspace
- Name/email modal interrupts the flow

### Current Admin Flow (Problems)
```
1. Admin creates company at /admin/companies/new
2. Admin shares URL manually
3. No tracking of who has access
4. No invite management
```

**Issues:**
- No formal invite system
- Can't revoke access
- No visibility into pending invites
- Manual URL sharing is error-prone

---

## Proposed New Flow

### User Journey

```
┌─────────────────────────────────────────────────────────────────┐
│                        LANDING PAGE                              │
│                         /                                        │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                          │    │
│  │     Welcome to Agent IQ                                  │    │
│  │                                                          │    │
│  │     ┌────────────────────────────────┐                  │    │
│  │     │  Enter your invite code        │                  │    │
│  │     │  ________________________      │                  │    │
│  │     │  |  ACME-7X9K-2024      |      │                  │    │
│  │     │  ________________________      │                  │    │
│  │     │                                │                  │    │
│  │     │       [ Join Workspace ]       │                  │    │
│  │     └────────────────────────────────┘                  │    │
│  │                                                          │    │
│  │     Already have an account? [Sign In]                  │    │
│  │                                                          │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CODE VALIDATED                                │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                          │    │
│  │     You're joining: Acme Corporation                    │    │
│  │     ─────────────────────────────────                   │    │
│  │                                                          │    │
│  │     Please enter your details:                          │    │
│  │                                                          │    │
│  │     Name                                                 │    │
│  │     ┌──────────────────────────────────┐                │    │
│  │     │  John Smith                      │                │    │
│  │     └──────────────────────────────────┘                │    │
│  │                                                          │    │
│  │     Email                                                │    │
│  │     ┌──────────────────────────────────┐                │    │
│  │     │  john@example.com                │                │    │
│  │     └──────────────────────────────────┘                │    │
│  │                                                          │    │
│  │              [ Complete Setup ]                         │    │
│  │                                                          │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    WORKSPACE CHAT                                │
│                    /workspace                                    │
│  ┌──────────┬──────────────────────────────────────────────┐    │
│  │          │                                               │    │
│  │  Acme    │   Select an Assistant                        │    │
│  │  Corp    │   ─────────────────                          │    │
│  │  ────    │                                               │    │
│  │          │   ┌─────────────┐  ┌─────────────┐           │    │
│  │  Welcome │   │  Customer   │  │    Data     │           │    │
│  │  John!   │   │  Support    │  │   Analyst   │           │    │
│  │          │   └─────────────┘  └─────────────┘           │    │
│  │          │                                               │    │
│  │ ──────── │   Recent Conversations                       │    │
│  │          │   ─────────────────────                      │    │
│  │ [Support]│   • Product inquiry - 2h ago                 │    │
│  │ [Analyst]│   • Sales report question - 1d ago           │    │
│  │          │                                               │    │
│  └──────────┴──────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### User Flow Steps

1. **Landing Page** (`/`)
   - Clean, focused interface
   - Single input: invite code
   - Optional: "Already have account" link for returning users

2. **Code Validation** (API call)
   - Validate code exists and is active
   - Return company info for confirmation
   - Handle expired/invalid codes gracefully

3. **User Registration** (inline, not modal)
   - Show company name user is joining
   - Collect name and email
   - Create user record linked to company
   - Store session in localStorage

4. **Workspace View** (`/workspace`)
   - Personalized greeting
   - Company branding (logo, colors)
   - Available chatbots as cards
   - Recent conversation history
   - Seamless transition to chat

5. **Chat Experience** (`/workspace/chat`)
   - Full-screen chat interface
   - Easy navigation back to workspace
   - Conversation auto-saved

### Returning User Flow

```
User visits /
    │
    ├─── Has valid session? ───► Redirect to /workspace
    │
    └─── No session ───► Show invite code input
                              │
                              └─── "Already joined?" link
                                        │
                                        ▼
                              Email lookup form
                                        │
                                        ▼
                              Magic link or direct access
```

---

## Admin Journey

### Company & Invite Management

```
┌─────────────────────────────────────────────────────────────────┐
│  ADMIN: Company Dashboard                                        │
│  /admin/companies/[id]                                          │
│  ────────────────────────────────────────────────────────────── │
│                                                                  │
│  Acme Corporation                               [Edit] [Delete] │
│  ═══════════════════                                            │
│                                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ 12 Users │ │ 3 Agents │ │ 45 Chats │ │ 92% 👍   │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  INVITE CODES                                    [+ New]    ││
│  │  ───────────────────────────────────────────────────────── ││
│  │                                                             ││
│  │  Code          │ Created    │ Uses    │ Expires  │ Status  ││
│  │  ─────────────────────────────────────────────────────────  ││
│  │  ACME-7X9K     │ Jan 10     │ 5/10    │ Jan 31   │ Active  ││
│  │  ACME-Q2RT     │ Jan 5      │ 10/10   │ -        │ Full    ││
│  │  ACME-DEMO     │ Dec 15     │ 2/∞     │ -        │ Active  ││
│  │                                                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  ASSIGNED AGENTS                              [+ Assign]    ││
│  │  ───────────────────────────────────────────────────────── ││
│  │                                                             ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         ││
│  │  │  Customer   │  │    Data     │  │   Sales     │         ││
│  │  │  Support ✓  │  │  Analyst ✓  │  │   Bot ✓     │         ││
│  │  └─────────────┘  └─────────────┘  └─────────────┘         ││
│  │                                                             ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### Create Invite Code Modal

```
┌─────────────────────────────────────────────────────────────────┐
│  Create Invite Code                                      [X]    │
│  ═══════════════════                                            │
│                                                                  │
│  Code Type                                                       │
│  ○ Auto-generate (recommended)                                  │
│  ○ Custom code                                                  │
│                                                                  │
│  Usage Limit                                                     │
│  ┌─────────────────────────┐                                    │
│  │  10 uses               ▼│  □ Unlimited                       │
│  └─────────────────────────┘                                    │
│                                                                  │
│  Expiration                                                      │
│  ┌─────────────────────────┐                                    │
│  │  30 days               ▼│  □ Never expires                   │
│  └─────────────────────────┘                                    │
│                                                                  │
│  Notes (internal)                                                │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  For Q1 2026 onboarding batch                           │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│                    [ Cancel ]  [ Create Code ]                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Changes

### New Table: `invite_codes`

```sql
CREATE TABLE invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code VARCHAR(20) NOT NULL UNIQUE,
  max_uses INTEGER, -- NULL = unlimited
  current_uses INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invite_codes_code ON invite_codes(code);
CREATE INDEX idx_invite_codes_tenant ON invite_codes(tenant_id);
```

### New Table: `invite_redemptions`

```sql
CREATE TABLE invite_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_code_id UUID NOT NULL REFERENCES invite_codes(id),
  user_id UUID NOT NULL REFERENCES users(id),
  redeemed_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Users Table Update

```sql
ALTER TABLE users ADD COLUMN invited_via UUID REFERENCES invite_codes(id);
ALTER TABLE users ADD COLUMN last_active_at TIMESTAMPTZ;
```

---

## API Endpoints

### New Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/invite/validate` | POST | Validate invite code, return company info |
| `/api/invite/redeem` | POST | Redeem code, create user, return session |
| `/api/invite/lookup` | POST | Find user by email for returning users |
| `/api/admin/companies/[id]/invites` | GET, POST | List/create invite codes |
| `/api/admin/companies/[id]/invites/[code]` | GET, PUT, DELETE | Manage single invite |
| `/api/admin/companies/[id]/agents` | GET, POST, DELETE | Assign/remove agents |

### Endpoint Details

**POST /api/invite/validate**
```json
// Request
{ "code": "ACME-7X9K-2024" }

// Response (success)
{
  "valid": true,
  "company": {
    "name": "Acme Corporation",
    "branding": { "primary_color": "#2563eb", "logo_url": null }
  }
}

// Response (error)
{
  "valid": false,
  "error": "EXPIRED" | "INVALID" | "FULL" | "INACTIVE"
}
```

**POST /api/invite/redeem**
```json
// Request
{
  "code": "ACME-7X9K-2024",
  "name": "John Smith",
  "email": "john@example.com"
}

// Response
{
  "success": true,
  "user": {
    "id": "uuid",
    "name": "John Smith",
    "email": "john@example.com"
  },
  "company": {
    "id": "uuid",
    "name": "Acme Corporation",
    "slug": "acme-corp"
  },
  "session_token": "..." // For localStorage
}
```

---

## New Pages

### User-Facing

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | Landing page | Invite code entry |
| `/join` | Join flow | Code validation + user registration |
| `/workspace` | Workspace home | Company dashboard, agent selection |
| `/workspace/chat` | Chat interface | Full chat experience |
| `/workspace/history` | Conversation history | Past conversations |

### Admin

| Route | Component | Purpose |
|-------|-----------|---------|
| `/admin/companies/[id]/invites` | Invite management | Create/manage invite codes |
| `/admin/companies/[id]/agents` | Agent assignment | Assign chatbots to company |

---

## Component Structure

```
src/
├── app/
│   ├── (public)/
│   │   ├── page.tsx              # Landing with invite code input
│   │   └── join/
│   │       └── page.tsx          # Join flow (validate + register)
│   ├── workspace/
│   │   ├── layout.tsx            # Workspace layout with sidebar
│   │   ├── page.tsx              # Workspace home
│   │   ├── chat/
│   │   │   └── page.tsx          # Chat interface
│   │   └── history/
│   │       └── page.tsx          # Conversation history
│   └── admin/
│       └── companies/
│           └── [id]/
│               ├── invites/
│               │   └── page.tsx  # Invite management
│               └── agents/
│                   └── page.tsx  # Agent assignment
├── components/
│   ├── invite/
│   │   ├── InviteCodeInput.tsx   # Code input with validation
│   │   ├── JoinForm.tsx          # Name/email form
│   │   └── CompanyPreview.tsx    # Show company being joined
│   ├── workspace/
│   │   ├── WorkspaceSidebar.tsx  # User sidebar
│   │   ├── AgentCard.tsx         # Clickable agent card
│   │   └── ConversationList.tsx  # Recent conversations
│   └── admin/
│       ├── InviteCodeTable.tsx   # List of invite codes
│       ├── CreateInviteModal.tsx # Create invite form
│       └── AgentAssignment.tsx   # Agent toggle list
└── lib/
    ├── session/
    │   ├── index.ts              # Session management
    │   └── storage.ts            # localStorage helpers
    └── invite/
        └── generator.ts          # Code generation logic
```

---

## Session Management

### localStorage Structure

```typescript
interface UserSession {
  user: {
    id: string;
    name: string;
    email: string;
  };
  company: {
    id: string;
    name: string;
    slug: string;
    branding: {
      primary_color?: string;
      logo_url?: string;
    };
  };
  token: string; // Simple session token
  created_at: string;
  last_active: string;
}

// Storage key
const SESSION_KEY = 'agent_iq_session';
```

### Session Flow

```
1. User redeems invite → API creates user + returns session
2. Frontend stores session in localStorage
3. On page load:
   - Check localStorage for session
   - Validate session with API (optional ping)
   - Redirect appropriately
4. On logout: Clear localStorage
```

---

## Invite Code Format

**Format:** `{PREFIX}-{RANDOM}-{YEAR}` or `{PREFIX}-{RANDOM}`

**Examples:**
- `ACME-7X9K-2024` (with year)
- `ACME-Q2RT` (short)
- `DEMO-TRIAL` (custom)

**Generation Logic:**
```typescript
function generateInviteCode(companySlug: string): string {
  const prefix = companySlug.toUpperCase().slice(0, 4);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${random}`;
}
```

---

## Implementation Steps

### Phase 1: Database & API Foundation
1. Create `invite_codes` and `invite_redemptions` tables
2. Update `users` table with new columns
3. Implement invite validation API
4. Implement invite redemption API
5. Implement admin invite CRUD API

### Phase 2: User-Facing Flow
1. Redesign landing page with invite code input
2. Create join flow page
3. Create workspace layout and home
4. Migrate chat to workspace/chat
5. Implement session management

### Phase 3: Admin Features
1. Create invite management page
2. Create invite code modal
3. Update company dashboard with invites section
4. Create agent assignment interface

### Phase 4: Polish & Testing
1. Add loading states and animations
2. Implement error handling
3. Add email validation
4. Test full flow end-to-end
5. Mobile responsiveness

---

## UX Considerations

### Success States
- Smooth transitions between steps
- Clear confirmation when joining
- Personalized welcome message
- Company branding throughout

### Error States
- Invalid code: "This code doesn't exist. Check for typos."
- Expired code: "This invite has expired. Contact your admin."
- Full code: "This invite has reached its limit."
- Email exists: "This email is already registered. [Sign in instead]"

### Accessibility
- Clear focus states on inputs
- Screen reader announcements
- Keyboard navigation
- Color contrast compliance

### Mobile
- Touch-friendly code input
- Responsive workspace layout
- Swipe gestures in chat
- Bottom navigation on mobile

---

## Migration Plan

1. Deploy database changes
2. Deploy new APIs (backward compatible)
3. Deploy new pages (new routes, no conflicts)
4. Create invite codes for existing companies
5. Update landing page to new flow
6. Deprecate old `/chat?company=` flow
7. Redirect old URLs to invite flow

---

## Awaiting Confirmation

Please confirm this approach before implementation begins. Key decisions to validate:

1. **Invite code format** - Is `PREFIX-RANDOM` format acceptable?
2. **Session management** - localStorage vs cookies?
3. **Returning users** - Email lookup or require code again?
4. **URL structure** - `/workspace` vs `/app` vs keep `/chat`?
5. **Scope** - Implement all phases or start with Phase 1-2?
