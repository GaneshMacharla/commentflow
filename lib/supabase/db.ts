import crypto from 'crypto';
import { supabaseAdmin } from './admin';
import { Automation, EventStatus, ActionType, MatchType, MatchMode } from '../automation/types';
import { encryptToken, decryptToken } from '../security/encryption';

// Check if real Supabase is configured
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return Boolean(url && !url.includes('mock') && !url.includes('your-project'));
}

import { QueuedComment, EnqueueCommentInput } from '../queue/types';

// In-memory fallback state for zero-config local development and testing
interface LocalStore {
  processedEvents: Set<string>;
  accounts: any[];
  media: any[];
  automations: Automation[];
  events: any[];
  queuedComments: QueuedComment[];
}

const localStore: LocalStore = {
  processedEvents: new Set<string>(),
  accounts: [],
  media: [],
  automations: [],
  events: [],
  queuedComments: [],
};

/**
 * Idempotency Check: Checks if event_id has already been processed.
 * Inserts if not found. Returns TRUE if brand new event, FALSE if duplicate.
 */
export async function checkAndSetIdempotency(eventId: string, source = 'instagram_webhook'): Promise<boolean> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabaseAdmin
        .from('processed_events')
        .insert([{ event_id: eventId, source }])
        .select();

      if (error) {
        // Unique violation code 23505 in PostgreSQL
        if (error.code === '23505') {
          return false;
        }
        console.error('Supabase idempotency insert error:', error);
      }
      return Boolean(data && data.length > 0);
    } catch (err) {
      console.error('Failed to check idempotency in Supabase:', err);
    }
  }

  // Local fallback
  if (localStore.processedEvents.has(eventId)) {
    return false;
  }
  localStore.processedEvents.add(eventId);
  return true;
}

function isValidUuid(val?: string | null): boolean {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);
}

async function resolveUserId(preferredUserId?: string): Promise<string> {
  if (preferredUserId && isValidUuid(preferredUserId)) {
    return preferredUserId;
  }
  if (isSupabaseConfigured()) {
    try {
      const { data: profs } = await supabaseAdmin.from('profiles').select('id').limit(1);
      if (profs && profs.length > 0 && profs[0].id) {
        return profs[0].id;
      }
      // Create admin profile if none exists
      const { data: newUser } = await supabaseAdmin.auth.admin.createUser({
        email: 'admin@commentflow.local',
        email_confirm: true,
        user_metadata: { full_name: 'CommentFlow Admin' },
      });
      if (newUser?.user?.id) {
        return newUser.user.id;
      }
    } catch (e) {
      console.warn('Could not query/create profile for user_id:', e);
    }
  }
  return crypto.randomUUID();
}

async function resolveAccountId(preferredAccountId?: string): Promise<string> {
  if (isSupabaseConfigured()) {
    try {
      // 1. If preferred is a valid UUID, check if it already exists
      if (preferredAccountId && isValidUuid(preferredAccountId)) {
        const { data: existing } = await supabaseAdmin
          .from('instagram_accounts')
          .select('id')
          .eq('id', preferredAccountId)
          .maybeSingle();
        if (existing?.id) return existing.id;
      }

      // 2. Check if ANY account exists
      const { data: accounts } = await supabaseAdmin
        .from('instagram_accounts')
        .select('id')
        .limit(1);
      if (accounts && accounts.length > 0 && accounts[0].id) {
        return accounts[0].id;
      }

      // 3. In a fresh DB, create a default connected account row so FK constraints never fail
      const newAccountId = preferredAccountId && isValidUuid(preferredAccountId) ? preferredAccountId : crypto.randomUUID();
      const { data: created } = await supabaseAdmin
        .from('instagram_accounts')
        .insert([
          {
            id: newAccountId,
            user_id: null,
            instagram_user_id: process.env.INSTAGRAM_ACCOUNT_ID || 'primary_account',
            username: process.env.INSTAGRAM_USERNAME || 'instagram_creator',
            access_token_encrypted: 'mock_encrypted_token',
            status: 'CONNECTED',
          },
        ])
        .select('id')
        .maybeSingle();

      if (created?.id) return created.id;
      return newAccountId;
    } catch (e) {
      console.warn('Could not query/create account for account_id:', e);
    }
  }
  return preferredAccountId && isValidUuid(preferredAccountId) ? preferredAccountId : crypto.randomUUID();
}

