import { NextRequest, NextResponse } from 'next/server';
import { getConnectedAccount, getAutomations, getMedia, logAutomationEvent } from '@/lib/supabase/db';
import { processCommentEvent } from '@/lib/automation/engine';
import { NormalizedCommentEvent } from '@/lib/automation/types';

/**
 * GET /api/instagram/comments/detect
 * Returns active automations targeting Reels and detection readiness.
 */
export async function GET() {
  try {
    const account = await getConnectedAccount();
    if (!account) {
      return NextResponse.json({ connected: false, message: 'No Instagram account connected' });
    }

    const automations = await getAutomations();
    const activeReelAutomations = automations.filter((a) => a.status === 'ACTIVE');

    return NextResponse.json({
      connected: true,
      account: {
        username: account.username,
        instagramUserId: account.instagramUserId,
      },
      activeAutomationsCount: activeReelAutomations.length,
      automations: activeReelAutomations.map((a) => ({
        id: a.id,
        name: a.name,
        mediaId: a.mediaId,
        mediaCaption: a.media?.caption,
        permalink: a.media?.permalink,
        keywords: a.triggers.map((t) => t.keyword),
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/instagram/comments/detect
 * Scans Instagram Graph API for new comments on targeted Reels, or simulates/dispatches a test comment.
 */
export async function POST(request: NextRequest) {
  try {
    const account = await getConnectedAccount();
    if (!account) {
      return NextResponse.json(
        { error: 'No connected Instagram account found. Please connect your account first.' },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { mediaId, testComment, force = false } = body;

    const [automations, mediaList] = await Promise.all([
      getAutomations(),
      getMedia(),
    ]);

    const activeAutomations = automations.filter((a) => a.status === 'ACTIVE');

    // ── Scenario A: User triggers a live/simulated test comment on a Reel ───────
    if (testComment) {
      const commentText = testComment.text || 'AWS';
      const commenterUsername = testComment.username || 'reel_fan';
      const targetMediaId =
        mediaId ||
        activeAutomations[0]?.media?.instagramMediaId ||
        activeAutomations[0]?.mediaId ||
        mediaList[0]?.instagramMediaId ||
        '18119152729940306';

      const matchedMedia = mediaList.find(
        (m: any) => m.id === targetMediaId || m.instagramMediaId === targetMediaId
      );

      const commentId = `test_reel_comment_${Date.now()}`;
      const normalizedEvent: NormalizedCommentEvent = {
        eventId: commentId,
        commentId,
        mediaId: targetMediaId,
        mediaProductType: 'REELS',
        instagramAccountId: account.instagramUserId,
        commenterUsername,
        commenterId: `user_${Date.now()}`,
        commentText,
        permalink: matchedMedia?.permalink,
        timestamp: new Date().toISOString(),
      };

      const result = await processCommentEvent(normalizedEvent, {
        isSimulation: Boolean(testComment.isSimulation),
        force: true,
      });

      return NextResponse.json({
        success: true,
        type: 'TEST_COMMENT_PROCESSED',
        event: normalizedEvent,
        result,
      });
    }

    // ── Scenario B: Live Polling & Graph API Comment Detection ─────────────────
    // Determine which media items to check: specific mediaId or active automations' media
    const targetMediaIds: string[] = [];
    if (mediaId) {
      targetMediaIds.push(mediaId);
    } else {
      for (const auto of activeAutomations) {
        if (auto.media?.instagramMediaId) {
          targetMediaIds.push(auto.media.instagramMediaId);
        } else if (auto.mediaId) {
          targetMediaIds.push(auto.mediaId);
        }
      }
      // If no specific media targeted, include up to 5 most recent media from mediaList
      if (targetMediaIds.length === 0) {
        for (const m of mediaList.slice(0, 5)) {
          if (m.instagramMediaId) targetMediaIds.push(m.instagramMediaId);
        }
      }
    }

    const uniqueMediaIds = Array.from(new Set(targetMediaIds));
    const detectedEvents: any[] = [];
    const executionResults: any[] = [];
    let checkedCount = 0;

    for (const mId of uniqueMediaIds) {
      checkedCount++;
      try {
        const commentsUrl = `https://graph.instagram.com/v21.0/${mId}/comments?fields=id,text,timestamp,username,from&limit=25&access_token=${account.accessToken}`;
        const res = await fetch(commentsUrl);
        const data = await res.json();

        const rawComments = data.data || [];
        for (const c of rawComments) {
          const commentId = c.id;
          const commentText = c.text || '';
          const commenterUsername = c.username || c.from?.username || 'instagram_user';
          const commenterId = c.from?.id || '';

          const normalizedEvent: NormalizedCommentEvent = {
            eventId: commentId,
            commentId,
            mediaId: mId,
            mediaProductType: 'REELS',
            instagramAccountId: account.instagramUserId,
            commenterUsername,
            commenterId,
            commentText,
            timestamp: c.timestamp || new Date().toISOString(),
          };

          detectedEvents.push(normalizedEvent);
          const execRes = await processCommentEvent(normalizedEvent, {
            force,
          });
          executionResults.push(execRes);
        }
      } catch (graphErr: any) {
        console.warn(`Could not query comments for media ${mId}:`, graphErr);
      }
    }

    return NextResponse.json({
      success: true,
      checkedMediaCount: checkedCount,
      detectedCommentsCount: detectedEvents.length,
      processed: executionResults.length,
      results: executionResults,
      message:
        detectedEvents.length > 0
          ? `Successfully detected ${detectedEvents.length} comments across ${checkedCount} Reels/posts.`
          : `Checked ${checkedCount} Reels. No unhandled comments returned by Graph API. If your Meta App is in Development Mode, use the "Test Reel Comment" trigger below or check webhooks.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
