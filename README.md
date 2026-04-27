# Purdue Intramurals Status Board

A sport-first status board for Purdue RecWell Intramurals. The app gives patrons a simple public page to check whether a sport is still running, and gives supervisors an admin dashboard to update sport status, post a high-priority banner, archive seasonal sports, and review recent activity.

## What the app does

- Shows a public-facing live status board for intramural sports
- Supports three sport states: `Active`, `Alert`, and `Cancelled`
- Displays a high-priority red banner above the public sport list
- Lets admins sign in with Supabase Auth
- Lets admins edit sport status, notes, and facility impact
- Supports one-click bulk actions for all live sports
- Supports archiving and restoring seasonal sports
- Records recent admin activity in an audit log
- Shows who last updated a sport or banner

## Current stack

- `React 19`
- `TypeScript`
- `Vite`
- `Supabase` for auth and shared data
- `Vercel` for deployment

## How it works

The app has two modes:

- Public mode: anyone can view current sports and the high-priority banner
- Admin mode: supervisors can sign in and update statuses

If Supabase is configured, the app uses shared live data so all users see the same updates.

If Supabase is not configured, the app falls back to local browser storage so development can continue without a backend.

## Project structure

- [`src/App.tsx`](/Users/jasonlyu/Documents/IM_Website_Project/src/App.tsx): main UI for the public board and admin dashboard
- [`src/lib/data.ts`](/Users/jasonlyu/Documents/IM_Website_Project/src/lib/data.ts): data loading, saving, local fallback, and audit log helpers
- [`src/lib/supabase.ts`](/Users/jasonlyu/Documents/IM_Website_Project/src/lib/supabase.ts): Supabase client setup
- [`supabase/schema.sql`](/Users/jasonlyu/Documents/IM_Website_Project/supabase/schema.sql): base database schema and RLS policies
- [`src/index.css`](/Users/jasonlyu/Documents/IM_Website_Project/src/index.css): styling

## Local development

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Run linting:

```bash
npm run lint
```

## Environment variables

Create a `.env.local` file in the project root with:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Only these two environment variables are needed in the frontend.

Old frontend-shared-password variables are no longer used and should not be kept:

- `VITE_ADMIN_EMAIL`
- `VITE_ADMIN_PASSWORD`
- `VITE_ADMIN_EMAILS`

## Supabase setup

1. Create a Supabase project.
2. Open the SQL Editor.
3. Run the schema from [`supabase/schema.sql`](/Users/jasonlyu/Documents/IM_Website_Project/supabase/schema.sql) if this is a brand-new database.
4. In Supabase Auth, create the shared admin account used by supervisors.
5. Add the Supabase URL and anon key to `.env.local`.

### Important note for existing databases

Do not blindly rerun the full schema file on an already-configured production database. The schema file contains named policies, and rerunning it can fail with errors like:

```text
policy "public can read sports" for table "sports" already exists
```

For existing environments, use incremental SQL changes instead of rerunning the entire schema.

## Database overview

The current app expects these tables:

- `sports`
- `global_banner`
- `audit_log`

Key data fields used by the UI include:

- Sport name
- Category
- Status
- Note
- Facility impact
- Archived flag
- Display order
- Updated at
- Updated by

## Authentication model

Right now the admin side uses Supabase Auth with a shared supervisor login. That is much better than putting a shared password directly in the frontend code, and it is enough for the current phase of the project.

For a future production version, the stronger long-term direction is:

- one account per staff member
- role-based access
- clearer audit history by individual user

## Current user flows

### Public users

- Open the website
- See the high-priority banner if one is active
- Filter sports by category or status
- Read notes and facility impacts

### Admin users

- Sign in
- Edit a single sport
- Archive or restore a sport
- Add a new sport
- Update the global banner
- Run a bulk action across all live sports
- Review the recent activity log

## Deployment

The app is set up well for Vercel deployment.

### Recommended production services

- Frontend hosting: `Vercel`
- Backend/auth/database: `Supabase`

### Vercel setup

When creating the Vercel project:

- Framework preset: `Vite`
- Build command: `npm run build`
- Output directory: `dist`

Add these environment variables in Vercel Project Settings:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

After deploy, test in this order:

1. Public page loads.
2. Sports and banner appear.
3. Admin login works.
4. A status edit persists after refresh.

## Reliability notes

This app is a solid operational prototype and can already work as a shared public tool, but a few reliability ideas still matter before treating it as a high-trust production system:

- per-user staff accounts instead of one shared account
- rollback or undo for mistaken updates
- stronger validation and clearer admin-side error handling
- optional realtime updates if you want pages to refresh instantly without reload
- monitoring and uptime checks

## Product roadmap

### Phase 1: Current foundation

- Public sport status board
- Admin dashboard
- Supabase auth and data
- Global banner
- Archive/restore
- Audit log
- Last updated by

### Phase 2: Public-ready polish

- Cleaner mobile experience
- Better empty states and loading states
- Accessibility pass
- Stronger admin feedback and confirmations
- Improved sort/order controls for sports

### Phase 3: Operations features

- Undo / rollback for recent changes
- Individual staff accounts
- Optional realtime subscriptions
- Scheduled status changes
- Weather and field-condition integrations

### Phase 4: Broader IM platform ideas

- Sport-specific announcements
- Game-night staffing notes
- Facility map and impact view
- Patron-facing notifications
- Historical cancellation reporting
- Integration ideas for registration or league tools

## Next ideas worth building

If we continue from this version, the highest-value next steps are probably:

- individual staff logins
- undo for admin edits
- mobile UI polish
- optional realtime syncing
- better sport ordering controls

## Notes for this repo

- The app is intentionally sport-first rather than facility-first.
- Division-level status was removed to keep operations simpler.
- Scheduling was intentionally deferred for now.
- The red banner is treated as the highest-priority message for patrons.

## License

No license has been added yet. If this project will become a public repository, adding a license is a good next step.
