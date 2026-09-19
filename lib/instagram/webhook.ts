import { NormalizedCommentEvent } from '../automation/types';
import { InstagramWebhookPayload } from './types';

/**
 * Parses and normalizes incoming Meta webhook payloads into standard CommentFlow events.
 */
export function normalizeWebhookPayload(
  payload: InstagramWebhookPayload
): NormalizedCommentEvent[] {
  const events: NormalizedCommentEvent[] = [];

  if (!payload || !payload.entry || !Array.isArray(payload.entry)) {
    return events;
  }

  for (const entry of payload.entry) {
    const instagramAccountId = entry.id;

    if (!entry.changes || !Array.isArray(entry.changes)) {
      continue;
    }

    for (const change of entry.changes) {
      if (change.field === 'comments' && change.value) {
        const val = change.value;
        const commentId = val.id;
        const mediaId = val.media?.id || '';
        const commenterUsername = val.from?.username || 'instagram_user';
        const commenterId = val.from?.id || '';
        const commentText = val.text || '';

        if (commentId) {
          events.push({
            eventId: commentId,
            commentId,
            mediaId,
            instagramAccountId,
            commenterUsername,
            commenterId,
            commentText,
            timestamp: entry.time ? new Date(entry.time * 1000).toISOString() : new Date().toISOString(),
          });
        }
      }
    }
  }

  return events;
}
