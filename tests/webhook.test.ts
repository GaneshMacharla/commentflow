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
});