async function resolveMediaId(
  accountId: string,
  mediaId: string | null,
  extra?: {
    caption?: string;
    thumbnailUrl?: string;
    permalink?: string;
    mediaType?: string;
  }
): Promise<string | null> {
  if (!mediaId) return null;
  if (!isSupabaseConfigured()) return mediaId;

  try {
    // 1. If it is already a valid UUID existing in public.media
    if (isValidUuid(mediaId)) {
      const { data: m } = await supabaseAdmin
        .from('media')
        .select('id')
        .eq('id', mediaId)
        .maybeSingle();
      if (m?.id) return m.id;
    }

    // 2. Check by instagram_media_id
    const { data: m } = await supabaseAdmin
      .from('media')
      .select('id')
      .eq('instagram_media_id', mediaId)
      .maybeSingle();
    if (m?.id) return m.id;

    // 3. Upsert row into public.media so foreign key works
    const { data: inserted } = await supabaseAdmin
      .from('media')
      .upsert(
        {
          instagram_account_id: accountId,
          instagram_media_id: mediaId,
          media_type: extra?.mediaType || 'REEL',
          caption: extra?.caption || '',
          thumbnail_url: extra?.thumbnailUrl || '',
          permalink: extra?.permalink || '',
          timestamp: new Date().toISOString(),
        },
        { onConflict: 'instagram_media_id' }
      )
      .select('id')
      .single();

    if (inserted?.id) return inserted.id;
  } catch (err) {
    console.error('Failed to resolve media ID in Supabase:', err);
  }

  return null;
}

/**
 * Fetches automations with their triggers, actions, and media.
 */
export async function getAutomations(accountId?: string): Promise<Automation[]> {
  if (isSupabaseConfigured()) {
    try {
      let query = supabaseAdmin
        .from('automations')
        .select(`
          id,
          user_id,
          instagram_account_id,
          media_id,
          name,
          status,
          match_type,
          match_mode,
          error_reason,
          created_at,
          updated_at,
          media:media_id ( id, instagram_media_id, caption, thumbnail_url, media_type, permalink ),
          triggers ( id, automation_id, keyword ),
          actions ( id, automation_id, action_type, message )
        `)
        .order('created_at', { ascending: false });

      if (accountId) {
        query = query.eq('instagram_account_id', accountId);
      }

      const { data, error } = await query;
      if (!error && data) {
        const dbAutos = data.map((a: any) => ({
          id: a.id,
          userId: a.user_id,
          instagramAccountId: a.instagram_account_id,
          mediaId: a.media?.instagram_media_id || a.media_id || null,
          media: a.media
            ? {
                id: a.media.id,
                instagramMediaId: a.media.instagram_media_id,
                caption: a.media.caption,
                thumbnailUrl: a.media.thumbnail_url,
                mediaType: a.media.media_type,
                permalink: a.media.permalink,
              }
            : null,
          name: a.name,
          status: a.status,
          matchType: a.match_type,
          matchMode: a.match_mode,
          errorReason: a.error_reason,
          triggers: (a.triggers || []).map((t: any) => ({
            id: t.id,
            automationId: t.automation_id,
            keyword: t.keyword,
          })),
          actions: (a.actions || []).map((act: any) => ({
            id: act.id,
            automationId: act.automation_id,
            actionType: act.action_type,
            message: act.message,
          })),
          createdAt: a.created_at,
          updatedAt: a.updated_at,
        }));

        const dbIds = new Set(dbAutos.map((a: any) => a.id));
        const locals = localStore.automations.filter((a) => !dbIds.has(a.id));
        const combined = [...dbAutos, ...locals];
        if (accountId) {
          return combined.filter((a) => a.instagramAccountId === accountId);
        }
        return combined;
      }
    } catch (err) {
      console.error('Supabase fetch automations error:', err);
    }
  }

  // Local fallback
  if (accountId) {
    return localStore.automations.filter((a) => a.instagramAccountId === accountId);
  }
  return localStore.automations;
}

