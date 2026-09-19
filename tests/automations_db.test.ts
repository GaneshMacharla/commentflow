import { describe, it, expect } from 'vitest';
import { createAutomation, getAutomations, deleteAutomation, getConnectedAccount } from '@/lib/supabase/db';

describe('Supabase Automations Persistence', () => {
  it('creates an automation with valid UUIDs, triggers, actions, and retrieves it', async () => {
    const account = await getConnectedAccount();
    expect(account).not.toBeNull();
    const accountId = account!.id;

    // Create automation for a specific reel (e.g. AWS reel: 18119152729940306)
    const created = await createAutomation({
      instagramAccountId: accountId,
      mediaId: '18119152729940306',
      mediaCaption: 'AWS Builder Centre #aws',
      mediaThumbnailUrl: 'https://example.com/thumb.jpg',
      mediaType: 'REEL',
      name: 'Automated Test for AWS Reel',
      matchType: 'CONTAINS',
      matchMode: 'ANY',
      keywords: ['AWS', 'CLOUD'],
      publicReply: 'Sent! Check your DM 🔥',
      privateMessage: 'Here is your AWS link: https://aws.amazon.com',
    });

    expect(created).toBeDefined();
    expect(created.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(created.status).toBe('ACTIVE');
    expect(created.triggers.length).toBe(2);
    expect(created.actions.length).toBe(2);

    // Fetch automations back
    const all = await getAutomations();
    const found = all.find((a) => a.id === created.id);
    expect(found).toBeDefined();
    expect(found!.name).toBe('Automated Test for AWS Reel');
    expect(found!.triggers.map((t) => t.keyword)).toContain('AWS');
    expect(found!.actions.length).toBe(2);
    expect(found!.mediaId).toBe('18119152729940306');
    expect(found!.media).toBeDefined();
    expect(found!.media?.caption).toContain('AWS Builder Centre');

    // Clean up
    const deleted = await deleteAutomation(created.id);
    expect(deleted).toBe(true);

    const afterDelete = await getAutomations();
    expect(afterDelete.find((a) => a.id === created.id)).toBeUndefined();
  });
});
