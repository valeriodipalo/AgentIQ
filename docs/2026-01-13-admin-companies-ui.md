# Admin Companies UI Implementation

## Date: 2026-01-13
## Feature: Multi-Company Admin UI Pages

---

## Overview

Implement admin UI pages for managing companies (tenants) in the multi-company platform. This includes company listing, creation, dashboard view, and user management within companies.

---

## Components to Create

### 1. Companies List Page
**Path:** `/ai-assistant-platform/src/app/admin/companies/page.tsx`

**Features:**
- Display all companies in a table format
- Show: name, slug, user count, agent count, conversation count
- "New Company" button linking to creation form
- Click row to navigate to company dashboard
- Search functionality with debounced input
- Pagination for large datasets
- Loading and error states

**Data displayed:**
- Company name
- Slug identifier
- User count (from users table)
- Agent/Chatbot count (from chatbots table)
- Conversation count (from conversations table)
- Created date

### 2. New Company Form
**Path:** `/ai-assistant-platform/src/app/admin/companies/new/page.tsx`

**Features:**
- Form to create new company/tenant
- Fields: name, slug (auto-generated from name), branding (optional JSON)
- Client-side validation
- Auto-slug generation from company name
- Error handling and display
- Success redirect to company dashboard

**Form fields:**
- Name (required, max 255 chars)
- Slug (auto-generated, editable, lowercase, alphanumeric with hyphens)
- Branding (optional JSONB for colors, logo URL, etc.)

### 3. Company Dashboard
**Path:** `/ai-assistant-platform/src/app/admin/companies/[id]/page.tsx`

**Features:**
- Company overview with stats cards
- Quick stats: Users, Agents, Conversations, Feedback rate
- Quick action links: Manage Users, View Agents, Browse Conversations
- Recent conversations list (last 5-10)
- Edit company button
- Company details display

**Stats cards:**
- Total Users
- Active Agents (published chatbots)
- Total Conversations
- Positive Feedback Rate

### 4. Company Users Page
**Path:** `/ai-assistant-platform/src/app/admin/companies/[id]/users/page.tsx`

**Features:**
- List users belonging to this company
- Table columns: email, name, role, last active, conversations count
- "Add User" button with inline form or modal
- Search and filter capabilities
- Delete/deactivate user actions
- Pagination

**Table columns:**
- Email
- Name
- Role (user/admin)
- Last Active timestamp
- Conversations count
- Actions (edit, delete)

### 5. Layout Update
**File:** `/ai-assistant-platform/src/app/admin/layout.tsx`

**Changes:**
- Add "Companies" link to sidebar navigation
- Use Building2 icon from lucide-react
- Position between Dashboard and Chatbots

---

## Technical Approach

### API Endpoints Needed
The UI will use these API patterns (similar to existing chatbots API):
- `GET /api/admin/companies` - List with pagination/search
- `POST /api/admin/companies` - Create new company
- `GET /api/admin/companies/[id]` - Get company details with stats
- `PUT /api/admin/companies/[id]` - Update company
- `DELETE /api/admin/companies/[id]` - Delete company
- `GET /api/admin/companies/[id]/users` - List company users
- `POST /api/admin/companies/[id]/users` - Add user to company

Note: API endpoints will be created in a separate task. The UI will handle missing endpoints gracefully with demo data.

### Data Sources
- Companies = `tenants` table
- Users = `users` table (filtered by tenant_id)
- Agents = `chatbots` table (filtered by tenant_id)
- Conversations = `conversations` table (filtered by tenant_id)
- Feedback = `feedback` table (joined through messages/conversations)

### Styling
- Follow existing admin panel patterns
- Tailwind CSS with dark mode support
- Consistent card/table styling
- Responsive design for mobile

### State Management
- React useState for local component state
- useEffect for data fetching
- useCallback for memoized handlers
- No global state needed (page-level data fetching)

---

## Dependencies

- Existing components: Button, Input from @/components/ui
- Icons from lucide-react: Building2, Plus, Search, Edit, Trash2, Users, Bot, MessageSquare, ArrowRight, AlertCircle, Loader2, ArrowLeft
- Next.js: Link, useRouter, useParams, usePathname

---

## Files to Create/Modify

1. `src/app/admin/companies/page.tsx` - Companies list
2. `src/app/admin/companies/new/page.tsx` - New company form
3. `src/app/admin/companies/[id]/page.tsx` - Company dashboard
4. `src/app/admin/companies/[id]/users/page.tsx` - Company users
5. `src/app/admin/layout.tsx` - Add Companies to navigation

---

## Acceptance Criteria

- [ ] Companies list displays all tenants with counts
- [ ] New company form creates tenant with validation
- [ ] Company dashboard shows stats and quick links
- [ ] Users page lists company users with actions
- [ ] Navigation includes Companies link
- [ ] All pages follow existing admin styling
- [ ] Dark mode support throughout
- [ ] Loading and error states handled
- [ ] Responsive design works on mobile
