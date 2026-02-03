<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This project now ships both the React client and a shared `/api/analyze` endpoint so we can call Gemini, GPT‑4o, and future providers without exposing API keys in the browser.

View your app in AI Studio: https://ai.studio/apps/drive/1-dVV58S55qwbi_q5q6Df_nbJPHZ-Ey1-

## Run Locally

**Prerequisites:** Node.js 18+, Vercel CLI (or another way to serve `/api/*` functions).

1. Install dependencies  
   `npm install`
2. Copy the sample env file and fill in the keys you plan to use  
   `cp .env.local.example .env.local`
3. When developing locally run **both** the Vercel dev server (for API routes) and the Vite client:
   ```bash
   vercel dev          # serves /api/analyze on http://localhost:3000
   npm run dev         # serves the React app on http://localhost:5173
   ```
   The default `.env.local.example` already points `VITE_ANALYZE_URL` at `http://localhost:3000/api/analyze`. Overwrite this variable if your API lives elsewhere.

### Required environment variables

| Variable | Used by | Notes |
| --- | --- | --- |
| `VITE_ANALYZE_URL` | Client | Optional. Defaults to `/api/analyze` in production. Set when the frontend should talk to a remote API instance. |
| `GEMINI_API_KEY` | Server | Enables Google Gemini analysis. Required for the default provider. |
| `OPENAI_API_KEY` | Server | Enables GPT‑4o / GPT‑4o Mini. |
| `XAI_API_KEY` | Server | Enables Grok-2 Vision through xAI’s API. |
| `OPENROUTER_API_KEY` | Server | Enables any model hosted via OpenRouter (e.g., Claude 3.5 Sonnet). |
| `ANTHROPIC_API_KEY` | Server | Reserved for native Anthropic integration once implemented. |

Deployments on Vercel should configure these vars in the project settings so that `/api/analyze` can select the right provider and key at runtime.

## Quality gates (linting & tests)

Before pushing or deploying, run the checks that Vercel also executes during `npm run vercel-build`:

- `npm run lint` – ESLint (TypeScript + React rules) with warnings treated as failures.
- `npm run test` – Vitest in CI mode (runs the suite with JSDOM).
- `npm run typecheck` – Ensures the TypeScript project compiles with `tsc --noEmit`.

Vercel reads `vercel.json` and executes `npm run vercel-build`, which chains the three commands above before `vite build`. Any failing step stops the deployment.
