---
id: 01-auth
title: Authentication
status: done
milestone: 1
module: src/modules/auth
route: /login
---

# Spec 01 — Authentication

## Overview

Users must authenticate before accessing any part of the app. Authentication is handled by Firebase Auth.

---

## Features

### F-01.1 Login Page
- Route: `/login`
- Public route — accessible without authentication
- Providers: Google OAuth and email/password
- On success: redirect to `/dashboard`
- On failure: display an inline error message

### F-01.2 Protected Routes
- All routes except `/login` require an authenticated session
- Unauthenticated users are redirected to `/login`
- The original target URL is preserved and restored after login (redirect-back)

### F-01.3 Session Persistence
- Firebase `setPersistence(browserLocalPersistence)` is used so sessions survive page reloads
- On app boot, the router waits for `onAuthStateChanged` before resolving the first navigation

### F-01.4 Logout
- A logout action is available from every authenticated view
- On logout: clear session, redirect to `/login`

---

## Domain Types

```ts
// src/modules/auth/domain/auth.types.ts
interface AuthUser {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
}
```

---

## Validations

| Rule | Behaviour |
|---|---|
| Empty email | Show "Email is required" |
| Invalid email format | Show "Enter a valid email address" |
| Empty password | Show "Password is required" |
| Wrong credentials | Show Firebase error message |
| Network error | Show "Connection failed, try again" |

---

## Acceptance Criteria

- [x] Visiting `/dashboard` while logged out redirects to `/login`
- [x] Successful Google login lands on `/dashboard`
- [x] Successful email/password login lands on `/dashboard`
- [x] After page reload, an authenticated user stays logged in
- [x] Clicking logout redirects to `/login` and clears the session
- [x] Validation errors appear inline without a page reload