/**
 * Gets a single automation by ID.
 */
export async function getAutomationById(id: string): Promise<Automation | null> {
  const all = await getAutomations();
  return all.find((a) => a.id === id) || null;
}

/**
 * Creates a new automation with its triggers and actions.
 */
export async function createAutomation(payload: {
  userId?: string;
  instagramAccountId: string;
  mediaId: string | null;
  mediaCaption?: string;
  mediaThumbnailUrl?: string;
  mediaType?: string;
  permalink?: string;
  name: string;
  matchType: MatchType;
  matchMode: MatchMode;
  keywords: string[];
  publicReply?: string;
  privateMessage?: string;
}): Promise<Automation> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const triggers = payload.keywords.map((kw) => ({
    id: crypto.randomUUID(),
    automationId: id,
    keyword: kw.trim(),
  }));

  const actions = [];
  if (payload.publicReply && payload.publicReply.trim()) {
    actions.push({
      id: crypto.randomUUID(),
      automationId: id,
      actionType: 'PUBLIC_REPLY' as ActionType,
      message: payload.publicReply.trim(),
    });
  }
  if (payload.privateMessage && payload.privateMessage.trim()) {
    actions.push({
      id: crypto.randomUUID(),
      automationId: id,
      actionType: 'PRIVATE_MESSAGE' as ActionType,
      message: payload.privateMessage.trim(),
    });
  }

  let dbMediaId: string | null = null;
  let targetUserId = payload.userId || 'user-default';
  let targetAccountId = payload.instagramAccountId;

  if (isSupabaseConfigured()) {
    targetUserId = await resolveUserId(payload.userId);
    targetAccountId = await resolveAccountId(payload.instagramAccountId);
    dbMediaId = await resolveMediaId(targetAccountId, payload.mediaId, {
      caption: payload.mediaCaption,
      thumbnailUrl: payload.mediaThumbnailUrl,
      mediaType: payload.mediaType,
      permalink: payload.permalink,
    });

    const { error: autoErr } = await supabaseAdmin
      .from('automations')
      .insert([
        {
          id,
          user_id: targetUserId,
          instagram_account_id: targetAccountId,
          media_id: dbMediaId,
          name: payload.name,
          status: 'ACTIVE',
          match_type: payload.matchType,
          match_mode: payload.matchMode,
        },
      ])
      .select()
      .single();

    if (autoErr) {
      console.error('Supabase auto insert error:', autoErr);
      throw new Error(`Failed to save automation: ${autoErr.message}`);
    }

    if (triggers.length > 0) {
      const { error: trigErr } = await supabaseAdmin.from('triggers').insert(
        triggers.map((t) => ({
          id: t.id,
          automation_id: id,
          keyword: t.keyword,
        }))
      );
      if (trigErr) {
        console.error('Supabase triggers insert error:', trigErr);
        throw new Error(`Failed to save triggers: ${trigErr.message}`);
      }
    }

    if (actions.length > 0) {
      const { error: actErr } = await supabaseAdmin.from('actions').insert(
        actions.map((act) => ({
          id: act.id,
          automation_id: id,
          action_type: act.actionType,
          message: act.message,
        }))
      );
      if (actErr) {
        console.error('Supabase actions insert error:', actErr);
        throw new Error(`Failed to save actions: ${actErr.message}`);
      }
    }
  }

  const newAuto: Automation = {
    id,
    userId: targetUserId,
    instagramAccountId: payload.instagramAccountId,
    mediaId: payload.mediaId || null,
    media: payload.mediaThumbnailUrl || payload.mediaCaption ? {
      id: dbMediaId || id,
      instagramMediaId: payload.mediaId || undefined,
      caption: payload.mediaCaption,
      thumbnailUrl: payload.mediaThumbnailUrl,
      mediaType: payload.mediaType,
      permalink: payload.permalink,
    } : null,
    name: payload.name,
    status: 'ACTIVE',
    matchType: payload.matchType,
    matchMode: payload.matchMode,
    triggers,
    actions,
    createdAt: now,
    updatedAt: now,
  };

  localStore.automations.unshift(newAuto);
  return newAuto;
}

