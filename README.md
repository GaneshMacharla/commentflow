# CommentFlow — Instagram Comment → DM Automation

CommentFlow is a production-ready, high-throughput application designed for an Instagram Creator or Business account to automate direct messages (DMs) when users comment with configured keywords (e.g., `FLOW`) on posts and Reels using **Meta's Official Instagram Graph API & Webhooks**.

Built for viral scale (10,000–30,000 comment spikes), zero-ban risk, and resilient processing via a durable PostgreSQL queue.

---

## Architecture Overview

```
Instagram User Comments
        │
        ▼
Meta Instagram Webhook (POST /api/webhooks/instagram)
        │  [Validates HMAC-SHA256 signature]
        │  [Deduplicates atomically via UNIQUE(instagram_comment_id)]
        │  [Inserts into durable queue with status: PENDING]
        ▼
HTTP 200 OK (< 50ms immediately returned to Meta)
        │
        ▼  [Asynchronous / Controlled Concurrency]
Durable Queue Processor (lib/queue/processor.ts)
        │  [Atomic claims via FOR UPDATE SKIP LOCKED]
        │  [Rate Limiter: token bucket respecting rate limits]
        │  [Matcher: Case-insensitive keyword matching (CONTAINS, EXACT, etc.)]
        ▼
Meta Send API (POST /me/messages with recipient: { comment_id })
        │
   ┌────┴──────────────────────────┐
   ▼                               ▼
[Success]                      [Transient 429/5xx Error]
Status: COMPLETED              Status: PENDING
dm_status: SENT                Exponential Backoff & Retry-After
Event logged in audit trail    Max retries exceeded -> FAILED
```

---

## Key Features

1. **Official Meta Graph API**:
   - Uses Meta's official Private Replies API (`POST /v21.0/me/messages` or `POST /v21.0/{ig_user_id}/messages` with `recipient: { comment_id: "<COMMENT_ID>" }`).
   - Zero Selenium, Puppeteer, scraping, or unofficial private APIs.
2. **Durable Supabase / PostgreSQL Queue**:
   - Webhook accepts incoming comments, deduplicates them atomically via `UNIQUE(instagram_comment_id)`, writes to `instagram_comments`, and returns HTTP 200 immediately.
   - Handles viral bursts of 10,000–30,000 comments without HTTP timeouts or dropped requests.
3. **Outbound Rate Limiting & Controlled Concurrency**:
   - Token-bucket rate limiter prevents spamming Meta's endpoints.
   - Configurable concurrency (`QUEUE_CONCURRENCY`), batch sizing (`QUEUE_BATCH_SIZE`), and rate limits (`RATE_LIMIT_PER_SEC`).
   - Automatic detection and respect for HTTP 429 and `Retry-After` response headers with jittered exponential backoff.
4. **Idempotency & Duplicate Protection**:
   - Guaranteed single-delivery: even if Meta sends duplicate webhook retries, the unique constraint ensures a DM is never sent twice.
5. **Development & Mock Mode**:
   - Set `MOCK_INSTAGRAM=true` to test the full pipeline (webhook ingestion, queueing, keyword matching, database updates) without dispatching real DMs.
6. **Single Account Simplicity**:
   - Supports direct environment variable credentials (`INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_ACCOUNT_ID`) or 1-click Instagram Business Login.

---

## 1. Meta Developer App Setup Guide

