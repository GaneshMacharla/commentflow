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
    const defaultTimestamp = entry.time
      ? new Date(entry.time * 1000).toISOString()
      : new Date().toISOString();

    // 1. Process entry.changes (standard Meta Graph API webhooks)
    if (entry.changes && Array.isArray(entry.changes)) {
      for (const change of entry.changes) {
        // Field can be 'comments', 'live_comments' (Reels live), 'mentions', or 'feed'
        const isCommentField =
          change.field === 'comments' ||
          change.field === 'live_comments' ||
          change.field === 'mentions' ||
          (change.field === 'feed' && (!change.value.item || change.value.item === 'comment'));

        if (isCommentField && change.value) {
          const val = change.value;
          const commentId = val.id || val.comment_id || '';

          // Extract mediaId across all Meta formats (object, string ID, media_id, post_id)
          let mediaId = '';
          let mediaProductType: string | undefined;

          if (typeof val.media === 'string') {
            mediaId = val.media;
          } else if (val.media && typeof val.media === 'object') {
            mediaId = val.media.id || '';
            mediaProductType = val.media.media_product_type;
          }

          if (!mediaId) {
            mediaId = val.media_id || val.post_id || val.target_id || '';
          }

          const commenterUsername =
            val.from?.username || val.username || val.from?.name || 'instagram_user';
          const commenterId =
            val.from?.id || val.user_id || val.commenter_id || '';
          const commentText = val.text || val.message || '';
          const parentId = val.parent_id || undefined;

          if (commentId) {
            events.push({
              eventId: commentId,
              commentId,
              mediaId,
              mediaProductType,
              parentId,
              instagramAccountId,
              commenterUsername,
              commenterId,
              commentText,
              timestamp: defaultTimestamp,
            });
          }
        }
      }
    }

    // 2. Process entry.messaging (Instagram Messaging webhooks)
    if (entry.messaging && Array.isArray(entry.messaging)) {
      for (const msg of entry.messaging) {
        if (msg.message && msg.message.mid) {
          const commentId = msg.message.mid;
          const commenterId = msg.sender?.id || '';
          const commentText = msg.message.text || '';
          const mediaId = msg.recipient?.id || '';

          events.push({
            eventId: commentId,
            commentId,
            mediaId,
            instagramAccountId,
            commenterUsername: 'instagram_user',
            commenterId,
            commentText,
            timestamp: defaultTimestamp,
          });
        }
      }
    }
  }

  return events;
}
