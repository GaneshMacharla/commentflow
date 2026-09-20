export interface MetaTokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  user_id?: string;
}

export interface InstagramAccountInfo {
  id: string; // Instagram user / account ID
  username: string;
  name?: string;
  profile_picture_url?: string;
  account_type?: 'BUSINESS' | 'CREATOR';
}

export interface InstagramMediaItem {
  id: string;
  caption?: string;
  media_type: 'IMAGE' | 'VIDEO' | 'REEL' | 'CAROUSEL_ALBUM';
  media_url?: string;
  thumbnail_url?: string;
  permalink: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
}

export interface InstagramWebhookEntry {
  id: string; // Instagram account ID or Facebook Page ID
  time: number;
  changes?: {
    field: string;
    value: {
      from?: {
        id?: string;
        username?: string;
        name?: string;
      };
      media?: {
        id?: string;
        media_product_type?: string;
      } | string;
      media_id?: string;
      post_id?: string;
      target_id?: string;
      id?: string; // comment_id
      comment_id?: string;
      text?: string;
      message?: string;
      item?: string;
      parent_id?: string;
      username?: string;
      user_id?: string;
      commenter_id?: string;
    };
  }[];
  messaging?: any[];
}

export interface InstagramWebhookPayload {
  object: 'instagram' | string;
  entry: InstagramWebhookEntry[];
}
