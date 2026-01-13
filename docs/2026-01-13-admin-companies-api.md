# Admin Companies API Implementation

## Date: 2026-01-13
## Feature: Admin Companies (Tenants) API Endpoints

---

## Overview

Create comprehensive admin API endpoints for managing companies (tenants) in the multi-company platform. These endpoints enable administrators to list, create, update, and delete companies, as well as manage users within companies and view detailed statistics.

---

## What It Will Do

### 1. `/api/admin/companies/route.ts` - List and Create Companies
- **GET**: List all companies with aggregated statistics
  - User count per company
  - Agent (chatbot) count per company
  - Conversation count per company
  - Support pagination (page, per_page)
  - Support search by name/slug
  - Support filtering by is_active status

- **POST**: Create new company
  - Required: name, slug
  - Optional: branding (JSONB), is_active
  - Slug validation (unique, lowercase, alphanumeric with hyphens)

### 2. `/api/admin/companies/[id]/route.ts` - Single Company Operations
- **GET**: Get company details with full statistics
  - Company data with branding
  - User count, chatbot count, conversation count
  - Recent activity metrics

- **PUT**: Update company
  - Update name, slug, branding, is_active
  - Slug uniqueness validation on change

- **DELETE**: Delete company
  - Soft considerations (check for dependencies)
  - Returns deleted company info

### 3. `/api/admin/companies/[id]/users/route.ts` - Company Users
- **GET**: List users for specific company
  - Pagination support
  - Include user role, last_active_at
  - Search by name/email

- **POST**: Create user in company
  - Required: email
  - Optional: name, role, is_active
  - Auto-generate user ID

### 4. `/api/admin/companies/[id]/stats/route.ts` - Company Statistics
- **GET**: Detailed company statistics
  - Conversations by agent (chatbot)
  - Conversations by user
  - Feedback rates (positive/negative)
  - Token usage summary
  - Time-based metrics (last 7/30 days)

---

## Approach

### Pattern Reference
Following the established patterns from `/api/admin/chatbots/route.ts`:
- Demo mode with fallback tenant/user IDs
- Pagination structure with `page`, `per_page`, `has_more`
- Error responses using `APIError` type
- Validation functions for input fields
- UUID validation helper

### Database Structure (tenants table)
```typescript
{
  id: string;              // UUID primary key
  name: string;            // Company name
  slug: string;            // Unique URL slug
  branding: Json | null;   // JSONB for theming
  is_active: boolean;      // Active status
  created_at: string;
  updated_at: string;
  // Additional LLM config fields (llm_model, temperature, etc.)
}
```

### Key Considerations
1. **Super Admin Context**: These are platform-wide admin endpoints, not tenant-scoped
2. **Stats Aggregation**: Use Supabase joins and counts for statistics
3. **Slug Validation**: Ensure uniqueness and proper formatting
4. **Cascade Awareness**: Document dependencies before deletion

---

## Components and Files

| File | Purpose |
|------|---------|
| `/api/admin/companies/route.ts` | List/Create companies |
| `/api/admin/companies/[id]/route.ts` | Get/Update/Delete company |
| `/api/admin/companies/[id]/users/route.ts` | List/Create company users |
| `/api/admin/companies/[id]/stats/route.ts` | Company statistics |

---

## Dependencies

- `@/lib/supabase/server` - Server-side Supabase client
- `@/types` - APIError type
- `@/types/database` - TenantRow, UserRow types

---

## Implementation Notes

1. All endpoints use async params pattern (Next.js 16)
2. Demo mode constants for unauthenticated testing
3. Consistent error codes: VALIDATION_ERROR, NOT_FOUND, SUPABASE_ERROR, INTERNAL_ERROR
4. Response format matches existing admin APIs
