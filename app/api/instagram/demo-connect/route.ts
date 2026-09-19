import { NextResponse } from 'next/server';
import { saveConnectedAccountLocally, isSupabaseConfigured } from '@/lib/supabase/db';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Demo Instagram Reels and Posts to seed for instant testing
export const DEMO_MEDIA = [
  {
    id: 'media-reel-1',
    instagram_media_id: '18029348123984711',
    instagram_account_id: 'ig-demo-creator',
    media_type: 'VIDEO',
    caption: '🚀 5 AI Tools that will 10x your productivity in 2026. Comment "TOOLS" and I will send you the complete list with direct links in your DM! 👇',
    thumbnail_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    permalink: 'https://instagram.com/p/C3demoReel1',
    timestamp: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
    like_count: 1420,
    comments_count: 382,
  },
  {
    id: 'media-reel-2',
    instagram_media_id: '18029348123984712',
    instagram_account_id: 'ig-demo-creator',
    media_type: 'VIDEO',
    caption: 'How I scaled from $0 to $10k/mo with zero ad spend 🔥 Drop "ROADMAP" below and I\'ll DM you the free 24-page step-by-step PDF!',
    thumbnail_url: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=600&auto=format&fit=crop&q=80',
    permalink: 'https://instagram.com/p/C3demoReel2',
    timestamp: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
    like_count: 2890,
    comments_count: 745,
  },
  {
    id: 'media-post-3',
    instagram_media_id: '18029348123984713',
    instagram_account_id: 'ig-demo-creator',
    media_type: 'CAROUSEL_ALBUM',
    caption: 'Complete Meta Graph API Cheatsheet for Developers 💻 Comment "CODE" to get the GitHub starter kit repo link!',
    thumbnail_url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80',
    permalink: 'https://instagram.com/p/C3demoPost3',
    timestamp: new Date(Date.now() - 3600 * 1000 * 48).toISOString(),
    like_count: 890,
    comments_count: 156,
  },
  {
    id: 'media-reel-4',
    instagram_media_id: '18029348123984714',
    instagram_account_id: 'ig-demo-creator',
    media_type: 'VIDEO',
    caption: 'The secret to automating 1,000+ Instagram DMs every day safely without getting banned ⚡ Comment "LINK" for full tutorial access!',
    thumbnail_url: 'https://images.unsplash.com/photo-1618172193763-c511deb635ca?w=600&auto=format&fit=crop&q=80',
    permalink: 'https://instagram.com/p/C3demoReel4',
    timestamp: new Date(Date.now() - 3600 * 1000 * 72).toISOString(),
    like_count: 3410,
    comments_count: 912,
  },
  {
    id: 'media-post-5',
    instagram_media_id: '18029348123984715',
    instagram_account_id: 'ig-demo-creator',
    media_type: 'IMAGE',
    caption: 'New Notion Creator Operating System is finally live! ✨ Comment "NOTION" to get the 50% launch discount link!',
    thumbnail_url: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=600&auto=format&fit=crop&q=80',
    permalink: 'https://instagram.com/p/C3demoPost5',
    timestamp: new Date(Date.now() - 3600 * 1000 * 96).toISOString(),
    like_count: 670,
    comments_count: 88,
  },
  {
    id: 'media-reel-6',
    instagram_media_id: '18029348123984716',
    instagram_account_id: 'ig-demo-creator',
    media_type: 'VIDEO',
    caption: 'Stop manually replying to "link please" in your comments! Set this up once and watch leads flow 24/7. Comment "FLOW" to test it right now! 🤖',
    thumbnail_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    permalink: 'https://instagram.com/p/C3demoReel6',
    timestamp: new Date(Date.now() - 3600 * 1000 * 120).toISOString(),
    like_count: 4120,
    comments_count: 1240,
  },
];

export async function POST() {
  try {
    const demoAccount = {
      id: 'ig-demo-creator',
      instagramUserId: '17841400293847192',
      username: 'replykaro.creator',
      name: 'ReplyKaro Creator Studio',
      profilePictureUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      accountType: 'CREATOR',
      accessTokenEncrypted: 'demo_simulated_encrypted_token',
      accessToken: 'demo_simulated_access_token',
      status: 'CONNECTED',
    };

    // Save to local in-memory store
    saveConnectedAccountLocally(demoAccount);

    // Also persist to Supabase if configured
    if (isSupabaseConfigured()) {
      try {
        await supabaseAdmin.from('instagram_accounts').upsert({
          user_id: null,
          instagram_user_id: demoAccount.instagramUserId,
          username: demoAccount.username,
          profile_picture_url: demoAccount.profilePictureUrl,
          account_type: demoAccount.accountType,
          access_token_encrypted: demoAccount.accessTokenEncrypted,
          status: 'CONNECTED',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'instagram_user_id' });

        // Seed demo media
        await supabaseAdmin.from('media').upsert(
          DEMO_MEDIA.map((m) => ({
            id: m.id,
            instagram_account_id: demoAccount.id,
            instagram_media_id: m.instagram_media_id,
            media_type: m.media_type,
            caption: m.caption,
            thumbnail_url: m.thumbnail_url,
            permalink: m.permalink,
            timestamp: m.timestamp,
            like_count: m.like_count,
            comments_count: m.comments_count,
          })),
          { onConflict: 'instagram_media_id' }
        );
      } catch (dbErr) {
        console.warn('Could not save demo account to Supabase (using local store):', dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      account: {
        id: demoAccount.id,
        instagramUserId: demoAccount.instagramUserId,
        username: demoAccount.username,
        name: demoAccount.name,
        profilePictureUrl: demoAccount.profilePictureUrl,
        accountType: demoAccount.accountType,
        status: demoAccount.status,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to connect demo account' }, { status: 500 });
  }
}