/**
 * Updates an automation's status or details.
 */
export async function updateAutomation(
  id: string,
  patch: Partial<Automation>
): Promise<Automation | null> {
  if (isSupabaseConfigured()) {
    try {
      const updatePayload: any = { updated_at: new Date().toISOString() };
      if (patch.name !== undefined) updatePayload.name = patch.name;
      if (patch.status !== undefined) updatePayload.status = patch.status;
      if (patch.matchType !== undefined) updatePayload.match_type = patch.matchType;
      if (patch.matchMode !== undefined) updatePayload.match_mode = patch.matchMode;
      if (patch.errorReason !== undefined) updatePayload.error_reason = patch.errorReason;

      await supabaseAdmin.from('automations').update(updatePayload).eq('id', id);
    } catch (err) {
      console.error('Failed to update automation in Supabase:', err);
    }
  }

  const idx = localStore.automations.findIndex((a) => a.id === id);
  if (idx !== -1) {
    localStore.automations[idx] = {
      ...localStore.automations[idx],
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    return localStore.automations[idx];
  }
  return null;
}

/**
 * Deletes an automation.
 */
export async function deleteAutomation(id: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    try {
      await supabaseAdmin.from('automations').delete().eq('id', id);
    } catch (err) {
      console.error('Failed to delete automation in Supabase:', err);
    }
  }

  const beforeLen = localStore.automations.length;
  localStore.automations = localStore.automations.filter((a) => a.id !== id);
  return localStore.automations.length < beforeLen;
}

/**
 * Retrieves the connected Instagram account.
 */
export async function getConnectedAccount(identifier?: string) {
  if (isSupabaseConfigured()) {
    try {
      let query = supabaseAdmin
        .from('instagram_accounts')
        .select('*')
        .eq('status', 'CONNECTED');

      if (identifier && identifier !== 'user-default') {
        if (isValidUuid(identifier)) {
          query = query.eq('id', identifier);
        } else {
          query = query.eq('instagram_user_id', identifier);
        }
      }

      const { data, error } = await query
        .order('updated_at', { ascending: false })
        .limit(1);

      const accountRow = data?.[0];
      if (!error && accountRow) {
        let accessToken = '';
        try {
          accessToken = decryptToken(accountRow.access_token_encrypted);
        } catch {
          // Graceful degradation: return plaintext if decryption fails (e.g. re-keyed)
          accessToken = accountRow.access_token_encrypted || '';
        }
        return {
          id: accountRow.id,
          userId: accountRow.user_id,
          instagramUserId: accountRow.instagram_user_id,
          username: accountRow.username,
          profilePictureUrl: accountRow.profile_picture_url,
          accountType: accountRow.account_type,
          accessToken,
          status: accountRow.status,
          createdAt: accountRow.created_at,
        };
      }
    } catch (err) {
      console.error('Failed to fetch IG account from Supabase:', err);
    }
  }

  // Support single Instagram Professional account configured directly via environment variables
  const envToken = process.env.INSTAGRAM_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN;
  const envAccountId = process.env.INSTAGRAM_ACCOUNT_ID || process.env.META_ACCOUNT_ID;
  const isCustomEnv = Boolean(envToken && !envToken.startsWith('your_') && !envToken.includes('placeholder'));
  if (isCustomEnv && (!identifier || identifier === envAccountId || identifier === 'user-default')) {
    return {
      id: envAccountId || 'ig-env-primary',
      userId: 'user-default',
      instagramUserId: envAccountId || 'primary',
      username: process.env.INSTAGRAM_USERNAME || 'instagram_creator',
      profilePictureUrl: '',
      accountType: 'CREATOR',
      accessToken: envToken,
      status: 'CONNECTED',
      createdAt: new Date().toISOString(),
    };
  }

  const acc = localStore.accounts[0];
  if (!acc) return null;
  let accessToken = '';
  try {
    accessToken = decryptToken(acc.accessTokenEncrypted || '');
  } catch {
    accessToken = acc.accessToken || acc.accessTokenEncrypted || '';
  }
  return { ...acc, accessToken };
}

