# Company Context Chat Flow Implementation

## Date: 2026-01-13
## Feature: URL-based Company Context for Chat Interface

---

## Summary

Update the chat flow to support company context via URL parameter. This enables companies to share direct links to their chat interface (e.g., `/chat?company=acme-corp`) where end users can interact with the company's published chatbots after providing basic identification.

---

## What This Feature Will Do

1. **Company-Scoped Chat Access**: Users can access a company's chat interface via URL parameter (`/chat?company=acme-corp`)

2. **User Identification Flow**: Before starting a chat, users are prompted for their name and email. This information is:
   - Stored in localStorage for persistence across sessions
   - Used to create/find the user record in the database

3. **Company-Filtered Chatbots**: When a company parameter is present, only that company's published chatbots are displayed for selection

4. **Database Integration**: Conversations are created with proper `tenant_id`, `user_id`, and `chatbot_id` associations

5. **Backward Compatibility**: Existing demo mode (no company parameter) continues to work as before

---

## Technical Approach

### 1. New API Endpoint: `/api/companies/[slug]/route.ts`

**Purpose**: Public endpoint to fetch company info and published chatbots by slug

**Method**: GET

**Response**:
```json
{
  "company": {
    "id": "uuid",
    "name": "Company Name",
    "slug": "company-slug",
    "branding": { ... }
  },
  "chatbots": [
    {
      "id": "uuid",
      "name": "Chatbot Name",
      "description": "...",
      "model": "gpt-4"
    }
  ]
}
```

**Security**: No authentication required (public endpoint)

### 2. Chat Page Updates (`/app/chat/page.tsx`)

**New State**:
- `companySlug`: Read from URL query parameter
- `companyInfo`: Loaded company data
- `userProfile`: User's name/email from localStorage or prompt
- `showUserPrompt`: Boolean to control user identification modal

**New Flow**:
1. Check for `company` query parameter
2. If present, fetch company info via `/api/companies/[slug]`
3. Check localStorage for saved user profile
4. If no profile, show identification modal
5. On profile submission, create/find user in database
6. Load company's published chatbots
7. Allow user to select chatbot and start conversation

**Components Added**:
- `UserIdentificationModal`: Form for name/email collection

### 3. Chat API Updates (`/api/chat/route.ts`)

**New Request Parameter**:
- `company_slug`: String (optional) - Company context for the chat

**New Logic**:
1. If `company_slug` provided:
   - Look up tenant by slug
   - Validate chatbot belongs to that tenant
   - Create/find user by email within that tenant
2. Use resolved tenant_id and user_id for conversation creation

### 4. User Creation/Lookup

**Logic**:
- Search for existing user by email within the company's tenant
- If not found, create new user with:
  - `tenant_id`: Company's tenant ID
  - `email`: Provided email
  - `name`: Provided name
  - `role`: 'guest' (default for externally identified users)

---

## Components Involved

| Component | Changes |
|-----------|---------|
| `/app/chat/page.tsx` | Add company context handling, user identification flow |
| `/api/chat/route.ts` | Accept company_slug, validate tenant, create/find user |
| `/api/companies/[slug]/route.ts` | New endpoint for company lookup |
| `types/index.ts` | Add ChatRequest company_slug field |
| localStorage | Store user profile (name, email, company_slug) |

---

## Data Flow Diagram

```
User visits /chat?company=acme-corp
          |
          v
    Load company info from /api/companies/acme-corp
          |
          v
    Check localStorage for user profile
          |
    +-----+-----+
    |           |
    v           v
 No profile   Has profile
    |           |
    v           |
 Show modal    |
    |           |
    v           |
 Save to       |
 localStorage  |
    |           |
    +-----+-----+
          |
          v
    Create/find user in database via chat API
          |
          v
    Load company's published chatbots
          |
          v
    User selects chatbot
          |
          v
    Start conversation with proper tenant_id, user_id, chatbot_id
```

---

## Database Considerations

- **User Creation**: Users created via company link have `role = 'guest'` by default
- **Tenant Association**: User is tied to the company's tenant_id
- **Deduplication**: Users are looked up by email within tenant to prevent duplicates
- **Conversations**: Include proper chatbot_id and tenant_id references

---

## Security Notes

1. **Public Company Endpoint**: Only returns published chatbots and non-sensitive company info
2. **Email-Based User Lookup**: Scoped to tenant to prevent cross-company user data leakage
3. **Chatbot Validation**: Ensures chatbot belongs to the company before allowing chat
4. **No Password Required**: This is a guest identification flow, not authentication

---

## Files to Create/Modify

### New Files:
- `/ai-assistant-platform/src/app/api/companies/[slug]/route.ts`

### Modified Files:
- `/ai-assistant-platform/src/app/chat/page.tsx`
- `/ai-assistant-platform/src/app/api/chat/route.ts`
- `/ai-assistant-platform/src/types/index.ts`

---

## Testing Plan

1. Visit `/chat?company=acme-corp` (assuming tenant with slug exists)
2. Verify company info loads correctly
3. Verify user identification modal appears
4. Submit name/email, verify localStorage storage
5. Verify chatbots are filtered to company only
6. Start conversation, verify database records have correct tenant_id/user_id
7. Refresh page, verify user info persists from localStorage
8. Test demo mode still works (no company parameter)

---

## Waiting for Confirmation

Please confirm this implementation plan before proceeding with code changes.
