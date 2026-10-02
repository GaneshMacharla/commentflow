import { NextRequest, NextResponse } from 'next/server';
import { processQueue } from '@/lib/queue/processor';

/**
 * POST /api/queue/process
 * Background worker trigger endpoint to drain pending comments from the durable queue.
 */
export async function POST(request: NextRequest) {
  try {
    let options = {};
    try {
      const body = await request.json();
      if (body && typeof body === 'object') {
        options = body;
      }
    } catch {
      // Body is optional
    }

    const result = await processQueue(options);
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error('Queue processing error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * GET /api/queue/process
 * Quick health and trigger check.
 */
export async function GET() {
  try {
    const result = await processQueue();
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
