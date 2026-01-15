# Feature: Chatbot to Company Assignment + Invite Code Visibility

## Date: 2026-01-15
## Status: Completed

---

## Overview

Add the ability to assign chatbots to specific companies (tenants) in the admin panel, with visibility into invite codes that users need to access the workspace. Currently, all chatbots are hardcoded to the demo tenant, making multi-tenant functionality unusable.

---

## Current State

### Problems Identified

1. **Companies Page Shows Demo Notice**: `/admin/companies` displays "Viewing demo data. API endpoints for companies are not yet configured" - but the API IS working, just in demo mode
2. **No Company Selector in Chatbot Form**: When creating/editing a chatbot, there's no way to select which company it belongs to
3. **Hardcoded Demo Tenant**: Both chatbot and company APIs have `isDemoMode = true` hardcoded
4. **Ignored Query Parameter**: The "View Agents" link on company dashboard passes `?company=` but the chatbots page ignores it

### Key Files Affected

| File | Current Behavior |
|------|------------------|
| `/api/admin/chatbots/route.ts` | All chatbots assigned to `DEMO_TENANT_ID` |
| `/api/admin/companies/route.ts` | `isDemoMode = true` hardcoded |
| `/admin/chatbots/new/page.tsx` | No tenant/company selector |
| `/admin/chatbots/[id]/edit/page.tsx` | No tenant/company selector |
| `/admin/chatbots/page.tsx` | Ignores `?company=` query param |
| `/admin/companies/page.tsx` | Shows misleading demo notice |

---

## Proposed Implementation

### Phase 1: Fix Companies API (Remove Demo Mode)

**Changes to `/api/admin/companies/route.ts`:**
- Remove hardcoded `isDemoMode = true`
- Use actual authentication state to determine demo mode
- Keep admin client for RLS bypass (needed for cross-tenant queries)

**Changes to `/admin/companies/page.tsx`:**
- Update demo notice to only show when truly in demo mode
- Or remove the notice entirely since the API works

### Phase 2: Add Company Selector to Chatbot Forms

**New Component: `CompanySelector`**
- Dropdown/select that fetches available companies
- Shows company name and slug
- Required field when creating a chatbot

**Changes to `/admin/chatbots/new/page.tsx`:**
- Add CompanySelector at the top of the form
- Pass selected `tenant_id` when creating chatbot

**Changes to `/admin/chatbots/[id]/edit/page.tsx`:**
- Add CompanySelector showing current company
- Allow changing company assignment
- Show warning if chatbot has existing conversations

### Phase 3: Update Chatbot API

**Changes to `/api/admin/chatbots/route.ts`:**
- GET: Add optional `tenant_id` filter parameter
- POST: Accept `tenant_id` from request body (required)
- Remove hardcoded `DEMO_TENANT_ID` usage

**Changes to `/api/admin/chatbots/[id]/route.ts`:**
- PUT: Allow updating `tenant_id`
- Add validation to ensure tenant exists

### Phase 4: Filter Chatbots by Company

**Changes to `/admin/chatbots/page.tsx`:**
- Read `?company=` query parameter
- Add company filter dropdown
- Show company name in chatbot list table
- Update page title when filtered by company

### Phase 5: Invite Code Visibility

**Goal:** Show active invite codes in relevant admin views so admins can easily share them with users.

**Changes to `/admin/companies/page.tsx`:**
- Add "Active Codes" column showing count of active invite codes
- Show the primary/first active invite code for quick copying
- Link to full invite management page

**Changes to `/api/admin/companies/route.ts`:**
- Include `active_invite_count` in company stats
- Optionally include the first active invite code for display

**Changes to Company Selector Component:**
- Show active invite code count next to company name
- Help admins understand which companies have invite codes set up

**Existing Functionality (Already Implemented):**
- Full invite code management at `/admin/companies/[id]/invites`
- Create/edit/delete invite codes
- View redemption history
- Company dashboard has "Invite Codes" quick action

---

## Components and Dependencies

### New Components
- `CompanySelector` - Reusable company dropdown component

### APIs Used
- `GET /api/admin/companies` - Fetch companies for selector
- `POST /api/admin/chatbots` - Create with tenant_id
- `PUT /api/admin/chatbots/[id]` - Update tenant_id
- `GET /api/admin/chatbots?tenant_id=` - Filter by company

### Database
- No schema changes needed
- `chatbots.tenant_id` already exists and links to `tenants.id`

---

## UI Mockup

### Chatbot Form (New/Edit)
```
┌─────────────────────────────────────────────────────┐
│ Create New Chatbot                                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Company *                                           │
│ ┌─────────────────────────────────────────────┐    │
│ │ Select a company...                      ▼  │    │
│ └─────────────────────────────────────────────┘    │
│                                                     │
│ Name *                                              │
│ ┌─────────────────────────────────────────────┐    │
│ │                                             │    │
│ └─────────────────────────────────────────────┘    │
│                                                     │
│ ... rest of form ...                                │
└─────────────────────────────────────────────────────┘
```

### Chatbots List with Company Column
```
┌──────────────────────────────────────────────────────────────────┐
│ Chatbots                                    [+ New Chatbot]      │
├──────────────────────────────────────────────────────────────────┤
│ Filter by company: [All Companies ▼]  Search: [___________]      │
├──────────────────────────────────────────────────────────────────┤
│ Name        │ Company       │ Model          │ Status   │ Actions│
├─────────────┼───────────────┼────────────────┼──────────┼────────┤
│ Sales Bot   │ Acme Corp     │ gpt-4-turbo    │ Published│ Edit   │
│ Support AI  │ Acme Corp     │ gpt-4o         │ Draft    │ Edit   │
│ HR Helper   │ TechStart Inc │ gpt-3.5-turbo  │ Published│ Edit   │
└─────────────┴───────────────┴────────────────┴──────────┴────────┘
```

---

## Considerations

1. **Existing Chatbots**: All current chatbots are assigned to demo tenant - may need migration or manual reassignment
2. **Conversations**: When changing a chatbot's company, existing conversations remain (they link to chatbot_id, not tenant_id)
3. **Permissions**: Currently no role-based access - admin can see/edit all companies and chatbots
4. **Demo Mode**: Keep demo mode for unauthenticated users, but allow real data for authenticated admins

---

## Estimated Files to Modify

1. `/src/app/api/admin/companies/route.ts` - Remove hardcoded demo mode
2. `/src/app/api/admin/chatbots/route.ts` - Add tenant_id filter and require on POST
3. `/src/app/api/admin/chatbots/[id]/route.ts` - Allow tenant_id update
4. `/src/app/admin/chatbots/page.tsx` - Add company filter column
5. `/src/app/admin/chatbots/new/page.tsx` - Add company selector
6. `/src/app/admin/chatbots/[id]/edit/page.tsx` - Add company selector
7. `/src/app/admin/companies/page.tsx` - Update demo notice
8. `/src/components/ui/CompanySelector.tsx` - New component (if needed)

---

## Awaiting Approval

Please confirm this approach before I proceed with implementation.
