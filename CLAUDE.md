# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Calorie & macro tracker that runs as a **Telegram Mini App**, built with React + Vite and backed by Supabase.

## Commands

```bash
npm run dev      # Vite dev server
npm run build    # Production build → dist/
npm run preview  # Preview production build
npm run lint     # ESLint on src/
```

No test framework is configured.

## Architecture

**Frontend:** React 18 (JSX, no TypeScript), Vite, CSS variables (dark theme), recharts for charts, lucide-react for icons.

**Backend:** Supabase (Postgres + Edge Functions). No custom API server.

**Auth flow:** Telegram WebApp → frontend extracts `initData` → POST to Supabase Edge Function (`telegram-auth`) → HMAC-SHA256 validation against BOT_TOKEN → find-or-create profile → return custom JWT → `supabase.auth.setSession()`. RLS enforces `auth.uid() = user_id` on all tables.

**Deployment:** GitHub Actions builds and deploys to GitHub Pages (static SPA). Vite base is `./` for relative paths.

### Key directories

- `src/contexts/AuthContext.jsx` — auth state, Telegram sign-in, JWT session management
- `src/hooks/useMeals.js` — fetch/add/delete meals for current date
- `src/hooks/useGoals.js` — fetch/save daily macro goals (upsert by user + date)
- `src/App.jsx` — all UI views (Dashboard, Log Intake, History, Settings) and tab navigation
- `src/lib/supabase.js` — Supabase client init
- `supabase/functions/telegram-auth/index.ts` — Deno edge function for Telegram auth
- `setup.sql` / `setup-telegram-auth.sql` — DB schema, RLS policies, storage bucket

### Database tables

- **meals**: `id, user_id, description, meal_type, calories, protein, carbs, fats, created_at`
- **goals**: `id, user_id, target_date, target_calories, target_protein, target_carbs, target_fats` (upsert)
- **profiles**: `id, telegram_id, telegram_username, telegram_first_name, telegram_last_name`
- **storage.meal_photos** bucket: path `/user_id/filename`

### Environment variables

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_SUPABASE_EDGE_FUNCTION_URL
```

## Conventions

- State management uses React Context + custom hooks (no Redux/Zustand).
- All views are defined inline in `App.jsx` rather than separate route files.
- Macro auto-calculation: protein calories first, then remaining split 60% carbs / 40% fat.
- `index.html` must include `https://telegram.org/js/telegram-web-app.js` for the Telegram bridge.
