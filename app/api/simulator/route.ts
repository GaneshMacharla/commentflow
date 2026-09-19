import { NextRequest, NextResponse } from 'next/server';
import { processCommentEvent } from '@/lib/automation/engine';
import { NormalizedCommentEvent } from '@/lib/automation/types';
import { getConnectedAccount } from '@/lib/supabase/db';

/**
 * Webhook & Automation Simulator
 * POST /api/simulator
 * Tests automations directly without hitting live Meta APIs.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const account = await getConnectedAccount();

    const commentText = body.commentText || 'AI';
    const commenterUsername = body.commenterUsername || 'creator_fan';
    const mediaId = body.mediaId || 'reel_learn_ai';
    const commentId = body.commentId || `sim_comment_${Date.now()}`;

    const normalizedEvent: NormalizedCommentEvent = {
      eventId: commentId,
      commentId,
      mediaId,
      instagramAccountId: account?.id || 'acc-1',
      commenterUsername,
      commenterId: `sim_user_${Date.now()}`,
      commentText,
      permalink: `https://instagram.com/p/${mediaId}`,
      timestamp: new Date().toISOString(),
    };

    const result = await processCommentEvent(normalizedEvent, {
      isSimulation: true,
    });

    return NextResponse.json({
      success: true,
      event: normalizedEvent,
      result,
    });
  } catch (err: any) {
    console.error('Simulator error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Simulator failed' },
      { status: 500 }
    );
  }
}
