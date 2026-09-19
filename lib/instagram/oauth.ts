import { graphApiFetch } from './client';
import { InstagramAccountInfo, MetaTokenResponse } from './types';

const META_OAUTH_URL = 'https://www.facebook.com/v21.0/dialog/oauth';

// Official permissions required for Instagram Professional comment automation & DMs
const OAUTH_SCOPES = [
  'instagram_basic',
  'instagram_manage_comments',
  'instagram_manage_messages',
  'pages_show_list',
  'pages_read_engagement',
].join(',');

/**
 * Builds the Meta OAuth consent URL.
 */
export function getMetaOAuthUrl(state: string, redirectUri: string): string {
  const appId = process.env.META_APP_ID || '';
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    state,
    scope: OAUTH_SCOPES,
    response_type: 'code',
  });

  return `${META_OAUTH_URL}?${params.toString()}`;
}

/**
 * Exchanges the temporary authorization code for a short-lived access token.
 */
export async function exchangeCodeForToken(
  code: string,
  redirectUri: string
): Promise<MetaTokenResponse> {
  const appId = process.env.META_APP_ID || '';
  const appSecret = process.env.META_APP_SECRET || '';

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
export async function getLongLivedToken(shortToken: string): Promise<MetaTokenResponse> {
  const appId = process.env.META_APP_ID || '';
  const appSecret = process.env.META_APP_SECRET || '';

  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortToken,
  });

  return graphApiFetch<MetaTokenResponse>(`/oauth/access_token?${params.toString()}`);
}

/**
 * Fetches the connected Instagram Professional account linked to the user's Facebook Page.
 * Falls back to querying /me directly for Creator accounts without a linked Page.
 */
export async function getInstagramAccountInfo(accessToken: string): Promise<InstagramAccountInfo | null> {
  // Step 1: Try via Facebook Pages (Business accounts)
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
    console.warn('getInstagramAccountInfo: /me/accounts lookup failed, trying /me fallback:', err);
  }

  // Step 2: Fallback for Creator accounts — query the user directly
  // Creator accounts link their IG account at the user level, not the Page level.
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

    // First try to get the IG account directly linked to the user
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

    // Last resort: use the Facebook user's profile (some Creator setups)
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
    console.error('getInstagramAccountInfo: /me fallback also failed:', err);
  }

  return null;
}

