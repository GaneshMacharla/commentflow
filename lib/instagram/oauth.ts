import { graphApiFetch } from './client';
import { InstagramAccountInfo, MetaTokenResponse } from './types';

const FACEBOOK_OAUTH_URL = 'https://www.facebook.com/v21.0/dialog/oauth';
const INSTAGRAM_OAUTH_URL = 'https://api.instagram.com/oauth/authorize';

// Official permissions for Facebook Graph Login
const FB_OAUTH_SCOPES = [
  'instagram_basic',
  'instagram_manage_comments',
  'instagram_manage_messages',
  'pages_show_list',
  'pages_read_engagement',
].join(',');

// Official permissions for Instagram Business Login
const IG_OAUTH_SCOPES = [
  'instagram_business_basic',
  'instagram_business_manage_messages',
  'instagram_business_manage_comments',
].join(',');

export type OAuthProvider = 'instagram' | 'facebook';

/**
 * Determines whether a given App ID is an Instagram App ID or Facebook App ID
 */
export function detectProvider(providerHint?: string | null): OAuthProvider {
  if (providerHint === 'instagram') return 'instagram';
  if (providerHint === 'facebook') return 'facebook';

  // If INSTAGRAM_APP_ID is configured or META_APP_ID matches the Instagram app id
  if (process.env.INSTAGRAM_APP_ID) return 'instagram';
  if (process.env.META_APP_ID === '1785118029469438') return 'instagram';

  return 'facebook';
}

/**
 * Builds the OAuth consent URL for either Instagram or Facebook.
 */
export function getOAuthUrl(
  state: string,
  redirectUri: string,
  requestedProvider?: string | null
): { url: string; provider: OAuthProvider } {
  const provider = detectProvider(requestedProvider);

  if (provider === 'instagram') {
    const appId = process.env.INSTAGRAM_APP_ID || process.env.META_APP_ID || '';
    if (!appId) {
      throw new Error('INSTAGRAM_APP_ID is not configured in your environment.');
    }
    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: IG_OAUTH_SCOPES,
      state,
    });
    return {
      url: `${INSTAGRAM_OAUTH_URL}?${params.toString()}`,
      provider: 'instagram',
    };
  }

  // Facebook Flow
  const appId = process.env.META_APP_ID || process.env.FACEBOOK_APP_ID || '';
  if (!appId) {
    throw new Error('META_APP_ID is not configured in your environment.');
  }
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    state,
    scope: FB_OAUTH_SCOPES,
    response_type: 'code',
  });

  return {
    url: `${FACEBOOK_OAUTH_URL}?${params.toString()}`,
    provider: 'facebook',
  };
}

/**
 * Backwards compatibility helper
 */
export function getMetaOAuthUrl(state: string, redirectUri: string): string {
  return getOAuthUrl(state, redirectUri).url;
}

/**
 * Exchanges the temporary authorization code for a short-lived access token.
 */
export async function exchangeCodeForToken(
  code: string,
  redirectUri: string,
  provider: OAuthProvider = 'facebook'
): Promise<MetaTokenResponse> {
  if (provider === 'instagram') {
    const appId = process.env.INSTAGRAM_APP_ID || process.env.META_APP_ID || '';
    const appSecret = process.env.INSTAGRAM_APP_SECRET || process.env.META_APP_SECRET || '';

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
      throw new Error(data.error_message || data.error?.message || 'Instagram token exchange failed');
    }

    return {
      access_token: data.access_token,
      token_type: data.token_type || 'bearer',
      user_id: data.user_id,
    };
  }

  // Facebook OAuth
  const appId = process.env.META_APP_ID || process.env.FACEBOOK_APP_ID || '';
  const appSecret = process.env.META_APP_SECRET || process.env.FACEBOOK_APP_SECRET || '';

  const params = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri,
    code,
  });

  return graphApiFetch<MetaTokenResponse>(`/oauth/access_token?${params.toString()}`);
}

/**
 * Exchanges a short-lived user token for a 60-day long-lived token.
 */
