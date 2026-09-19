import { graphApiFetch } from './client';

export interface CommentReplyResponse {
  id: string; // The ID of the created reply comment
}

/**
 * Posts a public reply to an Instagram comment using the official Meta API.
 * Endpoint: POST /{comment-id}/replies
 */
export async function postCommentReply(
  commentId: string,
  message: string,
  accessToken: string
): Promise<CommentReplyResponse> {
  const endpoint = `/${commentId}/replies`;

  return graphApiFetch<CommentReplyResponse>(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      access_token: accessToken,
    }),
  });
}
