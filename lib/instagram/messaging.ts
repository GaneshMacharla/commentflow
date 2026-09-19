import { graphApiFetch } from './client';

export interface SendMessageResponse {
  recipient_id: string;
  message_id: string;
}

/**
 * Sends a private Instagram DM to a commenter using Meta's official Private Replies API.
 * Endpoint: POST /v21.0/me/messages
 * Reference: Meta Graph API Instagram Send API / Private Replies
 */
export async function sendInstagramDirectMessage(
  commentId: string,
  recipientId: string | null,
  messageText: string,
  accessToken: string
): Promise<SendMessageResponse> {
  const endpoint = `/me/messages?access_token=${accessToken}`;

  // Meta Private Replies allows targeting directly by comment_id
  const recipient = commentId
    ? { comment_id: commentId }
    : { id: recipientId };

  return graphApiFetch<SendMessageResponse>(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      recipient,
      message: {
        text: messageText,
      },
    }),
  });
}
