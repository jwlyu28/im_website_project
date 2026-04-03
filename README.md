# Purdue Intramurals Sports Status Board

This project is moving from prototype to public-ready foundation. It keeps the sport-first public board and admin dashboard, while adding a real backend path with Supabase for shared live data and secure admin authentication.

## What it does now

- Public-facing live sports status board
- High-priority red global banner
- Admin dashboard for sport status edits
- Archive and restore seasonal sports
- One-click all-sport actions for alert, cancel, and reactivate
- Modal flow for adding sports
- Supabase-ready shared data and admin auth path
- Local fallback for development before backend setup is complete

## Local setup

```bash
npm install
npm run dev
```

Create a `.env.local` file from `.env.example`:

```bash
cp .env.example .env.local
```

Then add:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Supabase setup

1. Create a Supabase project.
2. Open the SQL editor.
3. Run [schema.sql](/Users/jasonlyu/Documents/IM_Website_Project/supabase/schema.sql).
4. In Supabase Auth, create the shared supervisor account you want staff to use.
5. Copy the project URL and anon key into `.env.local`.

This keeps the shared admin password inside Supabase Auth instead of exposing it in frontend environment variables.

## Deployment path

Recommended production stack:

- Frontend hosting: `Vercel`
- Shared data + auth: `Supabase`
- Custom domain: later, after initial testing

## Plain-English architecture

- `React + Vite` renders the website people visit.
- `Supabase` stores shared sport data and the global banner.
- `Supabase Auth` handles admin sign-in securely.
- `Vercel` hosts the website publicly on the internet.

That means:

- public users read shared sports data
- admins sign in and update shared sports data
- all devices see the same current information

## Reliability roadmap

### Phase 1: Shared foundation

- Supabase sports table
- Supabase banner table
- Shared admin login
- Public deployment

### Phase 2: Operational safety

- audit log for updates
- last-updated-by display
- rollback / undo support
- stronger admin protections

### Phase 3: Product expansion

- improved mobile polish
- sport ordering controls
- richer facility-impact details
- weather integrations
- future notifications

## Current note

If Supabase is not configured yet, the app still falls back to local demo-style data so development can continue. Once configured, the same UI becomes a real shared operational tool.
