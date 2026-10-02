import { getConfig } from '../config';
import {
  claimPendingComments,
  getAutomations,
  getConnectedAccount,
  getMedia,
  logAutomationEvent,
  updateQueuedComment,
} from '../supabase/db';
import { matchComment } from '../automation/matcher';
import { interpolateVariables } from '../automation/variables';
import { sendInstagramDirectMessage } from '../instagram/messaging';
import { MetaApiError } from '../instagram/client';
import { QueuedComment, QueueProcessorOptions } from './types';

// Rate Limiter token bucket state for Instagram Outbound API
class OutboundRateLimiter {
  private lastRequestTime = 0;
  private pauseUntil = 0;

  async acquire(rateLimitPerSec: number): Promise<void> {
    const now = Date.now();
    
    // Respect backoff/pause from 429 or Retry-After
    if (this.pauseUntil > now) {
      const waitMs = this.pauseUntil - now;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }

    const minIntervalMs = 1000 / Math.max(1, rateLimitPerSec);
    const elapsed = Date.now() - this.lastRequestTime;
    if (elapsed < minIntervalMs) {
      const delay = minIntervalMs - elapsed;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    this.lastRequestTime = Date.now();
  }

  pause(seconds: number) {
    this.pauseUntil = Date.now() + Math.max(1, seconds) * 1000;
  }

  reset() {
    this.lastRequestTime = 0;
    this.pauseUntil = 0;
  }
}

const rateLimiter = new OutboundRateLimiter();

export function resetRateLimiter() {
  rateLimiter.reset();
}

/**
 * Processes a single claimed comment from the durable queue.
 */
export async function processSingleComment(
  comment: QueuedComment,
  options?: { maxRetries?: number; rateLimitPerSec?: number }
): Promise<{ status: 'COMPLETED' | 'FAILED' | 'RETRY' | 'SKIPPED'; error?: string }> {
  const config = getConfig();
  const maxRetries = options?.maxRetries ?? config.queue.maxRetries;
  const rateLimitPerSec = options?.rateLimitPerSec ?? config.queue.rateLimitPerSec;

  console.log(`[COMMENT_PROCESSED] Processing commentId=${comment.instagramCommentId} by @${comment.username || 'unknown'}: "${comment.commentText}"`);

  // Idempotency check: if already completed or sent, prevent duplicate DM
  if (comment.dmStatus === 'SENT' || comment.processingStatus === 'COMPLETED') {
    console.log(`[DUPLICATE_EVENT] Comment ${comment.instagramCommentId} is already completed/sent. Skipping.`);
    return { status: 'COMPLETED' };
  }

  // 1. Fetch automations and media to find matching rules
  const [allAutomations, mediaList] = await Promise.all([
    getAutomations(),
    getMedia(),
  ]);

  // Candidate media resolution
  const candidateMediaIds = new Set<string>();
  if (comment.mediaId) {
    candidateMediaIds.add(comment.mediaId);
    if (comment.mediaId.includes('_')) {
      candidateMediaIds.add(comment.mediaId.split('_')[0]);
    }
  }
  if (comment.instagramCommentId && comment.instagramCommentId.includes('_')) {
    candidateMediaIds.add(comment.instagramCommentId.split('_')[0]);
  }

  for (const m of mediaList) {
    if (
      (m.id && candidateMediaIds.has(m.id)) ||
      (m.instagramMediaId && candidateMediaIds.has(m.instagramMediaId))
    ) {
      if (m.id) candidateMediaIds.add(m.id);
      if (m.instagramMediaId) candidateMediaIds.add(m.instagramMediaId);
    }
  }

  const activeAutomations = allAutomations.filter((auto) => {
    if (auto.status !== 'ACTIVE') return false;
    if (!auto.mediaId) return true; // Global rule applies to all posts/reels
    return (
      candidateMediaIds.has(auto.mediaId) ||
      Boolean(auto.media?.instagramMediaId && candidateMediaIds.has(auto.media.instagramMediaId)) ||
      Boolean(auto.media?.id && candidateMediaIds.has(auto.media.id))
    );
  });

  if (activeAutomations.length === 0) {
    const skipReason = candidateMediaIds.size > 0
      ? `No active automation targeting media ID (${Array.from(candidateMediaIds).join(', ')})`
      : 'No active automation found for this comment';

    await updateQueuedComment(comment.id, {
      processingStatus: 'SKIPPED',
      dmStatus: 'SKIPPED',
      errorMessage: skipReason,
      processedAt: new Date().toISOString(),
    });

    await logAutomationEvent({
      instagramAccountId: comment.instagramAccountId,
      instagramCommentId: comment.instagramCommentId,
      commenterUsername: comment.username || 'unknown',
      commentText: comment.commentText,
      actionType: 'PRIVATE_MESSAGE',
      status: 'SKIPPED',
      errorMessage: skipReason,
    });

    return { status: 'SKIPPED', error: skipReason };
  }

  // 2. Evaluate Keywords (case-insensitive)
  let matchedAutomation = null;
  let matchedKeywordsList: string[] = [];

  for (const auto of activeAutomations) {
    const keywords = auto.triggers.map((t) => t.keyword);
    const result = matchComment(
      comment.commentText,
      keywords,
      auto.matchType,
      auto.matchMode
    );

    if (result.matched) {
      matchedAutomation = auto;
      matchedKeywordsList = result.matchedKeywords;
      break;
    }
  }

  if (!matchedAutomation) {
    const targetAuto = activeAutomations[0];
    const keywordsList = targetAuto.triggers.map((t) => `"${t.keyword}"`).join(', ');
    const skipReason = `Comment "${comment.commentText}" did not match keywords [${keywordsList}] for automation "${targetAuto.name}"`;

    await updateQueuedComment(comment.id, {
      processingStatus: 'SKIPPED',
      dmStatus: 'SKIPPED',
      errorMessage: skipReason,
      processedAt: new Date().toISOString(),
    });

    await logAutomationEvent({
      automationId: targetAuto.id,
      automationName: targetAuto.name,
      instagramAccountId: comment.instagramAccountId,
      instagramCommentId: comment.instagramCommentId,
      commenterUsername: comment.username || 'unknown',
      commentText: comment.commentText,
      actionType: 'PRIVATE_MESSAGE',
      status: 'SKIPPED',
      errorMessage: skipReason,
    });

    return { status: 'SKIPPED', error: skipReason };
  }

  const primaryKeyword = matchedKeywordsList.join(', ');
  console.log(`[KEYWORD_MATCHED] Automation "${matchedAutomation.name}" matched keywords: [${primaryKeyword}]`);

  // 3. Resolve Connected Account Credentials
  let account = await getConnectedAccount(comment.instagramAccountId);
  if (!account) {
    account = await getConnectedAccount();
  }

  const accessToken = account?.accessToken || config.instagramAccessToken;

  if (!accessToken && !config.mockInstagram) {
    const errorMsg = 'No Instagram access token available to send DM';
    console.error(`[DM_SEND_FAILED] ${errorMsg}`);
    await updateQueuedComment(comment.id, {
      processingStatus: 'FAILED',
      dmStatus: 'FAILED',
      matchedKeyword: primaryKeyword,
      errorMessage: errorMsg,
      processedAt: new Date().toISOString(),
    });
    return { status: 'FAILED', error: errorMsg };
  }

  // 4. Find DM Action message
  const dmAction = matchedAutomation.actions.find((a) => a.actionType === 'PRIVATE_MESSAGE') ||
    matchedAutomation.actions[0];

  if (!dmAction) {
    const skipReason = 'No response message configured for automation';
    await updateQueuedComment(comment.id, {
      processingStatus: 'SKIPPED',
      dmStatus: 'SKIPPED',
      matchedKeyword: primaryKeyword,
      errorMessage: skipReason,
      processedAt: new Date().toISOString(),
    });
    return { status: 'SKIPPED', error: skipReason };
  }

  let rawMessage = dmAction.message;
  if (rawMessage.includes('|||')) {
    const variations = rawMessage.split('|||').map((v) => v.trim()).filter(Boolean);
    if (variations.length > 0) {
      rawMessage = variations[Math.floor(Math.random() * variations.length)];
    }
  }

  const formattedMessage = interpolateVariables(rawMessage, {
    username: comment.username || 'there',
    comment: comment.commentText,
    post_url: matchedAutomation.media?.permalink || '',
  });

  // Self-DM guard
  if (
    account?.username &&
    comment.username &&
    comment.username.toLowerCase() === account.username.toLowerCase()
  ) {
    const selfMsg = 'Instagram API does not permit sending private DMs to your own account';
    console.warn(`[DM_SEND_SKIPPED] ${selfMsg}`);
    await updateQueuedComment(comment.id, {
      processingStatus: 'COMPLETED',
      dmStatus: 'SKIPPED',
      matchedKeyword: primaryKeyword,
      errorMessage: selfMsg,
      processedAt: new Date().toISOString(),
    });
    return { status: 'SKIPPED', error: selfMsg };
  }

  // 5. Send Instagram DM with Rate Limiting & Controlled Concurrency
  console.log(`[DM_SEND_STARTED] Sending DM for commentId=${comment.instagramCommentId} to @${comment.username || 'user'}`);

  try {
    // Acquire rate limit slot
    await rateLimiter.acquire(rateLimitPerSec);

    await sendInstagramDirectMessage(
      comment.instagramCommentId,
      null,
      formattedMessage,
      accessToken || 'mock_token',
      account?.id || comment.instagramAccountId
    );

    console.log(`[DM_SEND_SUCCESS] DM successfully dispatched to @${comment.username || 'user'}`);

    const now = new Date().toISOString();
    await updateQueuedComment(comment.id, {
      processingStatus: 'COMPLETED',
      dmStatus: 'SENT',
      matchedKeyword: primaryKeyword,
      errorMessage: null,
      processedAt: now,
    });

    await logAutomationEvent({
      automationId: matchedAutomation.id,
      automationName: matchedAutomation.name,
      instagramAccountId: comment.instagramAccountId,
      instagramCommentId: comment.instagramCommentId,
      commenterUsername: comment.username || 'unknown',
      commentText: comment.commentText,
      actionType: 'PRIVATE_MESSAGE',
      responseContent: formattedMessage,
      status: config.mockInstagram ? 'SIMULATED_SENT' : 'SENT',
    });

    return { status: 'COMPLETED' };
  } catch (err: any) {
    console.error(`[DM_SEND_FAILED] Error sending DM for comment ${comment.instagramCommentId}:`, err);

    const isMetaError = err instanceof MetaApiError;
    const isTransient = isMetaError ? err.isTransient : true;
    const retryAfter = isMetaError ? err.retryAfterSeconds : undefined;

    if (retryAfter) {
      console.warn(`[RATE_LIMITED] Meta API returned Retry-After ${retryAfter}s`);
      rateLimiter.pause(retryAfter);
    }

    const nextRetryCount = comment.retryCount + 1;

    // Retryable / Transient error handling
    if (isTransient && nextRetryCount <= maxRetries) {
      const backoffSec = retryAfter || Math.min(60, Math.pow(2, nextRetryCount));
      const nextRetryAt = new Date(Date.now() + backoffSec * 1000).toISOString();

      console.warn(
        `[RETRY_SCHEDULED] Comment ${comment.instagramCommentId} scheduled for retry ${nextRetryCount}/${maxRetries} in ${backoffSec}s (at ${nextRetryAt})`
      );

      await updateQueuedComment(comment.id, {
        processingStatus: 'PENDING',
        dmStatus: 'PENDING',
        retryCount: nextRetryCount,
        nextRetryAt,
        errorMessage: `Transient error (retry ${nextRetryCount}/${maxRetries}): ${err.message}`,
      });

      return { status: 'RETRY', error: err.message };
    }

    // Permanent failure or max retries exceeded
    const permanentReason = nextRetryCount > maxRetries
      ? `Max retries (${maxRetries}) exceeded: ${err.message}`
      : `Permanent Meta API error: ${err.message}`;

    await updateQueuedComment(comment.id, {
      processingStatus: 'FAILED',
      dmStatus: 'FAILED',
      matchedKeyword: primaryKeyword,
      errorMessage: permanentReason,
      processedAt: new Date().toISOString(),
    });

    await logAutomationEvent({
      automationId: matchedAutomation.id,
      automationName: matchedAutomation.name,
      instagramAccountId: comment.instagramAccountId,
      instagramCommentId: comment.instagramCommentId,
      commenterUsername: comment.username || 'unknown',
      commentText: comment.commentText,
      actionType: 'PRIVATE_MESSAGE',
      responseContent: formattedMessage,
      status: 'FAILED',
      errorMessage: permanentReason,
    });

    return { status: 'FAILED', error: permanentReason };
  }
}

/**
 * Drains a batch of pending comments using controlled concurrency.
 */
export async function processQueue(
  options?: QueueProcessorOptions
): Promise<{
  processed: number;
  completed: number;
  failed: number;
  retried: number;
  skipped: number;
}> {
  const config = getConfig();
  const batchSize = options?.batchSize ?? config.queue.batchSize;
  const concurrency = options?.concurrency ?? config.queue.concurrency;

  const claimed = await claimPendingComments(batchSize);
  if (claimed.length === 0) {
    return { processed: 0, completed: 0, failed: 0, retried: 0, skipped: 0 };
  }

  console.log(`[QUEUE_BATCH_CLAIMED] Claimed ${claimed.length} pending comments for processing (concurrency: ${concurrency})`);

  let completed = 0;
  let failed = 0;
  let retried = 0;
  let skipped = 0;

  // Run in chunks with controlled concurrency
  for (let i = 0; i < claimed.length; i += concurrency) {
    const chunk = claimed.slice(i, i + concurrency);
    const results = await Promise.all(
      chunk.map((item) =>
        processSingleComment(item, {
          maxRetries: options?.maxRetries,
          rateLimitPerSec: options?.rateLimitPerSec,
        })
      )
    );

    for (const res of results) {
      if (res.status === 'COMPLETED') completed++;
      else if (res.status === 'FAILED') failed++;
      else if (res.status === 'RETRY') retried++;
      else if (res.status === 'SKIPPED') skipped++;
    }
  }

  return {
    processed: claimed.length,
    completed,
    failed,
    retried,
    skipped,
  };
}
