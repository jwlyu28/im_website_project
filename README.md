# Purdue Intramurals Facility Tracker MVP

This is a first-pass web app for a Purdue RecWell intramural facility tracker. It focuses on the problem you called out first: quickly communicating facility availability to patrons while giving supervisors a simple admin workflow for status changes.

## What is included

- Public-facing live status board for indoor and outdoor facilities
- Filters for activity, facility type, and status
- Admin sign-in screen for supervisors
- Admin dashboard with quick status toggles, editable notes, and next-checkpoint fields
- Add-facility flow for new or temporary spaces
- Local persistence with `localStorage` so changes survive refresh during demos

## Run locally

```bash
npm install
npm run dev
```

## Environment setup

Create a `.env.local` file from `.env.example` and add:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_ADMIN_EMAILS` as a comma-separated allowlist of admin emails

The app now uses Supabase email/password auth for admin login. If `VITE_ADMIN_EMAILS` is left blank, any valid Supabase user can sign in as an admin.

## Current architecture

- `React + TypeScript + Vite`
- Supabase Auth for admin authentication
- Single-page MVP with local state and browser persistence for facility data
- No shared facility backend yet

## Best next steps

1. Connect Supabase auth to Purdue-specific staff onboarding or SSO.
2. Move facility data into a backend so updates sync across devices in real time.
3. Add status history, weather-triggered workflows, and shift attribution.
4. Add role distinctions like supervisor, student staff, and read-only operations.
5. Add facility grouping rules that match actual RecWell operations.

## Product notes

This version intentionally keeps the stack lightweight so we can validate workflow and UI direction first. Once you share more details about real facilities, status rules, or staff process, this can become the foundation for a fuller intramurals platform.