export async function getLongLivedToken(
  shortToken: string,
  provider: OAuthProvider = 'facebook'
): Promise<MetaTokenResponse> {
  if (provider === 'instagram') {
    const appSecret = process.env.INSTAGRAM_APP_SECRET || process.env.META_APP_SECRET || '';
    const params = new URLSearchParams({
      grant_type: 'ig_exchange_token',
      client_secret: appSecret,
      access_token: shortToken,
    });

    const res = await fetch(`https://graph.instagram.com/access_token?${params.toString()}`);
    const data = await res.json();
    if (data.access_token) {
      return data;
    }
    return { access_token: shortToken, token_type: 'bearer' };
  }

  const appId = process.env.META_APP_ID || process.env.FACEBOOK_APP_ID || '';
  const appSecret = process.env.META_APP_SECRET || process.env.FACEBOOK_APP_SECRET || '';

  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortToken,
  });

  return graphApiFetch<MetaTokenResponse>(`/oauth/access_token?${params.toString()}`);
}

/**
 * Fetches the connected Instagram Professional account.
 * Supports both Instagram Graph (/me) and Facebook Page (/me/accounts) structures.
 */
export async function getInstagramAccountInfo(
  accessToken: string,
  provider: OAuthProvider = 'facebook'
): Promise<InstagramAccountInfo | null> {
  // Option 1: Try direct Instagram Graph query (Used by Instagram Login)
  try {
    interface IgDirectMeResponse {
      id: string;
      username: string;
      account_type?: string;
      profile_picture_url?: string;
    }

    const me = await graphApiFetch<IgDirectMeResponse>(
      `https://graph.instagram.com/v21.0/me?fields=id,username,account_type,profile_picture_url&access_token=${accessToken}`
    );

    if (me?.id && me?.username) {
      return {
        id: me.id,
        username: me.username,
        name: me.username,
        profile_picture_url: me.profile_picture_url,
        account_type: (me.account_type as any) || 'CREATOR',
      };
    }
  } catch (err) {
    console.warn('getInstagramAccountInfo: graph.instagram.com/me lookup failed, trying Facebook Graph fallback:', err);
  }

  // Option 2: Facebook Pages (Business accounts via Page)
  try {
    interface PagesResponse {
      data: {
        id: string;
        name: string;
        instagram_business_account?: {
          id: string;
        };
      }[];
    }

    const pages = await graphApiFetch<PagesResponse>(
      `/me/accounts?fields=id,name,instagram_business_account&access_token=${accessToken}`
    );

    const pageWithIg = pages.data?.find((p) => p.instagram_business_account?.id);
    if (pageWithIg?.instagram_business_account?.id) {
      const igAccountId = pageWithIg.instagram_business_account.id;

      interface IgProfileResponse {
        id: string;
        username: string;
        name?: string;
        profile_picture_url?: string;
      }

      const profile = await graphApiFetch<IgProfileResponse>(
        `/${igAccountId}?fields=id,username,name,profile_picture_url&access_token=${accessToken}`
      );

      return {
        id: profile.id,
        username: profile.username,
        name: profile.name,
        profile_picture_url: profile.profile_picture_url,
        account_type: 'BUSINESS',
      };
    }
  } catch (err) {
    console.warn('getInstagramAccountInfo: /me/accounts lookup failed:', err);
  }

  // Option 3: Fallback for Creator accounts linked at user level
  try {
    interface MeIgResponse {
      id: string;
      username?: string;
      name?: string;
      profile_picture_url?: string;
      instagram_business_account?: {
        id: string;
        username: string;
        name?: string;
        profile_picture_url?: string;
      };
    }

    const me = await graphApiFetch<MeIgResponse>(
      `/me?fields=id,name,username,profile_picture_url,instagram_business_account{id,username,name,profile_picture_url}&access_token=${accessToken}`
    );

    if (me.instagram_business_account?.id) {
      const ig = me.instagram_business_account;
      return {
        id: ig.id,
        username: ig.username,
        name: ig.name,
        profile_picture_url: ig.profile_picture_url,
        account_type: 'CREATOR',
      };
    }

    if (me.username) {
      return {
        id: me.id,
        username: me.username,
        name: me.name,
        profile_picture_url: me.profile_picture_url,
        account_type: 'CREATOR',
      };
    }
  } catch (err) {
    console.error('getInstagramAccountInfo: all lookups failed:', err);
  }

  return null;
}
