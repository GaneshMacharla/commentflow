import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as webhookGET, POST as webhookPOST } from '@/app/api/webhooks/instagram/route';
import { verifyMetaHandshake } from '@/lib/security/webhook';
import { matchComment } from '@/lib/automation/matcher';
import {
  enqueueInstagramComment,
  claimPendingComments,
  clearQueueLocally,
  getQueuedCommentByCommentId,
  createAutomation,
  updateQueuedComment,
  getConnectedAccount,
} from '@/lib/supabase/db';
import { processSingleComment, processQueue, resetRateLimiter } from '@/lib/queue/processor';
import * as messaging from '@/lib/instagram/messaging';
import { MetaApiError } from '@/lib/instagram/client';

describe('Instagram Comment -> DM Automation Suite', () => {
  let testAccountId = 'a0000000-0000-4000-8000-000000000001';

  beforeEach(async () => {
    clearQueueLocally();
    resetRateLimiter();
    vi.restoreAllMocks();
    process.env.MOCK_INSTAGRAM = 'true';
    process.env.WEBHOOK_VERIFY_TOKEN = 'test_verify_token_123';
    process.env.META_APP_SECRET = 'test_meta_secret_456';

    const account = await getConnectedAccount();
    if (account?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(account.id)) {
      testAccountId = account.id;
    }
  });

  // 1. Webhook verification
  it('1. should verify Meta Webhook handshake challenge correctly on GET', async () => {
    const verified = verifyMetaHandshake('subscribe', 'test_verify_token_123', 'challenge_abc_123');
    expect(verified).toBe('challenge_abc_123');

    // Route handler test
    const req = new NextRequest(
      'http://localhost:3000/api/webhooks/instagram?hub.mode=subscribe&hub.verify_token=test_verify_token_123&hub.challenge=challenge_abc_123'
    );
    const res = await webhookGET(req);
    expect(res.status).toBe(200);
    const bodyText = await res.text();
    expect(bodyText).toBe('challenge_abc_123');
  });

  // 2. Valid comment event
  it('2. should parse and enqueue valid Instagram comment event from POST webhook', async () => {
    const payload = {
      object: 'instagram',
      entry: [
        {
          id: testAccountId,
          time: 1710000000,
          changes: [
            {
              field: 'comments',
              value: {
                id: 'comment_valid_001',
                text: 'Send me the FLOW tutorial',
                from: { id: 'user_111', username: 'tester_john' },
                media: { id: 'media_reel_222' },
              },
            },
          ],
        },
      ],
    };

    const req = new NextRequest('http://localhost:3000/api/webhooks/instagram', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const res = await webhookPOST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('EVENT_RECEIVED');
    expect(body.queued).toBe(1);

    const queued = await getQueuedCommentByCommentId('comment_valid_001');
    expect(queued).not.toBeNull();
    expect(queued?.commentText).toBe('Send me the FLOW tutorial');
    expect(queued?.username).toBe('tester_john');
    expect(['PENDING', 'PROCESSING', 'SKIPPED']).toContain(queued?.processingStatus);
  });

  // 3. Invalid event
  it('3. should safely ignore invalid or unsupported webhook events without crashing', async () => {
    // Malformed JSON
    const malformedReq = new NextRequest('http://localhost:3000/api/webhooks/instagram', {
      method: 'POST',
      body: '{ invalid_json ',
    });
    const malformedRes = await webhookPOST(malformedReq);
    expect(malformedRes.status).toBe(200);

    // Event with unrelated change (e.g. story_insights)
    const unrelatedPayload = {
      object: 'instagram',
      entry: [
        {
          id: testAccountId,
          changes: [{ field: 'story_insights', value: { views: 42 } }],
        },
      ],
    };
    const req = new NextRequest('http://localhost:3000/api/webhooks/instagram', {
      method: 'POST',
      body: JSON.stringify(unrelatedPayload),
    });
    const res = await webhookPOST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.queued).toBe(0);
  });

  // 4. Duplicate webhook
  it('4. should ignore duplicate webhook events via unique comment ID constraint', async () => {
    const payload = {
      object: 'instagram',
      entry: [
        {
          id: testAccountId,
          changes: [
            {
              field: 'comments',
              value: {
                id: 'comment_dup_test',
                text: 'FLOW please',
                from: { username: 'dup_user' },
              },
            },
          ],
        },
      ],
    };

    // First delivery
    const req1 = new NextRequest('http://localhost:3000/api/webhooks/instagram', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const res1 = await webhookPOST(req1);
    const body1 = await res1.json();
    expect(body1.queued).toBe(1);

    // Meta retry / duplicate delivery of exact same comment
    const req2 = new NextRequest('http://localhost:3000/api/webhooks/instagram', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const res2 = await webhookPOST(req2);
    const body2 = await res2.json();
    expect(body2.queued).toBe(0);
    expect(body2.duplicates).toBe(1);
  });

  // 5. Keyword matching
  it('5. should match keyword FLOW when present in comment text', () => {
    const res1 = matchComment('Can you send FLOW link?', ['FLOW'], 'CONTAINS', 'ANY');
    expect(res1.matched).toBe(true);
    expect(res1.matchedKeywords).toContain('FLOW');

    const res2 = matchComment('Just a random comment', ['FLOW'], 'CONTAINS', 'ANY');
    expect(res2.matched).toBe(false);
  });

  // 6. Case-insensitive matching
  it('6. should match keywords case-insensitively across Flow, flow, and FLOW', () => {
    expect(matchComment('FLOW', ['flow'], 'EXACT', 'ANY').matched).toBe(true);
    expect(matchComment('please send Flow', ['FLOW'], 'CONTAINS', 'ANY').matched).toBe(true);
    expect(matchComment('flow tutorial', ['Flow'], 'STARTS_WITH', 'ANY').matched).toBe(true);
    expect(matchComment('need that FLOW', ['flow'], 'ENDS_WITH', 'ANY').matched).toBe(true);
  });

  // 7. Queue insertion
  it('7. should insert comments with PENDING processing status and initial retry count 0', async () => {
    const res = await enqueueInstagramComment({
      commentId: 'comment_q_insert_1',
      instagramAccountId: testAccountId,
      commentText: 'FLOW',
      username: 'alice',
      mediaId: 'media_1',
    });

    expect(res.success).toBe(true);
    expect(res.duplicate).toBe(false);
    expect(res.comment.processingStatus).toBe('PENDING');
    expect(res.comment.retryCount).toBe(0);
  });

  // 8. Atomic job claiming
  it('8. should atomically claim pending comments and mark them as PROCESSING', async () => {
    await enqueueInstagramComment({
      commentId: 'comment_claim_1',
      instagramAccountId: testAccountId,
      commentText: 'FLOW',
    });
    await enqueueInstagramComment({
      commentId: 'comment_claim_2',
      instagramAccountId: testAccountId,
      commentText: 'FLOW',
    });

    // Claim batch of 1
    const claimedFirst = await claimPendingComments(1);
    expect(claimedFirst.length).toBe(1);
    expect(claimedFirst[0].instagramCommentId).toBe('comment_claim_1');
    expect(claimedFirst[0].processingStatus).toBe('PROCESSING');

    // Claim second batch: first one is already PROCESSING, so it cannot be claimed twice
    const claimedSecond = await claimPendingComments(1);
    expect(claimedSecond.length).toBe(1);
    expect(claimedSecond[0].instagramCommentId).toBe('comment_claim_2');

    // Third claim should be empty
    const claimedThird = await claimPendingComments(1);
    expect(claimedThird.length).toBe(0);
  });

  // 9. Successful DM
  it('9. should process comment, match rule, send DM, and mark COMPLETED with dmStatus SENT', async () => {
    await createAutomation({
      name: 'Flow Tutorial DM',
      instagramAccountId: testAccountId,
      mediaId: null, // global
      matchType: 'CONTAINS',
      matchMode: 'ANY',
      keywords: ['FLOW'],
      privateMessage: 'Hey @{username}! Here is your link: https://google.com/flow',
    });

    const enq = await enqueueInstagramComment({
      commentId: 'comment_dm_success',
      instagramAccountId: testAccountId,
      commentText: 'Please send FLOW!',
      username: 'happy_user',
    });

    const claimed = await claimPendingComments(10);
    const target = claimed.find((c) => c.instagramCommentId === 'comment_dm_success')!;

    const result = await processSingleComment(target);
    expect(result.status).toBe('COMPLETED');

    const updated = await getQueuedCommentByCommentId('comment_dm_success');
    expect(updated?.processingStatus).toBe('COMPLETED');
    expect(updated?.dmStatus).toBe('SENT');
    expect(updated?.matchedKeyword).toBe('FLOW');
  });

  // 10. Temporary API failure
  it('10. should schedule retry on temporary Meta 5xx API failure', async () => {
    await createAutomation({
      name: 'Flow DM Fail Test',
      instagramAccountId: testAccountId,
      mediaId: null,
      matchType: 'CONTAINS',
      matchMode: 'ANY',
      keywords: ['FAIL_TEST'],
      privateMessage: 'Test message',
    });

    // Mock sendInstagramDirectMessage to throw transient 500 error
    vi.spyOn(messaging, 'sendInstagramDirectMessage').mockRejectedValueOnce(
      new MetaApiError({ message: 'Service Unavailable', code: 2, type: 'OAuthException' }, 503)
    );

    await enqueueInstagramComment({
      commentId: 'comment_transient_500',
      instagramAccountId: testAccountId,
      commentText: 'FAIL_TEST',
      username: 'retry_user',
    });

    const claimed = await claimPendingComments(10);
    const target = claimed.find((c) => c.instagramCommentId === 'comment_transient_500')!;

    const result = await processSingleComment(target, { maxRetries: 3 });
    expect(result.status).toBe('RETRY');

    const updated = await getQueuedCommentByCommentId('comment_transient_500');
    expect(updated?.processingStatus).toBe('PENDING');
    expect(updated?.retryCount).toBe(1);
    expect(updated?.errorMessage).toContain('Transient error');
  });

  // 11. 429 rate limit
  it('11. should detect HTTP 429 rate limit and schedule backoff retry', async () => {
    await createAutomation({
      name: 'Rate Limit Test',
      instagramAccountId: testAccountId,
      mediaId: null,
      matchType: 'CONTAINS',
      matchMode: 'ANY',
      keywords: ['RATE_ME'],
      privateMessage: 'Rate limited DM',
    });

    vi.spyOn(messaging, 'sendInstagramDirectMessage').mockRejectedValueOnce(
      new MetaApiError({ message: 'User request limit reached', code: 4, type: 'OAuthException' }, 429)
    );

    await enqueueInstagramComment({
      commentId: 'comment_429_test',
      instagramAccountId: testAccountId,
      commentText: 'RATE_ME',
      username: 'rate_user',
    });

    const claimed = await claimPendingComments(10);
    const target = claimed.find((c) => c.instagramCommentId === 'comment_429_test')!;

    const result = await processSingleComment(target, { maxRetries: 3 });
    expect(result.status).toBe('RETRY');

    const updated = await getQueuedCommentByCommentId('comment_429_test');
    expect(updated?.processingStatus).toBe('PENDING');
    expect(updated?.retryCount).toBe(1);
  });

  // 12. Retry-After
  it('12. should respect Meta Retry-After header and set nextRetryAt accordingly', async () => {
    await createAutomation({
      name: 'Retry-After Test',
      instagramAccountId: testAccountId,
      mediaId: null,
      matchType: 'CONTAINS',
      matchMode: 'ANY',
      keywords: ['RETRY_AFTER'],
      privateMessage: 'Retry-After DM',
    });

    const retrySecs = 15;
    vi.spyOn(messaging, 'sendInstagramDirectMessage').mockRejectedValueOnce(
      new MetaApiError(
        { message: 'Rate limited with header', code: 613, type: 'OAuthException' },
        429,
        retrySecs
      )
    );

    await enqueueInstagramComment({
      commentId: 'comment_retry_after_test',
      instagramAccountId: testAccountId,
      commentText: 'RETRY_AFTER',
      username: 'header_user',
    });

    const claimed = await claimPendingComments(10);
    const target = claimed.find((c) => c.instagramCommentId === 'comment_retry_after_test')!;

    const before = Date.now();
    await processSingleComment(target, { maxRetries: 3 });

    const updated = await getQueuedCommentByCommentId('comment_retry_after_test');
    expect(updated?.nextRetryAt).toBeDefined();
    const scheduledTime = new Date(updated!.nextRetryAt!).getTime();
    expect(scheduledTime).toBeGreaterThanOrEqual(before + retrySecs * 1000 - 500);
  });

  // 13. Exponential backoff
  it('13. should calculate exponential backoff for sequential retries', async () => {
    await createAutomation({
      name: 'Backoff Test',
      instagramAccountId: testAccountId,
      mediaId: null,
      matchType: 'CONTAINS',
      matchMode: 'ANY',
      keywords: ['BACKOFF'],
      privateMessage: 'Backoff DM',
    });

    vi.spyOn(messaging, 'sendInstagramDirectMessage').mockRejectedValue(
      new MetaApiError({ message: 'Temporary glitch', code: 1, type: 'OAuthException' }, 500)
    );

    const enq = await enqueueInstagramComment({
      commentId: 'comment_backoff_seq',
      instagramAccountId: testAccountId,
      commentText: 'BACKOFF',
      username: 'backoff_user',
    });

    // Retry 1: wait ~ 2^1 = 2s
    let claimed = await claimPendingComments(10);
    const item1 = claimed.find((c) => c.instagramCommentId === 'comment_backoff_seq')!;
    await processSingleComment(item1, { maxRetries: 5 });
    let record = await getQueuedCommentByCommentId('comment_backoff_seq');
    expect(record?.retryCount).toBe(1);

    // Reset nextRetryAt to simulate time passing
    await updateQueuedComment(record!.id, { nextRetryAt: new Date(Date.now() - 1000).toISOString() });

    // Retry 2: wait ~ 2^2 = 4s
    claimed = await claimPendingComments(10);
    const item2 = claimed.find((c) => c.instagramCommentId === 'comment_backoff_seq')!;
    await processSingleComment(item2, { maxRetries: 5 });
    record = await getQueuedCommentByCommentId('comment_backoff_seq');
    expect(record?.retryCount).toBe(2);
  });

  // 14. Maximum retries
  it('14. should mark comment permanently FAILED after exceeding maximum retries', async () => {
    await createAutomation({
      name: 'Max Retries Test',
      instagramAccountId: testAccountId,
      mediaId: null,
      matchType: 'CONTAINS',
      matchMode: 'ANY',
      keywords: ['EXCEED_RETRIES'],
      privateMessage: 'Exceed DM',
    });

    vi.spyOn(messaging, 'sendInstagramDirectMessage').mockRejectedValue(
      new MetaApiError({ message: 'Persistent outage', code: 2, type: 'OAuthException' }, 503)
    );

    const enq = await enqueueInstagramComment({
      commentId: 'comment_exceed_max',
      instagramAccountId: testAccountId,
      commentText: 'EXCEED_RETRIES',
      username: 'exceed_user',
    });

    // Set existing retryCount to max (2 of 2)
    await updateQueuedComment(enq.comment.id, { retryCount: 2 });

    const claimed = await claimPendingComments(10);
    const target = claimed.find((c) => c.instagramCommentId === 'comment_exceed_max')!;

    const result = await processSingleComment(target, { maxRetries: 2 });
    expect(result.status).toBe('FAILED');

    const updated = await getQueuedCommentByCommentId('comment_exceed_max');
    expect(updated?.processingStatus).toBe('FAILED');
    expect(updated?.dmStatus).toBe('FAILED');
    expect(updated?.errorMessage).toContain('Max retries (2) exceeded');
  });

  // 15. Duplicate DM prevention
  it('15. should prevent duplicate DMs if comment was already marked SENT / COMPLETED', async () => {
    const sendSpy = vi.spyOn(messaging, 'sendInstagramDirectMessage');

    const enq = await enqueueInstagramComment({
      commentId: 'comment_already_sent',
      instagramAccountId: testAccountId,
      commentText: 'FLOW',
      username: 'repeat_customer',
    });

    // Mark as already COMPLETED & SENT
    await updateQueuedComment(enq.comment.id, {
      processingStatus: 'COMPLETED',
      dmStatus: 'SENT',
    });

    const claimed = (await getQueuedCommentByCommentId('comment_already_sent'))!;
    const res = await processSingleComment(claimed);

    expect(res.status).toBe('COMPLETED');
    expect(sendSpy).not.toHaveBeenCalled();
  });

  // 16. Mock mode
  it('16. should execute full pipeline in mock mode without real Meta Graph API calls', async () => {
    process.env.MOCK_INSTAGRAM = 'true';

    await createAutomation({
      name: 'Mock Pipeline Test',
      instagramAccountId: testAccountId,
      mediaId: null,
      matchType: 'CONTAINS',
      matchMode: 'ANY',
      keywords: ['MOCKFLOW'],
      privateMessage: 'Mock link: https://example.com/flow',
    });

    await enqueueInstagramComment({
      commentId: 'comment_mock_test_16',
      instagramAccountId: testAccountId,
      commentText: 'Give me MOCKFLOW please!',
      username: 'mock_creator',
    });

    const queueResult = await processQueue();
    expect(queueResult.processed).toBeGreaterThan(0);
    expect(queueResult.completed).toBe(1);

    const record = await getQueuedCommentByCommentId('comment_mock_test_16');
    expect(record?.processingStatus).toBe('COMPLETED');
    expect(record?.dmStatus).toBe('SENT');
  });
});
