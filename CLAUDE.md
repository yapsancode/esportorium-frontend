@AGENTS.md

# Esportorium Frontend

MLBB tournament platform frontend. Backend API: http://localhost:8000

## Stack

- Next.js 16 + React 19 — App Router only, never Pages Router
- TypeScript — always, no plain JS files
- Tailwind 4 + Shadcn 4 — all UI components
- Zustand — auth state management
- Axios — all API calls, never raw fetch
- js-cookie — refresh token storage
- jwt-decode — decode JWT for role/plan

## Design System

- Primary color: terra (`#B5502A`)
- Background: `#F5F0EB`
- Headings: Bebas Neue (`font-display` class)
- Body: DM Sans (`font-sans` class)
- Tailwind custom colors: `bg-terra`, `text-terra`, `bg-background`, `text-text-primary`, `text-text-secondary`
- Use Shadcn components styled with terra palette

## Auth

- Access token: Zustand store (memory only, never persisted)
- Refresh token: httpOnly cookie via js-cookie
- Never use localStorage or sessionStorage for tokens
- Decode JWT with jwt-decode to read user role and plan

## Roles (low → high)

`player` → `team_captain` → `organizer` → `moderator` → `admin` → `super_admin`

## Plans

`free` | `pro` | `business` | `enterprise`

## Folder Structure

```
app/
  (auth)/login/       → login page
  (auth)/register/    → register page
  (dashboard)/        → protected pages
lib/
  api.ts              → axios instance + all API calls
  auth.ts             → token helpers, decode JWT
  store/
    authStore.ts      → Zustand auth store
components/
  ui/                 → Shadcn components (auto-generated)
  shared/             → shared components (Navbar, etc.)
```

## Rules

- Use App Router file conventions (`page.tsx`, `layout.tsx`)
- Use TypeScript interfaces for all API responses
- Use Shadcn components over raw HTML elements
- Never inline API calls in components — all calls go through `lib/api.ts`
- Never use localStorage for tokens
- Role/plan checks on the frontend are UI-only — backend always enforces
