import { describe, it, expect } from 'vitest';
import { checkAndSetIdempotency } from '../lib/supabase/db';

describe('Idempotency & Duplicate Protection', () => {
  it('should accept a new event ID and reject exact duplicates', async () => {
    const testEventId = `test_event_${Date.now()}_${Math.random()}`;

    // First attempt: must be accepted (true)
    const firstCheck = await checkAndSetIdempotency(testEventId);
    expect(firstCheck).toBe(true);

    // Second attempt with exact same ID: must be rejected (false)
    const secondCheck = await checkAndSetIdempotency(testEventId);
    expect(secondCheck).toBe(false);
  });
});
