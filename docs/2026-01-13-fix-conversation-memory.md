# Fix Conversation Memory Bug

## Date: 2026-01-13
## Issue: Chat has no memory between messages in the same conversation

---

## Problem

Users report that the AI doesn't remember information from earlier messages in the same chat session. Example:
- User: "My name is John"
- User: "What is my name?"
- AI: Doesn't remember

## Root Cause

The frontend (`/src/app/chat/page.tsx`) never captures the `X-Conversation-ID` header from API responses. Every message creates a new conversation instead of continuing the existing one.

**Bug location**: Lines 158-160, 185-193 in `chat/page.tsx`
- `currentConversationId` state is never updated after first message
- Always sends `conversation_id: undefined` to the API

## Fix Approach

Modify the `useChat` hook configuration to use a custom `fetch` wrapper that:
1. Intercepts the response headers
2. Extracts `X-Conversation-ID`
3. Updates `currentConversationId` state

## Components to Modify

1. `/src/app/chat/page.tsx` - Add custom fetch to capture conversation ID

## Impact

- Low risk change
- Fixes core chat functionality
- No database changes required

---

## Fix Implemented

**Date**: 2026-01-13

**Changes made to `/src/app/chat/page.tsx`**:
1. Added `conversationIdRef` to track current conversation ID
2. Created `customFetch` wrapper that intercepts API responses
3. Extracts `X-Conversation-ID` header and updates state
4. Passes custom fetch to `DefaultChatTransport`

**Result**: Subsequent messages now use the same conversation ID, enabling conversation memory.