/**
 * Saves a newly connected Instagram account to local in-memory store.
 * Used by the OAuth callback when Supabase is not configured.
 */
export function saveConnectedAccountLocally(account: {
  id: string;
  instagramUserId: string;
  username: string;
  profilePictureUrl?: string;
  accountType?: string;
  accessTokenEncrypted: string;
  accessToken: string;
}) {
  // Replace any existing account (single-user MVP)
  localStore.accounts = [{
    id: account.id,
    userId: 'user-default',
    instagramUserId: account.instagramUserId,
    username: account.username,
    profilePictureUrl: account.profilePictureUrl || '',
    accountType: account.accountType || 'CREATOR',
    accessTokenEncrypted: account.accessTokenEncrypted,
    accessToken: account.accessToken,
    status: 'CONNECTED',
    createdAt: new Date().toISOString(),
  }];
}

/**
 * Clears the local in-memory account store on disconnect.
 */
export function clearConnectedAccountLocally() {
  localStore.accounts = [];
}

/**
 * Saves or updates media items in Supabase.
 */
export async function saveMedia(accountId: string, mediaItems: any[]) {
  if (!mediaItems || mediaItems.length === 0) return;
  if (isSupabaseConfigured()) {
    try {
      const rows = mediaItems.map((item) => ({
        instagram_account_id: accountId,
        instagram_media_id: item.id || item.instagramMediaId,
        media_type:
          item.media_product_type === 'REELS' ||
          item.media_type === 'VIDEO' ||
          item.mediaType === 'REEL'
            ? 'REEL'
            : item.media_type || item.mediaType || 'IMAGE',
        caption: item.caption || '',
        thumbnail_url:
          item.thumbnail_url || item.thumbnailUrl || item.media_url || item.mediaUrl || '',
        permalink: item.permalink || '',
        timestamp: item.timestamp || new Date().toISOString(),
        like_count: item.like_count ?? item.likeCount ?? 0,
        comments_count: item.comments_count ?? item.commentsCount ?? 0,
      }));
      await supabaseAdmin.from('media').upsert(rows, { onConflict: 'instagram_media_id' });
    } catch (err) {
      console.error('Failed to save media to Supabase:', err);
    }
  }
}

/**
 * Retrieves media for an Instagram account.
 */
export async function getMedia(accountId?: string) {
  if (isSupabaseConfigured()) {
    try {
      let query = supabaseAdmin.from('media').select('*').order('timestamp', { ascending: false });
      if (accountId) {
        query = query.eq('instagram_account_id', accountId);
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data.map((m: any) => ({
          id: m.id,
          instagramAccountId: m.instagram_account_id,
          instagramMediaId: m.instagram_media_id,
          mediaType: m.media_type,
          caption: m.caption,
          thumbnailUrl: m.thumbnail_url,
          permalink: m.permalink,
          timestamp: m.timestamp,
          likeCount: m.like_count,
          commentsCount: m.comments_count,
        }));
      }
    } catch (err) {
      console.error('Failed to fetch media from Supabase:', err);
    }
  }

  return localStore.media || [];
}

/**
 * Logs an automation event.
 */
