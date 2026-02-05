# WeCircle-Assistent – Functional Spec

## 1. Vision
WeCircle-Assistent is a mobile-first PWA that helps second-hand sellers identify, price, and describe items using AI. The app must:
- Capture photos/voice context, run OpenRouter-hosted AI analysis (NVIDIA Nemotron Nano as default), and output pricing guidance plus structured metadata.
- Support user management via Supabase: magic-link login, persistent history/settings, and future paid tiers with usage limits.
- Run entirely on Vercel (client + API routes) with linting, testing, and type-check CI gates.

## 2. Core Flows
1. **Login / Magic Link**
   - User submits email, hitting `/api/auth/send-magic-link`.
   - Endpoint enforces IP/email throttling (`auth_throttle` table) and sends Supabase OTP redirecting to `APP_BASE_URL` (with optional referrer overrides).
   - Frontend detects Supabase `#access_token` or `?code` responses and exchanges for a session; errors bubble into UI.
   - RLS keeps Supabase tables private; only session owner reads/writes their data.

2. **AI Capture & Review**
   - Photos go through free-form cropping + compression.
   - Voice notes captured via Web Speech API.
   - `analyzeItem` hits `/api/analyze`, which proxies everything through OpenRouter and narrows the model list to a curated set. Responses populate pricing, “Efter WeCircle” net price (discount + commission), and metadata boxes with voice-edit icons. Both the review form and history list expose “Kopiér” actions so descriptive titles can be pasted directly into the native WeCircle app.
   - Usage (runs/tokens/cost) accumulates per session for future metering.

3. **Settings**
   - Provider status badge reflects the OpenRouter credential health (Connected/Missing/Unknown) via `/api/providerStatus`.
   - Model picker shows only the curated OpenRouter list; Nemotron Nano is default.
   - WeCircle section stores discount (0/25/50%) and fixed 20% commission; UI reflects net price across list + detail pages.
   - Supabase-backed settings table (`user_settings`) tracks provider/model preferences.

## 3. Data Model (Supabase migrations)
- `profiles` (1:1 with `auth.users`, holds email, display name, metadata).
- `user_settings` (language, currency, discount %, commission %, provider/model preference, notification prefs).
- `billing_plans`, `user_plan_assignments`, `usage_counters` to support future tiers/limits.
- `auth_throttle` for rate-limit logging.
- Triggers keep `updated_at` fresh and seed default settings/plan on new users.

## 4. API Surface
- `POST /api/analyze` – server-side AI calls proxied through OpenRouter using the selected model. Requires `OPENROUTER_API_KEY`.
- `POST /api/providerStatus` – checks the OpenRouter key and remote health.
- `POST /api/auth/send-magic-link` – handles rate limiting, redirect validation, Supabase OTP send.
- Static assets include `favicon.ico`; CSS bundled via Vite (imported in `index.tsx`).

## 5. Build & Deployment
- Commands: `npm run lint`, `npm run test`, `npm run typecheck`, `npm run build`, chained via `npm run vercel-build`.
- ESLint v9 config + TypeScript strict build must pass locally and on Vercel.
- Supabase CLI (`supabase db push`) applies migrations; `APP_BASE_URL`, Supabase Site URL, and redirect whitelists must match.

## 6. Auth & Session Notes
- Supabase access tokens expire after 1 hour (default `jwt_expiry = 3600`); the browser client auto-refreshes using the refresh token, so sessions persist until the user signs out or storage/cookies are cleared.
- The login endpoint now surfaces Supabase’s email rate limit errors (wait 5 minutes before retrying) to avoid confusing 500s.
- Magic-link redirects must match `APP_BASE_URL` **and** the Supabase Site URL; otherwise, sessions cannot be exchanged.
- Safari may classify `*.supabase.co` as a bounce tracker if the user stays inside the Mail webview—tell users to “Open in Safari” for reliable sign-in.

## 7. Styling Stack
- Tailwind now ships via the local Vite pipeline (`src/index.css` imports `tailwindcss/preflight|theme|utilities`). No CDN script in production.
- Global tweaks (safe-area padding, `ios-shadow`, etc.) live alongside the Tailwind imports inside `src/index.css`.

## 8. Open Issues / Next Steps
1. Add Supabase persistence for item history instead of local storage.
2. Monetization: enforce plan limits via `usage_counters`, integrate Stripe/LemonSqueezy/Paddle for billing, or add Supabase OAuth clients for partners.
3. Implement CAPTCHA/rate-limit defense on signup endpoint + Supabase auth endpoints before production launch.
4. Track cumulative token costs per model (OpenRouter) and surface them in settings/history.
5. Port Tailwind config to include custom tokens/components (currently using stock preflight/theme/utilities).
