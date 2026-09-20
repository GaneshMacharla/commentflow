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
  force?: boolean;
  skipIdempotency?: boolean;
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

  // 1. Idempotency / Duplicate Check (bypassed for simulation, force, or test mode)
  if (!isSimulation && !options.skipIdempotency) {
    const isNewEvent = await checkAndSetIdempotency(event.eventId);
    if (!isNewEvent && !options.force) {
      return {
        eventId: event.eventId,
        matched: false,
        status: 'SKIPPED',
        results: [],
        error: 'Duplicate event: already processed',
      };
    }
  }

  // 2. Resolve Connected Account Credentials Early
  let accessToken: string | undefined;
  let accountUsername: string | undefined;
  let account = await getConnectedAccount(event.instagramAccountId);
  if (!account) {
    account = await getConnectedAccount();
  }
  if (account) {
    accessToken = account.accessToken;
    accountUsername = account.username;
  }

  // 3. Fetch Active Automations & Stored Media
  const [allAutomations, mediaList] = await Promise.all([
    getAutomations(),
    getMedia(),
  ]);

  // 4. Multi-Tier Media Candidate Resolution for Reels
  const candidateMediaIds = new Set<string>();

  if (event.mediaId) {
    candidateMediaIds.add(event.mediaId);
    if (event.mediaId.includes('_')) {
      candidateMediaIds.add(event.mediaId.split('_')[0]);
    }
  }

  // Handle Meta's composite comment IDs (e.g. {media_id}_{comment_id})
  if (event.commentId && event.commentId.includes('_')) {
    candidateMediaIds.add(event.commentId.split('_')[0]);
  }

  // Match against media items in database
  for (const m of mediaList) {
    if (
      (m.id && candidateMediaIds.has(m.id)) ||
      (m.instagramMediaId && candidateMediaIds.has(m.instagramMediaId))
    ) {
      if (m.id) candidateMediaIds.add(m.id);
      if (m.instagramMediaId) candidateMediaIds.add(m.instagramMediaId);
      if (m.permalink && !event.permalink) {
        event.permalink = m.permalink;
      }
    }
  }

  // If candidateMediaIds is still empty and commentId is present without underscore,
  // check if any active automation is linked to a media item
  const activeAutomations = allAutomations.filter(
    (auto: import('./types').Automation) => {
      if (auto.status !== 'ACTIVE') return false;
      // NULL mediaId means applies globally to ALL posts & Reels
      if (!auto.mediaId) return true;

      return (
        candidateMediaIds.has(auto.mediaId) ||
        Boolean(auto.media?.instagramMediaId && candidateMediaIds.has(auto.media.instagramMediaId)) ||
        Boolean(auto.media?.id && candidateMediaIds.has(auto.media.id))
      );
    }
  );

  // 5. Handle No Active Automations Matched
  if (activeAutomations.length === 0) {
    const skipReason = candidateMediaIds.size > 0
      ? `No active automation targeting media ID (${Array.from(candidateMediaIds).join(', ')})`
      : 'No active automation found for this comment';

    // Log the detected comment so Dashboard counters & Activity audit trail capture it
    await logAutomationEvent({
      instagramAccountId: event.instagramAccountId || account?.id || 'unknown',
      instagramCommentId: event.commentId,
      commenterUsername: event.commenterUsername,
      commentText: event.commentText,
      actionType: 'PUBLIC_REPLY',
      status: 'SKIPPED',
      errorMessage: skipReason,
    });

    return {
      eventId: event.eventId,
      matched: false,
      status: 'SKIPPED',
      results: [],
      error: skipReason,
    };
  }

  // 6. Evaluate Trigger Keywords across Matching Automations
  let matchedAutomation = null;
  let matchInfo = null;

  for (const auto of activeAutomations) {
    const keywords = auto.triggers.map((t: import('./types').Trigger) => t.keyword);
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

  // 7. Handle Comment Did Not Match Trigger Keywords
  if (!matchedAutomation) {
    const targetAuto = activeAutomations[0];
    const keywordsList = targetAuto.triggers.map((t) => `"${t.keyword}"`).join(', ');
    const skipReason = `Comment "${event.commentText}" did not match keywords [${keywordsList}] for automation "${targetAuto.name}"`;

    // Log skipped event to provide complete audit visibility
    await logAutomationEvent({
      automationId: targetAuto.id,
      automationName: targetAuto.name,
      instagramAccountId: event.instagramAccountId || account?.id || 'unknown',
      instagramCommentId: event.commentId,
      commenterUsername: event.commenterUsername,
      commentText: event.commentText,
      actionType: 'PUBLIC_REPLY',
      status: 'SKIPPED',
      errorMessage: skipReason,
    });

    return {
      eventId: event.eventId,
      matched: false,
      status: 'SKIPPED',
      results: [],
      error: skipReason,
    };
  }

  // 8. Execute Configured Actions
  const actionResults: ActionExecutionResult[] = [];
  let allSucceeded = true;

  for (const action of matchedAutomation.actions) {
    const res = await executeAction(action, event, {
      isSimulation,
      accessToken,
      permalink: event.permalink,
      accountUsername,
      instagramAccountId: event.instagramAccountId,
    });

    actionResults.push(res);
    if (!res.success) {
      allSucceeded = false;
    }

    // 9. Audit & Activity Logging
    const status: EventStatus = res.success
      ? isSimulation
        ? 'SIMULATED_SENT'
        : 'SENT'
      : 'FAILED';

    await logAutomationEvent({
      automationId: matchedAutomation.id,
      automationName: matchedAutomation.name,
      instagramAccountId: event.instagramAccountId || account?.id || 'unknown',
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
