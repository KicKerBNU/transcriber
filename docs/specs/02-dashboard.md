---
id: 02-dashboard
title: Dashboard
status: done
milestone: 2
module: src/modules/dashboard
route: /dashboard
---

# Spec 02 — Dashboard

## Overview

The dashboard is the home screen for authenticated users. It lists all their past conversations and provides entry points to start a new session or review a past one.

---

## Features

### F-02.1 Conversation List
- Route: `/dashboard`
- Fetch all conversations belonging to the logged-in user from Firestore
- Display as a card list sorted by date (most recent first)
- Each card shows: title, date/time, summary snippet (first 120 characters)

### F-02.2 Navigate to Conversation Detail
- Clicking a conversation card navigates to `/conversation/:id`
- The detail view shows the full transcript and summary

### F-02.3 Start New Session
- A prominent "New Session" button navigates to `/session`
- Button always visible at the top of the dashboard

### F-02.4 Empty State
- When the user has no conversations, show an illustration and the message:
  > "No conversations yet. Tap 'New Session' to get started."

### F-02.5 Loading State
- While data is being fetched from Firestore, show a skeleton loader
- Error state: show a retry button with "Failed to load conversations"

---

## Domain Types

```ts
// src/modules/dashboard/domain/conversation.types.ts
interface Conversation {
  id: string
  userId: string
  title: string
  summary: string
  transcript: TranscriptLine[]
  createdAt: Date
  updatedAt: Date
}

interface TranscriptLine {
  speaker: 'user' | 'ai'
  text: string
  timestamp: Date
}
```

---

## Validations

| Rule | Behaviour |
|---|---|
| User not authenticated | Redirect to `/login` (handled by router guard) |
| Firestore fetch error | Show error message + retry button |
| Empty conversation list | Show empty state component |

---

## Acceptance Criteria

- [x] Dashboard loads and displays all conversations for the logged-in user
- [x] Conversations are sorted newest-first
- [x] Each card displays title, date, and summary snippet
- [x] Clicking a card navigates to the correct conversation detail route
- [x] "New Session" button navigates to `/session`
- [x] Empty state is shown when no conversations exist
- [x] Skeleton loader is shown while data is loading
- [x] Retry button appears and works on fetch error
