import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { verifyMetaSignature, verifyMetaHandshake } from '../lib/security/webhook';
import { normalizeWebhookPayload } from '../lib/instagram/webhook';
import { InstagramWebhookPayload } from '../lib/instagram/types';

describe('Meta Webhook Security & Ingestion', () => {
  const testSecret = 'secret_key_12345';
  const rawBody = JSON.stringify({ test: 'payload' });

  it('should verify correct HMAC SHA-256 signatures', () => {
    const validHash = crypto.createHmac('sha256', testSecret).update(rawBody).digest('hex');
    const header = `sha256=${validHash}`;

    expect(verifyMetaSignature(rawBody, header, testSecret)).toBe(true);
  });

  it('should reject tampered bodies or invalid signatures', () => {
    const invalidHeader = 'sha256=abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';
    expect(verifyMetaSignature(rawBody, invalidHeader, testSecret)).toBe(false);
  });

  it('should verify Meta GET verification handshake', () => {
    const challenge = verifyMetaHandshake('subscribe', 'my_verify_token', '1158201444', 'my_verify_token');
    expect(challenge).toBe('1158201444');

    const invalid = verifyMetaHandshake('subscribe', 'wrong_token', '1158201444', 'my_verify_token');
    expect(invalid).toBeNull();
  });

  it('should parse and normalize Meta Instagram comment webhook payload', () => {
    const payload: InstagramWebhookPayload = {
      object: 'instagram',
      entry: [
        {
          id: '17841400008460056',
          time: 1520383571,
          changes: [
            {
              field: 'comments',
              value: {
                from: {
                  id: '17841405793187218',
                  username: 'jaydoe',
                },
                media: {
                  id: '17895695668004550',
                },
                id: '17895695668004550_17895695668004551',
                text: 'Send me the AI roadmap!',
              },
            },
          ],
        },
      ],
    };

    const events = normalizeWebhookPayload(payload);
    expect(events.length).toBe(1);
    expect(events[0].commentId).toBe('17895695668004550_17895695668004551');
    expect(events[0].commenterUsername).toBe('jaydoe');
    expect(events[0].commentText).toBe('Send me the AI roadmap!');
    expect(events[0].mediaId).toBe('17895695668004550');
  });

  it('should parse Reel webhook with string media ID and REELS product type', () => {
    const payload: InstagramWebhookPayload = {
      object: 'instagram',
      entry: [
        {
          id: '28985672461036531',
          time: 1789850000,
          changes: [
            {
              field: 'comments',
              value: {
                from: {
                  id: '12345678',
                  username: 'reel_viewer',
                },
                media: {
                  id: '18119152729940306',
                  media_product_type: 'REELS',
                },
                id: 'comment_reel_123',
                text: 'AWS',
              },
            },
          ],
        },
      ],
    };

    const events = normalizeWebhookPayload(payload);
    expect(events.length).toBe(1);
    expect(events[0].commentId).toBe('comment_reel_123');
    expect(events[0].mediaId).toBe('18119152729940306');
    expect(events[0].mediaProductType).toBe('REELS');
    expect(events[0].commentText).toBe('AWS');
    expect(events[0].commenterUsername).toBe('reel_viewer');
  });

  it('should parse Reel webhook where media is passed as direct string or media_id', () => {
    const payloadStringMedia: InstagramWebhookPayload = {
      object: 'instagram',
      entry: [
        {
          id: '28985672461036531',
          time: 1789850000,
          changes: [
            {
              field: 'comments',
              value: {
                from: { username: 'direct_user' },
                media: '18119152729940306',
                id: 'comment_direct_456',
                text: 'LINK please',
              },
            },
          ],
        },
      ],
    };

    const events = normalizeWebhookPayload(payloadStringMedia);
    expect(events.length).toBe(1);
    expect(events[0].mediaId).toBe('18119152729940306');
    expect(events[0].commenterUsername).toBe('direct_user');

    const payloadMediaId: InstagramWebhookPayload = {
      object: 'instagram',
      entry: [
        {
          id: '28985672461036531',
          time: 1789850000,
          changes: [
            {
              field: 'live_comments',
              value: {
                from: { username: 'live_user' },
                media_id: '18119152729940306',
                id: 'comment_live_789',
                text: 'PRICE',
              },
            },
          ],
        },
      ],
    };

    const liveEvents = normalizeWebhookPayload(payloadMediaId);
    expect(liveEvents.length).toBe(1);
    expect(liveEvents[0].mediaId).toBe('18119152729940306');
    expect(liveEvents[0].commentText).toBe('PRICE');
  });

  it('should parse nested comment replies with parent_id', () => {
    const payloadReply: InstagramWebhookPayload = {
      object: 'instagram',
      entry: [
        {
          id: '28985672461036531',
          time: 1789850000,
          changes: [
            {
              field: 'comments',
              value: {
                from: { username: 'reply_user' },
                parent_id: 'parent_comment_111',
                media_id: '18119152729940306',
                id: 'child_comment_222',
                text: 'FREE',
              },
            },
          ],
        },
      ],
    };

    const events = normalizeWebhookPayload(payloadReply);
    expect(events.length).toBe(1);
    expect(events[0].parentId).toBe('parent_comment_111');
    expect(events[0].commentId).toBe('child_comment_222');
  });
});