### Step 1: Create Meta Developer App
1. Go to [Meta for Developers](https://developers.facebook.com/) and log in with your Facebook account.
2. Click **My Apps** $\rightarrow$ **Create App**.
3. Select **Other** as the use case $\rightarrow$ Click **Next**.
4. Choose **Business** as the app type $\rightarrow$ Click **Next**.
5. Give your app a name (e.g. `CommentFlow Automation`) and associate it with your Meta Business Account.

### Step 2: Set Up Instagram & Webhooks Products
1. In your app dashboard, find **Instagram** and click **Set Up**.
2. Go to **App Settings** $\rightarrow$ **Basic**:
   - Note your **App ID** (`META_APP_ID`) and **App Secret** (`META_APP_SECRET`).
3. Add **Webhooks** to your app:
   - In the left sidebar under Webhooks, select **Instagram** from the dropdown.
   - Click **Subscribe to this object**.
   - **Callback URL**: `https://your-domain.com/api/webhooks/instagram` (or your ngrok URL for local dev).
   - **Verify Token**: Enter your secret verify token (e.g. `commentflow_verify_token_2026`).
   - Click **Verify and Save**.
   - Under Subscriptions, subscribe to the **`comments`** and **`messages`** fields.

---

## 2. Required Instagram Permissions

Your Meta App requires the following permissions for your Instagram Professional Account:

| Permission | Purpose |
|---|---|
| `instagram_business_basic` | Read basic profile info and media list |
| `instagram_business_manage_messages` | Send direct message replies to commenters via Private Replies API |
| `instagram_business_manage_comments` | Read comments and receive real-time webhook comment notifications |

> **Note for Development Mode**:
> In Meta Development Mode, your app can only interact with Instagram accounts that have a role in the app (Administrator, Developer, or Tester). Add your Instagram account in **App Roles** $\rightarrow$ **Roles** $\rightarrow$ **Add Instagram Testers**.

---

## 3. Environment Variables Configuration

Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Fill in the required configuration:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Meta Developer App Credentials
META_APP_ID=your_meta_app_id
META_APP_SECRET=your_meta_app_secret
WEBHOOK_VERIFY_TOKEN=commentflow_verify_token_2026

# Single Instagram Professional Account (Direct Configuration Mode)
# Optional: Set these if you want to configure your personal account directly via env
INSTAGRAM_ACCESS_TOKEN=your_instagram_user_access_token
INSTAGRAM_ACCOUNT_ID=your_instagram_professional_account_id
INSTAGRAM_USERNAME=your_instagram_handle

# Security: 32-byte hex encryption key for Instagram Access Tokens (AES-256-GCM)
# Generate via: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
TOKEN_ENCRYPTION_KEY=your_64char_hex_encryption_key

# Public Application URL
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Durable Queue & Rate Limiter Configuration
QUEUE_CONCURRENCY=5
QUEUE_MAX_RETRIES=5
QUEUE_BATCH_SIZE=25
QUEUE_POLL_INTERVAL_MS=1000
RATE_LIMIT_PER_SEC=5

# Mock Mode (set to true to test without sending real Instagram DMs)
MOCK_INSTAGRAM=false
```

---

## 4. Database Setup (Supabase)

1. Open your project in the [Supabase Dashboard](https://app.supabase.com).
2. Go to the **SQL Editor**.
3. Run the migrations in order:
   - `supabase/migrations/20260919000001_initial_schema.sql` (Core tables & RLS)
   - `supabase/migrations/20260919000002_nullable_user_id.sql` (Single-user MVP schema)
   - `supabase/migrations/20261002000001_instagram_automation_queue.sql` (Durable queue `instagram_comments` & `claim_pending_instagram_comments` function)

---

## 5. Local Testing & Webhooks

### A. Running in Mock Mode
To test locally without real Instagram accounts or calling Meta:
```bash
# In .env.local:
MOCK_INSTAGRAM=true

npm run dev
```
1. Open [http://localhost:3000](http://localhost:3000).
2. Click **Live Simulator** in the header.
3. Type a comment containing your keyword (e.g. `FLOW`) and click **Simulate Comment**.
4. The comment is enqueued, processed through the queue, and displayed in your dashboard and activity feed with status `Simulated`.

### B. Testing Real Webhooks with Ngrok
```bash
ngrok http 3000
```
Copy your ngrok forwarding HTTPS URL (e.g. `https://abc-123.ngrok-free.app`) and configure it in the Meta Developer Console under Instagram Webhooks:
- Callback URL: `https://abc-123.ngrok-free.app/api/webhooks/instagram`
- Verify Token: Matches your `WEBHOOK_VERIFY_TOKEN`

### C. Running Automated Tests
Run the test suite (includes 41 unit & integration tests across 9 test files):
```bash
npm test
```

---

## 6. How to Create a Keyword Automation

1. Navigate to **Automations** $\rightarrow$ **Create Flow** (`/automations/new`).
2. Choose your trigger:
   - **Applies to**: Global (all posts/reels) or select a specific Reel.
   - **Trigger Keywords**: Enter `FLOW` (or multiple keywords separated by commas).
   - **Matching Mode**: `Contains keyword` (case-insensitive by default: `flow`, `Flow`, `FLOW` will all match).
3. Set your action:
   - Select **Direct Message (DM)**.
   - Enter your response:
     ```
     Hey @{username}! 👋 Here is the link you requested: https://google.com/flow
     ```
4. Click **Publish Automation**.

---

## 7. Production Deployment (Vercel)

1. Push your repository to GitHub.
2. Import the repository into [Vercel](https://vercel.com).
3. Under **Project Settings** $\rightarrow$ **Environment Variables**, add all keys from your `.env.local`.
4. Deploy!
5. Update your Meta Developer App's Webhook Callback URL to your production Vercel URL:
   `https://your-app.vercel.app/api/webhooks/instagram`.
6. (Optional) Set up a Vercel Cron Job in `vercel.json` to regularly trigger the queue drainer endpoint (`POST /api/queue/process`) if you expect prolonged queue backlogs.

---

## 8. Known Meta API & Messaging Limitations

1. **7-Day Comment Window**: Meta's Private Replies API (`recipient: { comment_id }`) only allows sending a direct message reply within **7 days** of the comment being posted.
2. **One DM Per Comment**: Meta strictly permits **one private reply per comment**. Subsequent attempts to reply to the same comment will return Meta Error Code 100 / Subcode 2534022 ("Cannot send message because a private reply was already sent to this comment"). Our queue automatically guarantees duplicate protection.
3. **Cannot DM Self**: Meta does not allow an account to send a DM to itself. Testing comments must be made from a secondary test Instagram account.
4. **Professional Account Requirement**: The Instagram account must be an **Instagram Professional account** (Creator or Business), not a personal account.
5. **Rate Limits**: Meta enforces Graph API tier rate limits (typically 200 calls per user per hour in dev mode, higher in business verified apps). Our built-in rate limiter and exponential backoff retry mechanism automatically prevents exceeding limits.

---

## License

MIT
