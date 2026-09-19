import { supabaseAdmin } from './admin';
import { Automation, EventStatus, ActionType, MatchType, MatchMode } from '../automation/types';
import { encryptToken, decryptToken } from '../security/encryption';

// Check if real Supabase is configured
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return Boolean(url && !url.includes('mock') && !url.includes('your-project'));
}

// In-memory fallback state for zero-config local development and testing
interface LocalStore {
  processedEvents: Set<string>;
  accounts: any[];
  media: any[];
  automations: Automation[];
  events: any[];
}

export const DEFAULT_DEMO_MEDIA = [
  {
    id: 'media-reel-1',
    instagramAccountId: 'ig-demo-creator',
    instagramMediaId: '18029348123984711',
    mediaType: 'VIDEO',
    caption: '🚀 5 AI Tools that will 10x your productivity in 2026. Comment "TOOLS" and I will send you the complete list with direct links in your DM! 👇',
    thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    permalink: 'https://instagram.com/p/C3demoReel1',
    timestamp: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
    likeCount: 1420,
    commentsCount: 382,
  },
  {
    id: 'media-reel-2',
    instagramAccountId: 'ig-demo-creator',
    instagramMediaId: '18029348123984712',
    mediaType: 'VIDEO',
    caption: 'How I scaled from $0 to $10k/mo with zero ad spend 🔥 Drop "ROADMAP" below and I\'ll DM you the free 24-page step-by-step PDF!',
    thumbnailUrl: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=600&auto=format&fit=crop&q=80',
    permalink: 'https://instagram.com/p/C3demoReel2',
    timestamp: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
    likeCount: 2890,
    commentsCount: 745,
  },
  {
    id: 'media-post-3',
    instagramAccountId: 'ig-demo-creator',
    instagramMediaId: '18029348123984713',
    mediaType: 'CAROUSEL_ALBUM',
    caption: 'Complete Meta Graph API Cheatsheet for Developers 💻 Comment "CODE" to get the GitHub starter kit repo link!',
    thumbnailUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80',
    permalink: 'https://instagram.com/p/C3demoPost3',
    timestamp: new Date(Date.now() - 3600 * 1000 * 48).toISOString(),
    likeCount: 890,
    commentsCount: 156,
  },
  {
    id: 'media-reel-4',
    instagramAccountId: 'ig-demo-creator',
    instagramMediaId: '18029348123984714',
    mediaType: 'VIDEO',
    caption: 'The secret to automating 1,000+ Instagram DMs every day safely without getting banned ⚡ Comment "LINK" for full tutorial access!',
    thumbnailUrl: 'https://images.unsplash.com/photo-1618172193763-c511deb635ca?w=600&auto=format&fit=crop&q=80',
    permalink: 'https://instagram.com/p/C3demoReel4',
    timestamp: new Date(Date.now() - 3600 * 1000 * 72).toISOString(),
    likeCount: 3410,
    commentsCount: 912,
  },
  {
    id: 'media-post-5',
    instagramAccountId: 'ig-demo-creator',
    instagramMediaId: '18029348123984715',
    mediaType: 'IMAGE',
    caption: 'New Notion Creator Operating System is finally live! ✨ Comment "NOTION" to get the 50% launch discount link!',
    thumbnailUrl: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=600&auto=format&fit=crop&q=80',
    permalink: 'https://instagram.com/p/C3demoPost5',
    timestamp: new Date(Date.now() - 3600 * 1000 * 96).toISOString(),
    likeCount: 670,
    commentsCount: 88,
  },
  {
    id: 'media-reel-6',
    instagramAccountId: 'ig-demo-creator',
    instagramMediaId: '18029348123984716',
    mediaType: 'VIDEO',
    caption: 'Stop manually replying to "link please" in your comments! Set this up once and watch leads flow 24/7. Comment "FLOW" to test it right now! 🤖',
    thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    permalink: 'https://instagram.com/p/C3demoReel6',
    timestamp: new Date(Date.now() - 3600 * 1000 * 120).toISOString(),
    likeCount: 4120,
    commentsCount: 1240,
  },
];