export async function logAutomationEvent(event: {
  automationId?: string;
  automationName?: string;
  instagramAccountId: string;
  instagramCommentId: string;
  commenterUsername: string;
  commentText: string;
  actionType: ActionType;
  responseContent?: string;
  status: EventStatus;
  errorMessage?: string;
}) {
  const id = crypto.randomUUID();
  const item = {
    id,
    ...event,
    createdAt: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    try {
      let dbAccountId: string | null = null;
      if (isValidUuid(event.instagramAccountId)) {
        dbAccountId = event.instagramAccountId;
      } else {
        // Look up by instagram_user_id
        const { data: acc } = await supabaseAdmin
          .from('instagram_accounts')
          .select('id')
          .eq('instagram_user_id', event.instagramAccountId)
          .maybeSingle();

        if (acc?.id) {
          dbAccountId = acc.id;
        } else {
          // Fallback to primary connected account
          const { data: primary } = await supabaseAdmin
            .from('instagram_accounts')
            .select('id')
            .limit(1)
            .maybeSingle();
          dbAccountId = primary?.id || null;
        }
      }

      if (dbAccountId) {
        const dbAutoId =
          event.automationId && isValidUuid(event.automationId)
            ? event.automationId
            : null;

        const { error: insErr } = await supabaseAdmin.from('automation_events').insert([
          {
            id,
            automation_id: dbAutoId,
            instagram_account_id: dbAccountId,
            instagram_comment_id: event.instagramCommentId,
            commenter_username: event.commenterUsername,
            comment_text: event.commentText,
            action_type: event.actionType,
            response_content: event.responseContent,
            status: event.status,
            error_message: event.errorMessage,
          },
        ]);

        if (insErr) {
          console.error('Supabase automation_events insert error:', insErr);
        }
      }
    } catch (err) {
      console.error('Failed to log event in Supabase:', err);
    }
  }

  localStore.events.unshift(item);
  return item;
}

/**
 * Retrieves activity logs.
 */
