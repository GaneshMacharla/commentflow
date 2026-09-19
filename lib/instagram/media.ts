import { graphApiFetch } from './client';
import { InstagramMediaItem } from './types';

interface MediaResponse {
  data: {
    id: string;
    caption?: string;
    media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
    media_product_type?: 'REELS' | 'FEED' | string;
    media_url?: string;
    thumbnail_url?: string;
    permalink: string;
    timestamp: string;
    like_count?: number;
    comments_count?: number;
  }[];
  paging?: {
    cursors?: {
      after: string;
    };
  };
}

/**
 * Retrieves the creator's posts and reels through the Instagram Graph API.
 */
export async function fetchInstagramMedia(
  instagramAccountId: string,
  accessToken: string,
  limit: number = 25
): Promise<InstagramMediaItem[]> {
  const fields = [
    'id',
    'caption',
    'media_type',
    'media_product_type',
    'media_url',
    'thumbnail_url',
    'permalink',
    'timestamp',
    'like_count',
    'comments_count',
  ].join(',');

  const endpoint = `/${instagramAccountId}/media?fields=${fields}&limit=${limit}&access_token=${accessToken}`;
  const response = await graphApiFetch<MediaResponse>(endpoint);

  return (response.data || []).map((item) => {
    // Distinguish Reels from standard video
    const isReel = item.media_product_type === 'REELS' || item.media_type === 'VIDEO';
    return {
      id: item.id,
      caption: item.caption || '',
      media_type: isReel ? 'REEL' : item.media_type,
      media_url: item.media_url,
      thumbnail_url: item.thumbnail_url || item.media_url,
      permalink: item.permalink,
      timestamp: item.timestamp,
      like_count: item.like_count || 0,
      comments_count: item.comments_count || 0,
    };
  });
}
