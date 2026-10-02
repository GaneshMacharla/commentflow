import { NextRequest, NextResponse } from 'next/server';
import { verifyMetaHandshake, verifyMetaSignature } from '@/lib/security/webhook';
import { normalizeWebhookPayload } from '@/lib/instagram/webhook';
import { InstagramWebhookPayload } from '@/lib/instagram/types';
import { enqueueInstagramComment } from '@/lib/supabase/db';
import { processQueue } from '@/lib/queue/processor';

/**
 * Meta Webhook Verification Handshake
 * GET /api/webhooks/instagram
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifiedChallenge = verifyMetaHandshake(mode, token, challenge);

  if (verifiedChallenge) {
    // Meta requires returning the challenge as raw text with 200 OK
    return new NextResponse(verifiedChallenge, { status: 200 });
  }

  return new NextResponse('Forbidden: Invalid verify token', { status: 403 });
}

/**
 * Meta Webhook Event Ingestion
 * POST /api/webhooks/instagram
 *
 * Workflow:
 * 1. Validate signature using Meta App Secret
 * 2. Parse & normalize comment events
 * 3. Atomically enqueue events to durable instagram_comments table (PENDING)
 * 4. Deduplicate using UNIQUE(instagram_comment_id)
 * 5. Trigger background queue worker asynchronously
 * 6. Return HTTP 200 immediately (< 50ms) to Meta
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-hub-signature-256');

    const appSecret =
      process.env.META_APP_SECRET ||
      process.env.INSTAGRAM_APP_SECRET;

    if (appSecret && signature) {
      const isValid = verifyMetaSignature(rawBody, signature, appSecret);
      if (!isValid) {
        console.error('Invalid HMAC signature received from Meta webhook');
        return NextResponse.json({ error: 'Invalid HMAC signature' }, { status: 401 });
      }
    }

    console.log('[WEBHOOK_RECEIVED] Ingested incoming Meta webhook payload');

    let payload: InstagramWebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      console.warn('[WEBHOOK_RECEIVED] Received invalid non-JSON payload');
      return NextResponse.json({ status: 'INVALID_JSON' }, { status: 200 });
    }

    const events = normalizeWebhookPayload(payload);
    if (events.length === 0) {
      return NextResponse.json({ status: 'EVENT_RECEIVED', queued: 0 }, { status: 200 });
    }

    let queuedCount = 0;
    let duplicateCount = 0;

    // Atomically enqueue each comment into durable storage
    for (const event of events) {
      if (!event.commentId) continue;

      const enqueueResult = await enqueueInstagramComment({
        commentId: event.commentId,
        instagramAccountId: event.instagramAccountId,
        commentText: event.commentText,
        username: event.commenterUsername,
        mediaId: event.mediaId,
      });

      if (enqueueResult.duplicate) {
        duplicateCount++;
        console.log(`[DUPLICATE_EVENT] Duplicate commentId=${event.commentId} received. Ignoring.`);
      } else {
        queuedCount++;
        console.log(
          `[EVENT_QUEUED] Queued commentId=${event.commentId} by @${event.commenterUsername || 'unknown'}: "${event.commentText}"`
        );
      }
    }

    // Trigger queue processing asynchronously in background without delaying HTTP 200 response
    if (queuedCount > 0) {
      Promise.resolve()
        .then(() => processQueue())
        .catch((qErr) => console.error('Background queue process trigger error:', qErr));
    }

    // Return HTTP 200 immediately to Meta
    return NextResponse.json(
      {
        status: 'EVENT_RECEIVED',
        queued: queuedCount,
        duplicates: duplicateCount,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('Meta Webhook Error:', err);
    // Returning 200 prevents Meta from endlessly retrying malformed payloads
    return NextResponse.json({ status: 'ERROR', message: err.message }, { status: 200 });
  }
}
