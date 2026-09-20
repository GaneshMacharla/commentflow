import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processCommentEvent } from '../lib/automation/engine';
import { NormalizedCommentEvent } from '../lib/automation/types';
import * as db from '../lib/supabase/db';

describe('Reel Comment Detection & Engine Processing', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should match a Reel comment using the Instagram numeric media ID', async () => {
    // Mock automations returning an automation targeting Reel '18119152729940306'
    vi.spyOn(db, 'getAutomations').mockResolvedValue([
      {
        id: 'auto_reel_1',
        userId: 'user-1',
        instagramAccountId: '28985672461036531',
        mediaId: '71239577-a0b8-44da-921a-f339347a6cdb', // Supabase UUID
        media: {
          id: '71239577-a0b8-44da-921a-f339347a6cdb',
          instagramMediaId: '18119152729940306',
          caption: 'AWS Builder Centre #aws',
          mediaType: 'REEL',
        },
        name: 'AWS Reel Lead Magnet',
        status: 'ACTIVE',
        matchType: 'CONTAINS',
        matchMode: 'ANY',
        triggers: [{ id: 'trig_1', automationId: 'auto_reel_1', keyword: 'AWS' }],
        actions: [
          { id: 'act_1', automationId: 'auto_reel_1', actionType: 'PUBLIC_REPLY', message: 'Check your DM!' },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    vi.spyOn(db, 'getMedia').mockResolvedValue([
      {
        id: '71239577-a0b8-44da-921a-f339347a6cdb',
        instagramMediaId: '18119152729940306',
        mediaType: 'REEL',
        caption: 'AWS Builder Centre #aws',
      },
    ]);

    vi.spyOn(db, 'checkAndSetIdempotency').mockResolvedValue(true);
    vi.spyOn(db, 'getConnectedAccount').mockResolvedValue({
      id: 'acc_1',
      userId: 'user-1',
      instagramUserId: '28985672461036531',
      username: 'documentingmylife127',
      accessToken: 'mock_token',
      status: 'CONNECTED',
      createdAt: new Date().toISOString(),
    });

    const logSpy = vi.spyOn(db, 'logAutomationEvent').mockResolvedValue({} as any);

    const event: NormalizedCommentEvent = {
      eventId: 'evt_reel_1',
      commentId: '18332031949278808',
      mediaId: '18119152729940306',
      mediaProductType: 'REELS',
      instagramAccountId: '28985672461036531',
      commenterUsername: 'alex_fan',
      commenterId: 'user_fan_1',
      commentText: 'Send the AWS link please',
    };

    const result = await processCommentEvent(event, { isSimulation: true });
    expect(result.matched).toBe(true);
    expect(result.status).toBe('SIMULATED_SENT');
    expect(result.automationId).toBe('auto_reel_1');
    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        automationId: 'auto_reel_1',
        status: 'SIMULATED_SENT',
        commentText: 'Send the AWS link please',
      })
    );
  });

  it('should log SKIPPED event to audit log when comment arrives but keywords do not match', async () => {
    vi.spyOn(db, 'getAutomations').mockResolvedValue([
      {
        id: 'auto_reel_1',
        userId: 'user-1',
        instagramAccountId: '28985672461036531',
        mediaId: '18119152729940306',
        name: 'AWS Reel Lead Magnet',
        status: 'ACTIVE',
        matchType: 'EXACT',
        matchMode: 'ANY',
        triggers: [{ id: 'trig_1', automationId: 'auto_reel_1', keyword: 'AWS' }],
        actions: [{ id: 'act_1', automationId: 'auto_reel_1', actionType: 'PUBLIC_REPLY', message: 'Hello' }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    vi.spyOn(db, 'getMedia').mockResolvedValue([]);
    vi.spyOn(db, 'checkAndSetIdempotency').mockResolvedValue(true);
    vi.spyOn(db, 'getConnectedAccount').mockResolvedValue(null);

    const logSpy = vi.spyOn(db, 'logAutomationEvent').mockResolvedValue({} as any);

    const event: NormalizedCommentEvent = {
      eventId: 'evt_reel_no_match',
      commentId: 'comment_999',
      mediaId: '18119152729940306',
      instagramAccountId: '28985672461036531',
      commenterUsername: 'visitor',
      commenterId: 'visitor_1',
      commentText: 'Unrelated comment here',
    };

    const result = await processCommentEvent(event, { isSimulation: true });
    expect(result.matched).toBe(false);
    expect(result.status).toBe('SKIPPED');
    // Verifies audit logging so Comments Detected count increments!
    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'SKIPPED',
        commentText: 'Unrelated comment here',
      })
    );
  });

  it('should log SKIPPED event when no automation targets the Reel', async () => {
    vi.spyOn(db, 'getAutomations').mockResolvedValue([]);
    vi.spyOn(db, 'getMedia').mockResolvedValue([]);
    vi.spyOn(db, 'checkAndSetIdempotency').mockResolvedValue(true);

    const logSpy = vi.spyOn(db, 'logAutomationEvent').mockResolvedValue({} as any);

    const event: NormalizedCommentEvent = {
      eventId: 'evt_reel_no_auto',
      commentId: 'comment_888',
      mediaId: '18119152729940306',
      instagramAccountId: '28985672461036531',
      commenterUsername: 'visitor',
      commenterId: 'visitor_2',
      commentText: 'AWS',
    };

    const result = await processCommentEvent(event, { isSimulation: true });
    expect(result.matched).toBe(false);
    expect(result.status).toBe('SKIPPED');
    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'SKIPPED',
        instagramCommentId: 'comment_888',
      })
    );
  });
});
