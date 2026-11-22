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

Configure Supabase values in `.env.local` before enabling authentication or persistence.

## Database
Apply `supabase/migrations/0001_initial_schema.sql` in the Supabase SQL editor. Review the migration and policies against your project before production use.

## Safety
Mock mode is a workflow simulator only. It must never connect to a broker, submit orders, or execute real trades. Real MT5 execution requires a separately deployed Windows worker, authenticated queue polling, and operational safeguards.

Free hosting tiers have quotas and limits; ongoing zero-cost hosting is not guaranteed.
