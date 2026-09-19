import { NextRequest, NextResponse } from 'next/server';
import { verifyMetaHandshake, verifyMetaSignature } from '@/lib/security/webhook';
import { normalizeWebhookPayload } from '@/lib/instagram/webhook';
import { processCommentEvent } from '@/lib/automation/engine';
import { InstagramWebhookPayload } from '@/lib/instagram/types';

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
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-hub-signature-256');

    // If app secret is set in environment, enforce HMAC validation
    if (process.env.META_APP_SECRET && !signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    if (process.env.META_APP_SECRET && signature) {
      const isValid = verifyMetaSignature(rawBody, signature);
      if (!isValid) {
        return NextResponse.json({ error: 'Invalid HMAC signature' }, { status: 401 });
      }
    }

    const payload: InstagramWebhookPayload = JSON.parse(rawBody);
    const events = normalizeWebhookPayload(payload);

    // Process comment events asynchronously and return 200 quickly to Meta
    for (const event of events) {
      try {
        await processCommentEvent(event, { isSimulation: false });
      } catch (procErr) {
        console.error('Error processing event:', event.commentId, procErr);
      }
    }

    return NextResponse.json({ status: 'EVENT_RECEIVED', processed: events.length }, { status: 200 });
  } catch (err: any) {
    console.error('Meta Webhook Error:', err);
    // Returning 200 even on parse errors prevents Meta from retrying corrupt payloads endlessly
    return NextResponse.json({ status: 'ERROR', message: err.message }, { status: 200 });
  }
}
