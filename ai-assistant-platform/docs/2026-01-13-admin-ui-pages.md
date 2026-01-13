# Admin UI Pages Implementation

## Date: 2026-01-13
## Feature: Admin Panel UI for Chatbot Management

---

## Overview

Create the Admin UI pages for the chatbot management system, providing a complete interface for administrators to manage chatbots, view analytics, and navigate the admin panel.

## Approach

### Components to Create

1. **Admin Layout** (`/src/app/admin/layout.tsx`)
   - Sidebar navigation with links to Dashboard, Chatbots, Analytics
   - Header with "Admin Panel" title
   - Dark/light theme support using existing Tailwind classes
   - Responsive design with mobile-friendly sidebar

2. **Admin Dashboard** (`/src/app/admin/page.tsx`)
   - Redirect to /admin/chatbots as the primary landing page
   - Could later show an overview

3. **Chatbots List** (`/src/app/admin/chatbots/page.tsx`)
   - Table displaying all chatbots with columns: name, model, status, created date
   - "Create Chatbot" button linking to new chatbot form
   - Edit/Delete actions per row
   - Search functionality with debounced input
   - Pagination support
   - Loading states and error handling

4. **Create Chatbot Form** (`/src/app/admin/chatbots/new/page.tsx`)
   - Form fields: name, description, system_prompt (textarea), model (select), temperature (slider/input), max_tokens, is_published (toggle)
   - Client-side validation
   - Submit to POST /api/admin/chatbots
   - Redirect to list on success
   - Error handling and loading states

5. **Edit Chatbot Form** (`/src/app/admin/chatbots/[id]/edit/page.tsx`)
   - Same form as create, pre-filled with existing chatbot data
   - Fetch chatbot data from GET /api/admin/chatbots/[id]
   - Submit to PUT /api/admin/chatbots/[id]
   - Loading and error states

6. **Analytics Dashboard** (`/src/app/admin/analytics/page.tsx`)
   - Fetch and display stats from /api/admin/analytics
   - Cards showing: total conversations, messages, feedback rate, chatbots count
   - Clean card-based layout
   - Loading states

### Dependencies

- Existing UI components: Button, Input from `/src/components/ui/`
- Existing API routes: `/api/admin/chatbots`, `/api/admin/analytics`
- lucide-react for icons
- Tailwind CSS for styling

### Design Patterns

- Use 'use client' directive for all interactive pages
- Follow existing styling patterns from chat page
- Dark/light mode support with Tailwind classes
- Consistent error handling with error states
- Loading skeletons for better UX

## File Structure

```
src/app/admin/
  layout.tsx           # Admin layout with sidebar
  page.tsx             # Dashboard (redirects to chatbots)
  chatbots/
    page.tsx           # Chatbots list
    new/
      page.tsx         # Create chatbot form
    [id]/
      edit/
        page.tsx       # Edit chatbot form
  analytics/
    page.tsx           # Analytics dashboard
```

## Implementation Status

- [x] Admin layout
- [x] Admin dashboard page
- [x] Chatbots list page
- [x] Create chatbot page
- [x] Edit chatbot page
- [x] Analytics page

## Files Created

1. `/src/app/admin/layout.tsx` - Admin layout with responsive sidebar navigation
2. `/src/app/admin/page.tsx` - Dashboard with quick stats and actions
3. `/src/app/admin/chatbots/page.tsx` - Chatbots list with search, pagination, and CRUD actions
4. `/src/app/admin/chatbots/new/page.tsx` - Create chatbot form with validation
5. `/src/app/admin/chatbots/[id]/edit/page.tsx` - Edit chatbot form with pre-filled data
6. `/src/app/admin/analytics/page.tsx` - Analytics dashboard with metrics breakdown
