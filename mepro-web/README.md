# MEPro Web

A complete web client for the MEPro fitness platform — workouts, yoga, nutrition,
hydration, progress, goals, achievements, community, notifications and an on-device
AI coach. Mirrors the feature set of the Expo app, built for the browser.

## Stack

- **Next.js 16.4.2** (App Router, Turbopack) — `cacheComponents: false`; the app is
  client-driven because the session lives in `localStorage`
- **Tailwind CSS 4** — design tokens as CSS variables in `globals.css`, flipped by
  `[data-theme="dark"]`, exposed through `@theme inline`
- **framer-motion 14** — page/section entrance animations via `PageBody`, `FadeIn`,
  `Stagger`
- **TypeScript** strict, with typed endpoint wrappers for the whole backend API

## Getting started

```bash
npm install
cp .env.local.example .env.local   # defaults to http://localhost:5000/api
npm run dev
```

The backend (`mepro-backend`, port 5000) must be running for data to load.
Demo credentials on the login screen: `aarav@mepro.app` / `Demo@12345`.

### Environment

| Variable | Default | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:5000/api` | API base URL |

## Scripts

```bash
npm run dev         # start the dev server
npm run build       # production build (typechecks first)
npm run start       # serve the production build
npm run lint        # eslint src --max-warnings=0
npm run typecheck   # tsc --noEmit
```

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Landing page |
| `/login`, `/register` | Auth (`?next=` deep-link supported) |
| `/dashboard` | Today: calories, macros, water, movement, streak, goals |
| `/train` | Workout & yoga catalogue with search and filters |
| `/train/workout/[id]`, `/train/yoga/[id]` | Detail pages with start CTAs |
| `/train/session` | Live session runner (timer, sets, rest, finish/abandon) |
| `/nutrition`, `/nutrition/search` | Daily log, water/weight quick-log, food search |
| `/progress` | Ranges (7/30/90), weight/calorie/water trends, sessions |
| `/goals` | CRUD goals with progress updates and sync |
| `/achievements` | Earned/locked badges by tier, evaluate, points |
| `/community` | Feed, composer, likes, comments, delete/report |
| `/coach` | AI assistant (local model with rules fallback) |
| `/notifications` | Unread filter, mark read/all, clear |
| `/profile` | Profile edit, BMI, notification settings, security, export/delete |

## Structure

```
src/
  app/            routes (route groups: public pages, (app) = authenticated shell)
  components/     ui kit, charts, icons, shell chrome, modals, states, motion
  hooks/          useApiQuery (focus refetch + optimistic setData), debounce, useNow
  lib/            api client (refresh + 401 replay), typed endpoints, types, math/format
  providers/      theme (useSyncExternalStore), auth (localStorage session), toasts
```

## API integration notes

- Envelope `{success, data, ...}` is unwrapped inside `src/lib/api.ts`.
- Bearer tokens are stored in `localStorage` (`mepro.auth.tokens`); a single-flight
  refresh runs on 401 and replays the original request.
- Rate limits surface `retryAfterSeconds`; forms show it inline.
- `POST /ai/assistant` sends `message` in the query string; responses can take up to
  60s (handled by the client timeout).
- `/workouts/:id/complete` is keyed by workout id with `durationMinutes` (1–300);
  abandoning uses `DELETE /workouts/sessions/:id`.
- Hydration logs are removed by log id (`DELETE /hydration/log/:id`).

## Verification

```
npm run typecheck  # clean
npm run lint       # clean (0 errors, 0 warnings)
npm run build      # 18 routes generated
```

Health figures shown anywhere in the app are estimates, not medical advice.
