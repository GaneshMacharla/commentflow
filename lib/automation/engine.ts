import {
  NormalizedCommentEvent,
  ProcessEventResult,
  ActionExecutionResult,
  EventStatus,
} from './types';
import { matchComment } from './matcher';
import { executeAction } from './actions';
import {
  checkAndSetIdempotency,
  getAutomations,
  getConnectedAccount,
  getMedia,
  logAutomationEvent,
} from '../supabase/db';

export interface ProcessCommentOptions {
  isSimulation?: boolean;
}

/**
 * Core Automation Engine
 * Processes normalized Instagram comment events, checks idempotency, evaluates trigger rules,
 * executes configured actions, and logs results.
 */
export async function processCommentEvent(
  event: NormalizedCommentEvent,
  options: ProcessCommentOptions = {}
): Promise<ProcessEventResult> {
  const isSimulation = options.isSimulation ?? false;

  // 1. Idempotency / Duplicate Check
  const isNewEvent = await checkAndSetIdempotency(event.eventId);
  if (!isNewEvent) {
    return {
      eventId: event.eventId,
      matched: false,
      status: 'SKIPPED',
      results: [],
      error: 'Duplicate event: already processed',
    };
  }

  // 2. Fetch Active Automations
  const [allAutomations, mediaList] = await Promise.all([
    getAutomations(),
    getMedia(),
  ]);

  const matchedMedia = mediaList.find(
    (m: any) => m.id === event.mediaId || m.instagramMediaId === event.mediaId
  );
  const candidateMediaIds = new Set(
    [event.mediaId, matchedMedia?.id, matchedMedia?.instagramMediaId].filter(Boolean)
  );

  const activeAutomations = allAutomations.filter(
    (auto) =>
      auto.status === 'ACTIVE' &&
      (!auto.mediaId || candidateMediaIds.has(auto.mediaId))
  );

  if (activeAutomations.length === 0) {
    return {
      eventId: event.eventId,
      matched: false,
      status: 'SKIPPED',
      results: [],
    };
  }

  // 3. Find First Matching Automation
  let matchedAutomation = null;
  let matchInfo = null;

  for (const auto of activeAutomations) {
    const keywords = auto.triggers.map((t) => t.keyword);
    const result = matchComment(
      event.commentText,
      keywords,
      auto.matchType,
      auto.matchMode
    );

    if (result.matched) {
      matchedAutomation = auto;
      matchInfo = result;
      break;
    }
  }

  if (!matchedAutomation) {
    // Comment did not match keywords
    return {
      eventId: event.eventId,
      matched: false,
      status: 'SKIPPED',
      results: [],
    };
  }

  // 4. Resolve Credentials
  let accessToken: string | undefined;
  if (!isSimulation) {
    const account = await getConnectedAccount();
    accessToken = account?.accessToken;
  }

  // 5. Execute Configured Actions
  const actionResults: ActionExecutionResult[] = [];
  let allSucceeded = true;

  for (const action of matchedAutomation.actions) {
    const res = await executeAction(action, event, {
      isSimulation,
      accessToken,
      permalink: event.permalink,
    });

    actionResults.push(res);
    if (!res.success) {
      allSucceeded = false;
    }

    // 6. Audit & Activity Logging
    const status: EventStatus = res.success
      ? isSimulation
        ? 'SIMULATED_SENT'
        : 'SENT'
      : 'FAILED';

    await logAutomationEvent({
      automationId: matchedAutomation.id,
      automationName: matchedAutomation.name,
      instagramAccountId: event.instagramAccountId,
      instagramCommentId: event.commentId,
      commenterUsername: event.commenterUsername,
      commentText: event.commentText,
      actionType: action.actionType,
      responseContent: res.message,
      status,
      errorMessage: res.error,
    });
  }

  return {
    eventId: event.eventId,
    automationId: matchedAutomation.id,
    matched: true,
    status: allSucceeded
      ? isSimulation
        ? 'SIMULATED_SENT'
        : 'SENT'
      : 'FAILED',
    results: actionResults,
  };
}
