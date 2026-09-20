import { describe, it, expect } from 'vitest';
import { processCommentEvent } from '../lib/automation/engine';
import { getDashboardStats, getActivityLogs } from '../lib/supabase/db';
import { NormalizedCommentEvent } from '../lib/automation/types';

describe('Live Reel Comment End-to-End Verification', () => {
  it('should process a Reel comment for AWS Reel and update dashboard stats', async () => {
    const statsBefore = await getDashboardStats();

    const event: NormalizedCommentEvent = {
      eventId: `verify_reel_comment_${Date.now()}`,
      commentId: `verify_comment_${Date.now()}`,
      mediaId: '18119152729940306', // The active AWS Reel ID
      mediaProductType: 'REELS',
      instagramAccountId: '28985672461036531',
      commenterUsername: 'reel_lead_tester',
      commenterId: 'tester_id_101',
      commentText: 'AWS link please!',
      timestamp: new Date().toISOString(),
    };

    const result = await processCommentEvent(event, { isSimulation: true });

    expect(result.matched).toBe(true);
    expect(result.status).toBe('SIMULATED_SENT');
    expect(result.results.length).toBeGreaterThan(0);

    const statsAfter = await getDashboardStats();
    expect(statsAfter.commentsDetected).toBeGreaterThanOrEqual(statsBefore.commentsDetected + 1);

    const logs = await getActivityLogs(5);
    const matchedLog = logs.find((l: any) => l.instagramCommentId === event.commentId);
    expect(matchedLog).toBeDefined();
    expect(matchedLog?.commenterUsername).toBe('reel_lead_tester');
    expect(matchedLog?.commentText).toBe('AWS link please!');
  });
});
