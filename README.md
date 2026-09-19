# CommentFlow — Instagram Comment Automation SaaS (MVP v1.0)

CommentFlow is a production-ready, Vercel-native full-stack SaaS application for Instagram creators to automate comment replies and private direct messages on their Instagram posts and Reels using official Meta Graph APIs and Webhooks.

Designed for **$0/month infrastructure cost** within applicable free-tier limits (Vercel + Supabase).

---

## Features

- **Decoupled Automation Engine**:
  - Keyword trigger rules: `CONTAINS`, `EXACT`, `STARTS_WITH`, `ENDS_WITH`.
  - Multi-keyword support: `ANY` (match at least one) and `ALL` (match all).
  - Case-insensitive by default (`AI`, `ai`, `Ai`, `aI`).
- **Official Meta Graph API Integration**:
  - Public comment reply dispatch via `POST /{comment-id}/replies`.
  - Private Instagram Direct Message dispatch via Meta Send API / Private Replies (`POST /me/messages` with `recipient: { comment_id }`).
  - Secure Meta OAuth flow with CSRF state protection.
  - Meta Webhook verification handshake and HMAC SHA-256 signature validation (`X-Hub-Signature-256`).
- **Security**:
  - Instagram User Access Tokens are encrypted at rest using **AES-256-GCM**.
  - Tokens and secrets are never exposed to the frontend browser.
- **Idempotency**:
  - Atomic database-level deduplication via unique constraint on `processed_events(event_id)`.
- **Built-in Webhook Simulator**:
  - Safe dry-run testing tool in the dashboard allowing creators and developers to simulate comments, test keyword triggers, and preview replies and DMs in real time.
- **Creator UI**:
  - Modern dark glassmorphism aesthetic built with Tailwind CSS and Lucide React.
  - Real-time metrics: Comments Detected, Matched, Messages Sent, Delivery Failures.
  - 4-step visual wizard builder: Content $\rightarrow$ Trigger $\rightarrow$ Actions $\rightarrow$ Live Preview.
  - Posts & Reels browser with 1-click automation creation.
  - Real-time activity and audit log stream.

---

## Tech Stack

- **Framework**: Next.js 14+ / 16 (App Router & Route Handlers)
- **Language**: TypeScript, React 19
- **Database & Auth**: Supabase PostgreSQL + Row Level Security (RLS)
- **Styling**: Tailwind CSS
- **Cryptography**: Node `crypto` (AES-256-GCM & HMAC SHA-256)
- **Testing**: Vitest (16/16 unit & integration tests passing)
- **Deployment**: Vercel (Edge / Serverless Functions)

---

## Getting Started Locally

### 1. Clone the repository
```bash
git clone https://github.com/GaneshMacharla/commentflow.git
cd commentflow
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Fill in your Supabase and Meta developer credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

META_APP_ID=your_meta_app_id
META_APP_SECRET=your_meta_app_secret
META_VERIFY_TOKEN=commentflow_meta_verify_token_2026

TOKEN_ENCRYPTION_KEY=your_32_byte_hex_encryption_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Database Setup (Supabase)
In your Supabase project's **SQL Editor**, execute the migration file:
`supabase/migrations/20260919000001_initial_schema.sql`

### 5. Run tests
```bash
npm test
```

### 6. Start the development server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Production Deployment (Vercel)

1. Push this repository to GitHub.
2. Import the repository into [Vercel](https://vercel.com).
3. Add the environment variables from your `.env.local` in the Vercel project settings.
4. Deploy! Vercel automatically deploys both the frontend and serverless API route handlers under a single domain.

---

## License

MIT
