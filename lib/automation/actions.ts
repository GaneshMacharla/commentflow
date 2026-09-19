import { Action, ActionExecutionResult, NormalizedCommentEvent } from './types';
import { interpolateVariables } from './variables';
import { postCommentReply } from '../instagram/comments';
import { sendInstagramDirectMessage } from '../instagram/messaging';

export interface ActionDispatcherOptions {
  isSimulation?: boolean;
  accessToken?: string;
  permalink?: string;
  accountUsername?: string;
  instagramAccountId?: string;
}

/**
 * Executes an automation action (Public Reply or Private DM)
 * In simulation mode, formats the message and simulates a successful delivery without calling Meta.
 */
export async function executeAction(
  action: Action,
  event: NormalizedCommentEvent,
  options: ActionDispatcherOptions = {}
): Promise<ActionExecutionResult> {
  // If the action message contains multiple variations (separated by ||| or newline separator ---), randomly pick one
  let rawMessage = action.message;
  if (rawMessage.includes('|||')) {
    const variations = rawMessage.split('|||').map((v) => v.trim()).filter(Boolean);
    if (variations.length > 0) {
      rawMessage = variations[Math.floor(Math.random() * variations.length)];
    }
  } else if (rawMessage.includes('\n---\n')) {
    const variations = rawMessage.split('\n---\n').map((v) => v.trim()).filter(Boolean);
    if (variations.length > 0) {
      rawMessage = variations[Math.floor(Math.random() * variations.length)];
    }
  }

  const formattedMessage = interpolateVariables(rawMessage, {
    username: event.commenterUsername,
    comment: event.commentText,
    post_url: options.permalink || event.permalink,
  });

  // SIMULATION MODE
  if (options.isSimulation || !options.accessToken) {
    return {
      type: action.actionType,
      message: formattedMessage,
      success: true,
    };
  }

  // REAL MODE via Meta Graph API
  try {
    if (action.actionType === 'PUBLIC_REPLY') {
      await postCommentReply(event.commentId, formattedMessage, options.accessToken);
    } else if (action.actionType === 'PRIVATE_MESSAGE') {
      // If commenter is the account owner themselves, Instagram API does not permit sending a DM to yourself
      if (
        options.accountUsername &&
        event.commenterUsername.toLowerCase() === options.accountUsername.toLowerCase()
      ) {
        console.warn('Comment is from account owner. Instagram API does not permit sending private DMs to yourself.');
        return {
          type: action.actionType,
          message: formattedMessage,
          success: true,
          error: 'Instagram API does not permit sending private DMs to your own account. Test from another account to receive the DM.',
        };
      }

      await sendInstagramDirectMessage(
        event.commentId,
        event.commenterId,
        formattedMessage,
        options.accessToken,
        options.instagramAccountId
      );
    }

    return {
      type: action.actionType,
      message: formattedMessage,
      success: true,
    };
  } catch (err: any) {
    console.error(`Meta action execution failed (${action.actionType}):`, err);
    return {
      type: action.actionType,
      message: formattedMessage,
      success: false,
      error: err.message || 'Meta API action execution failed',
    };
  }
}
