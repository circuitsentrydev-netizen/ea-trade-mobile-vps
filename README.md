# EA Trade Mobile VPS

A mobile-first Progressive Web App for managing MetaTrader 5 Expert Advisor hosting, mentor-issued access keys, VPS job orchestration, and SMC telemetry.

## Stack
- Next.js 14 App Router + TypeScript
- Tailwind CSS
- Supabase Auth, PostgreSQL and private Storage
- Vercel deployment
- Windows MT5 execution worker planned for Phase 2

## Run in Codespaces
```bash
npm install
cp .env.example .env.local
npm run dev
```

Configure the Supabase project URL and publishable key in `.env.local` before using authentication. Configure `SUPABASE_SERVICE_ROLE_KEY` and `MT5_ENCRYPTION_KEY` as server-only secrets for privileged server actions. Never prefix either secret with `NEXT_PUBLIC_`, commit them, or paste them into chat.

## Database migrations
The five timestamped SQL files in `supabase/migrations/` correspond to the five migrations already recorded in the linked Supabase project. Do not manually re-run these SQL files in the SQL editor.

To inspect migration status from a linked Codespace, use:
```bash
npx supabase migration list --linked
```

This is a read-only status check. Do not run `supabase db push` unless a new, reviewed migration is intentionally ready to deploy.

## Safety and execution
Mock mode is a workflow simulator only. It must never connect to a broker, submit orders, or execute real trades. Real MT5 execution requires a separately deployed Windows worker, authenticated queue polling, and operational safeguards.

Free hosting tiers have quotas and limits; ongoing zero-cost hosting is not guaranteed.
