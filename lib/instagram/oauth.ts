import { graphApiFetch } from './client';
import { InstagramAccountInfo, MetaTokenResponse } from './types';

const INSTAGRAM_OAUTH_URL = 'https://www.instagram.com/oauth/authorize';

// Official permissions for Instagram Business Login (exact ReplyKaro scopes)
// 1. View profile and access media (required): instagram_business_basic
// 2. Access and manage comments: instagram_business_manage_comments
// 3. Access and manage messages: instagram_business_manage_messages
const INSTAGRAM_SCOPES = [
  'instagram_business_basic',
  'instagram_business_manage_messages',
  'instagram_business_manage_comments',
].join(',');

/**
 * Builds the pure Instagram Business Login OAuth consent URL (ReplyKaro flow).
 */
export function getInstagramOAuthUrl(state: string, redirectUri: string): string {
  const appId =
    process.env.INSTAGRAM_APP_ID ||
    process.env.META_APP_ID ||
    '1785118029469438';

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: INSTAGRAM_SCOPES,
    state,
  });

  return `${INSTAGRAM_OAUTH_URL}?${params.toString()}`;
}

/**
 * Alias for backward compatibility.
 */
export function getMetaOAuthUrl(state: string, redirectUri: string): string {
  return getInstagramOAuthUrl(state, redirectUri);
}

/**
 * Exchanges the temporary Instagram authorization code for a short-lived access token.
 */
export async function exchangeCodeForToken(
  code: string,
  redirectUri: string
): Promise<MetaTokenResponse> {
  const appId =
    process.env.INSTAGRAM_APP_ID ||
    process.env.META_APP_ID ||
    '1785118029469438';
  const appSecret =
    process.env.INSTAGRAM_APP_SECRET ||
    process.env.META_APP_SECRET ||
    '7910891f8299ac5e25afb07d96f084e3';

  const formData = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
    code,
  });

  const res = await fetch('https://api.instagram.com/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString(),
  });

  const data = await res.json();
  if (!res.ok || data.error_type || data.error_message) {
    throw new Error(
      data.error_message || data.error?.message || 'Instagram token exchange failed'
    );
  }

  return {
    access_token: data.access_token,
    token_type: data.token_type || 'bearer',
    user_id: data.user_id ? String(data.user_id) : undefined,
  };
}

/**
 * Exchanges a short-lived Instagram token for a 60-day long-lived token via graph.instagram.com.
 */
export async function getLongLivedToken(shortToken: string): Promise<MetaTokenResponse> {
  const appSecret =
    process.env.INSTAGRAM_APP_SECRET ||
    process.env.META_APP_SECRET ||
    '7910891f8299ac5e25afb07d96f084e3';

  const params = new URLSearchParams({
    grant_type: 'ig_exchange_token',
    client_secret: appSecret,
    access_token: shortToken,
  });

  try {
    const res = await fetch(
      `https://graph.instagram.com/access_token?${params.toString()}`
    );
    const data = await res.json();
    if (data.access_token) {
      return {
        access_token: data.access_token,
        token_type: data.token_type || 'bearer',
        expires_in: data.expires_in,
      };
    }
  } catch (err) {
    console.warn('Could not exchange for long-lived Instagram token, using short-lived:', err);
  }

  return { access_token: shortToken, token_type: 'bearer' };
}

/**
 * Fetches the connected Instagram Professional/Creator account info via graph.instagram.com/me.
 * Pure Instagram Business Login flow.
 */
export async function getInstagramAccountInfo(
  accessToken: string
): Promise<InstagramAccountInfo | null> {
  try {
    interface IgDirectMeResponse {
      id: string;
      username: string;
      name?: string;
      account_type?: string;
      profile_picture_url?: string;
    }

    const res = await fetch(
      `https://graph.instagram.com/v21.0/me?fields=id,username,name,account_type,profile_picture_url&access_token=${accessToken}`
    );
    const me = (await res.json()) as IgDirectMeResponse;

    if (me?.id && me?.username) {
      return {
        id: String(me.id),
        username: me.username,
        name: me.name || me.username,
        profile_picture_url: me.profile_picture_url,
        account_type: (me.account_type as any) || 'CREATOR',
      };
    }
  } catch (err) {
    console.warn('Instagram Graph /me direct lookup failed, trying fallback:', err);
  }

  // Fallback via graphApiFetch
  try {
    const me = await graphApiFetch<any>(
      `https://graph.instagram.com/v21.0/me?fields=id,username,name,account_type,profile_picture_url&access_token=${accessToken}`
    );
    if (me?.username) {
      return {
        id: String(me.id),
        username: me.username,
        name: me.name || me.username,
        profile_picture_url: me.profile_picture_url,
        account_type: (me.account_type as any) || 'CREATOR',
      };
    }
  } catch (err) {
    console.error('getInstagramAccountInfo failed:', err);
  }

  return null;
}