export async function getActivityLogs(limit = 50, status?: string) {
  if (isSupabaseConfigured()) {
    try {
      let query = supabaseAdmin
        .from('automation_events')
        .select(`
          id,
          automation_id,
          instagram_account_id,
          instagram_comment_id,
          commenter_username,
          comment_text,
          action_type,
          response_content,
          status,
          error_message,
          created_at,
          automations ( name )
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (status && status !== 'ALL') {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (!error && data) {
        return data.map((d: any) => ({
          id: d.id,
          automationId: d.automation_id,
          automationName: d.automations?.name || 'Automation',
          instagramAccountId: d.instagram_account_id,
          instagramCommentId: d.instagram_comment_id,
          commenterUsername: d.commenter_username,
          commentText: d.comment_text,
          actionType: d.action_type,
          responseContent: d.response_content,
          status: d.status,
          errorMessage: d.error_message,
          createdAt: d.created_at,
        }));
      }
    } catch (err) {
      console.error('Failed to fetch activity logs from Supabase:', err);
    }
  }

  let list = localStore.events;
  if (status && status !== 'ALL') {
    list = list.filter((e) => e.status === status);
  }
  return list.slice(0, limit);
}

/**
 * Computes dashboard statistics including durable queue metrics.
 */
export async function getDashboardStats() {
  const events = await getActivityLogs(1000);
  const queueItems = await getQueuedComments(1000);
  
  const commentsDetected = Math.max(events.length, queueItems.length);
  const matched = Math.max(
    events.filter((e) => e.status === 'SENT' || e.status === 'SIMULATED_SENT').length,
    queueItems.filter((q) => q.matchedKeyword !== null && q.matchedKeyword !== undefined).length
  );
  const messagesSent = Math.max(
    events.filter(
      (e) => (e.status === 'SENT' || e.status === 'SIMULATED_SENT') && e.actionType === 'PRIVATE_MESSAGE'
    ).length,
    queueItems.filter((q) => q.dmStatus === 'SENT').length
  );
  const failed = Math.max(
    events.filter((e) => e.status === 'FAILED').length,
    queueItems.filter((q) => q.processingStatus === 'FAILED' || q.dmStatus === 'FAILED').length
  );
  const pending = queueItems.filter((q) => q.processingStatus === 'PENDING').length;
  const processing = queueItems.filter((q) => q.processingStatus === 'PROCESSING').length;

  return {
    commentsDetected: commentsDetected || 0,
    commentsMatched: matched || 0,
    messagesSent: messagesSent || 0,
    failed: failed || 0,
    pending: pending || 0,
    processing: processing || 0,
  };
}

/**
 * Enqueues an Instagram comment into the durable queue (instagram_comments table).
 * Deduplicates automatically via UNIQUE(instagram_comment_id).
 */
export async function enqueueInstagramComment(
  input: EnqueueCommentInput
): Promise<{ success: boolean; duplicate: boolean; comment: QueuedComment }> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const newComment: QueuedComment = {
    id,
    instagramCommentId: input.commentId,
    instagramAccountId: input.instagramAccountId,
    commentText: input.commentText,
    username: input.username || null,
    mediaId: input.mediaId || null,
    matchedKeyword: null,
    processingStatus: 'PENDING',
    dmStatus: 'PENDING',
    retryCount: 0,
    nextRetryAt: now,
    errorMessage: null,
    createdAt: now,
    processingStartedAt: null,
    processedAt: null,
  };

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabaseAdmin
        .from('instagram_comments')
        .insert([
          {
            id: newComment.id,
            instagram_comment_id: newComment.instagramCommentId,
            instagram_account_id: newComment.instagramAccountId,
            comment_text: newComment.commentText,
            username: newComment.username,
            media_id: newComment.mediaId,
            processing_status: 'PENDING',
            dm_status: 'PENDING',
            retry_count: 0,
            next_retry_at: now,
          },
        ])
        .select()
        .single();

      if (error) {
        // Code 23505 is PostgreSQL unique constraint violation
        if (error.code === '23505') {
          const { data: existing } = await supabaseAdmin
            .from('instagram_comments')
            .select('*')
            .eq('instagram_comment_id', input.commentId)
            .maybeSingle();

          return {
            success: false,
            duplicate: true,
            comment: existing ? mapRowToQueuedComment(existing) : newComment,
          };
        }
        console.error('Supabase queue insert error:', error);
      } else if (data) {
        return { success: true, duplicate: false, comment: mapRowToQueuedComment(data) };
      }
    } catch (err) {
      console.error('Failed to insert comment into Supabase durable queue:', err);
    }
  }

  // Local fallback for dev/testing
  const existingLocal = localStore.queuedComments.find(
    (c) => c.instagramCommentId === input.commentId
  );
  if (existingLocal) {
    return { success: false, duplicate: true, comment: existingLocal };
  }

  localStore.queuedComments.push(newComment);
  return { success: true, duplicate: false, comment: newComment };
}

/**
 * Claims pending comments atomically using SKIP LOCKED in Supabase or atomic array splicing in localStore.
 */
export async function claimPendingComments(batchSize: number = 25): Promise<QueuedComment[]> {
  const now = new Date().toISOString();

  if (isSupabaseConfigured()) {
    try {
      // 1. Attempt PostgreSQL stored procedure with FOR UPDATE SKIP LOCKED
      const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc(
        'claim_pending_instagram_comments',
        { batch_size: batchSize }
      );

      if (!rpcError && rpcData && Array.isArray(rpcData)) {
        return rpcData.map(mapRowToQueuedComment);
      }

      // 2. Fallback query if RPC has not been executed yet
      const { data: pendingRows } = await supabaseAdmin
        .from('instagram_comments')
        .select('*')
        .eq('processing_status', 'PENDING')
        .lte('next_retry_at', now)
        .order('created_at', { ascending: true })
        .limit(batchSize);

      if (pendingRows && pendingRows.length > 0) {
        const ids = pendingRows.map((r: any) => r.id);
        const { data: claimedRows } = await supabaseAdmin
          .from('instagram_comments')
          .update({
            processing_status: 'PROCESSING',
            processing_started_at: now,
          })
          .in('id', ids)
          .eq('processing_status', 'PENDING')
          .select();

        if (claimedRows && claimedRows.length > 0) {
          return claimedRows.map(mapRowToQueuedComment);
        }
      }
    } catch (err) {
      console.error('Failed to claim pending comments from Supabase:', err);
    }
  }

  // Local fallback (also handles case when remote table is not yet migrated)
  const nowDate = new Date();
  const eligible = localStore.queuedComments.filter(
    (c) =>
      c.processingStatus === 'PENDING' &&
      (!c.nextRetryAt || new Date(c.nextRetryAt) <= nowDate)
  ).slice(0, batchSize);

  for (const c of eligible) {
    c.processingStatus = 'PROCESSING';
    c.processingStartedAt = now;
  }

  return [...eligible];
}

/**
 * Updates status, error message, and metadata for a queued comment.
 */
export async function updateQueuedComment(
  id: string,
  patch: Partial<QueuedComment>
): Promise<QueuedComment | null> {
  const now = new Date().toISOString();

  if (isSupabaseConfigured()) {
    try {
      const dbPatch: any = {};
      if (patch.processingStatus !== undefined) dbPatch.processing_status = patch.processingStatus;
      if (patch.dmStatus !== undefined) dbPatch.dm_status = patch.dmStatus;
      if (patch.matchedKeyword !== undefined) dbPatch.matched_keyword = patch.matchedKeyword;
      if (patch.retryCount !== undefined) dbPatch.retry_count = patch.retryCount;
      if (patch.nextRetryAt !== undefined) dbPatch.next_retry_at = patch.nextRetryAt;
      if (patch.errorMessage !== undefined) dbPatch.error_message = patch.errorMessage;
      if (patch.processingStartedAt !== undefined) dbPatch.processing_started_at = patch.processingStartedAt;
      if (patch.processedAt !== undefined) dbPatch.processed_at = patch.processedAt;

      const { data, error } = await supabaseAdmin
        .from('instagram_comments')
        .update(dbPatch)
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        return mapRowToQueuedComment(data);
      }
    } catch (err) {
      console.error('Failed to update queued comment in Supabase:', err);
    }
  }

  const idx = localStore.queuedComments.findIndex((c) => c.id === id);
  if (idx !== -1) {
    localStore.queuedComments[idx] = {
      ...localStore.queuedComments[idx],
      ...patch,
    };
    return localStore.queuedComments[idx];
  }

  return null;
}

/**
 * Finds a queued comment by its Instagram comment ID.
 */
export async function getQueuedCommentByCommentId(
  commentId: string
): Promise<QueuedComment | null> {
  if (isSupabaseConfigured()) {
    try {
      const { data } = await supabaseAdmin
        .from('instagram_comments')
        .select('*')
        .eq('instagram_comment_id', commentId)
        .maybeSingle();

      if (data) return mapRowToQueuedComment(data);
    } catch (err) {
      console.error('Failed to query comment by comment ID:', err);
    }
  }

  return localStore.queuedComments.find((c) => c.instagramCommentId === commentId) || null;
}

/**
 * Retrieves queued comments for inspection and dashboard display.
 */
export async function getQueuedComments(
  limit = 50,
  status?: string
): Promise<QueuedComment[]> {
  if (isSupabaseConfigured()) {
    try {
      let query = supabaseAdmin
        .from('instagram_comments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (status && status !== 'ALL') {
        query = query.eq('processing_status', status);
      }

      const { data, error } = await query;
      if (!error && data) {
        return data.map(mapRowToQueuedComment);
      }
    } catch (err) {
      console.error('Failed to fetch queued comments from Supabase:', err);
    }
  }

  let list = localStore.queuedComments;
  if (status && status !== 'ALL') {
    list = list.filter((c) => c.processingStatus === status);
  }
  return list.slice(0, limit);
}

/**
 * Clears the in-memory queue store (useful in tests).
 */
export function clearQueueLocally() {
  localStore.queuedComments = [];
  localStore.processedEvents.clear();
}

function mapRowToQueuedComment(row: any): QueuedComment {
  return {
    id: row.id,
    instagramCommentId: row.instagram_comment_id,
    instagramAccountId: row.instagram_account_id,
    commentText: row.comment_text,
    username: row.username,
    mediaId: row.media_id,
    matchedKeyword: row.matched_keyword,
    processingStatus: row.processing_status,
    dmStatus: row.dm_status,
    retryCount: row.retry_count ?? 0,
    nextRetryAt: row.next_retry_at,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    processingStartedAt: row.processing_started_at,
    processedAt: row.processed_at,
  };
}