const localStore: LocalStore = {
  processedEvents: new Set<string>(),
  accounts: [],
  media: [...DEFAULT_DEMO_MEDIA],
  automations: [],
  events: [],
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

/**
 * Fetches automations with their triggers and actions.
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
          triggers ( id, automation_id, keyword ),
          actions ( id, automation_id, action_type, message )
        `);

      if (accountId) {
        query = query.eq('instagram_account_id', accountId);
      }

      const { data, error } = await query;
      if (!error && data) {
        const dbAutos = data.map((a: any) => ({
          id: a.id,
          userId: a.user_id,
          instagramAccountId: a.instagram_account_id,
          mediaId: a.media_id,
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
  name: string;
  matchType: MatchType;
  matchMode: MatchMode;
  keywords: string[];
  publicReply?: string;
  privateMessage?: string;
}): Promise<Automation> {
  const id = `auto-${Date.now()}`;
  const now = new Date().toISOString();

  const triggers = payload.keywords.map((kw, i) => ({
    id: `trig-${Date.now()}-${i}`,
    automationId: id,
    keyword: kw.trim(),
  }));

  const actions = [];
  if (payload.publicReply && payload.publicReply.trim()) {
    actions.push({
      id: `act-${Date.now()}-pub`,
      automationId: id,
      actionType: 'PUBLIC_REPLY' as ActionType,
      message: payload.publicReply.trim(),
    });
  }
  if (payload.privateMessage && payload.privateMessage.trim()) {
    actions.push({
      id: `act-${Date.now()}-priv`,
      automationId: id,
      actionType: 'PRIVATE_MESSAGE' as ActionType,
      message: payload.privateMessage.trim(),
    });
  }

  const newAuto: Automation = {
    id,
    userId: payload.userId || 'user-default',
    instagramAccountId: payload.instagramAccountId,
    mediaId: payload.mediaId || null,
    name: payload.name,
    status: 'ACTIVE',
    matchType: payload.matchType,
    matchMode: payload.matchMode,
    triggers,
    actions,
    createdAt: now,
    updatedAt: now,
  };

  if (isSupabaseConfigured()) {
    try {
      const { data: autoRow, error: autoErr } = await supabaseAdmin
        .from('automations')
        .insert([
          {
            id,
            user_id: newAuto.userId && newAuto.userId !== 'user-default' ? newAuto.userId : null,
            instagram_account_id: newAuto.instagramAccountId,
            media_id: newAuto.mediaId,
            name: newAuto.name,
            status: newAuto.status,
            match_type: newAuto.matchType,
            match_mode: newAuto.matchMode,
          },
        ])
        .select()
        .single();

      if (autoErr) throw autoErr;

      if (triggers.length > 0) {
        await supabaseAdmin.from('triggers').insert(
          triggers.map((t) => ({
            id: t.id,
            automation_id: id,
            keyword: t.keyword,
          }))
        );
      }

      if (actions.length > 0) {
        await supabaseAdmin.from('actions').insert(
          actions.map((act) => ({
            id: act.id,
            automation_id: id,
            action_type: act.actionType,
            message: act.message,
          }))
        );
      }

      return newAuto;
    } catch (err) {
      console.error('Failed to create automation in Supabase:', err);
    }
  }

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
export async function getConnectedAccount(userId = 'user-default') {
  if (isSupabaseConfigured()) {
    try {
      // Query without user_id filter first (MVP single-user: user_id may be null)
      const { data, error } = await supabaseAdmin
        .from('instagram_accounts')
        .select('*')
        .eq('status', 'CONNECTED')
        .maybeSingle();

      if (!error && data) {
        let accessToken = '';
        try {
          accessToken = decryptToken(data.access_token_encrypted);
        } catch {
          // Graceful degradation: return plaintext if decryption fails (e.g. re-keyed)
          accessToken = data.access_token_encrypted || '';
        }
        return {
          id: data.id,
          userId: data.user_id,
          instagramUserId: data.instagram_user_id,
          username: data.username,
          profilePictureUrl: data.profile_picture_url,
          accountType: data.account_type,
          accessToken,
          status: data.status,
          createdAt: data.created_at,
        };
      }
    } catch (err) {
      console.error('Failed to fetch IG account from Supabase:', err);
    }
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

  return localStore.media && localStore.media.length > 0 ? localStore.media : DEFAULT_DEMO_MEDIA;
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
  const id = `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const item = {
    id,
    ...event,
    createdAt: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    try {
      await supabaseAdmin.from('automation_events').insert([
        {
          id,
          automation_id: event.automationId || null,
          instagram_account_id: event.instagramAccountId,
          instagram_comment_id: event.instagramCommentId,
          commenter_username: event.commenterUsername,
          comment_text: event.commentText,
          action_type: event.actionType,
          response_content: event.responseContent,
          status: event.status,
          error_message: event.errorMessage,
        },
      ]);
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
 * Computes dashboard statistics.
 */
export async function getDashboardStats() {
  const events = await getActivityLogs(1000);
  
  const commentsDetected = events.length;
  const matched = events.filter((e) => e.status === 'SENT' || e.status === 'SIMULATED_SENT').length;
  const messagesSent = events.filter(
    (e) => (e.status === 'SENT' || e.status === 'SIMULATED_SENT') && e.actionType === 'PRIVATE_MESSAGE'
  ).length;
  const failed = events.filter((e) => e.status === 'FAILED').length;

  return {
    commentsDetected: commentsDetected || 0,
    commentsMatched: matched || 0,
    messagesSent: messagesSent || 0,
    failed: failed || 0,
  };
}
