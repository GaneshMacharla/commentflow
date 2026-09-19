import { NextResponse } from 'next/server';
import { getMedia, getConnectedAccount } from '@/lib/supabase/db';
import { fetchInstagramMedia } from '@/lib/instagram/media';

export async function GET() {
  try {
    const account = await getConnectedAccount();
    if (!account) {
      // Return connected:false so the client can show "Connect Instagram" CTA
      return NextResponse.json({ connected: false, media: [] });
    }

    // If a real Instagram access token exists (not mock or demo), sync fresh media from Graph API
    if (account.accessToken && !account.accessToken.startsWith('mock_') && !account.accessToken.startsWith('demo_')) {
      try {
        const liveMedia = await fetchInstagramMedia(account.instagramUserId, account.accessToken);
        return NextResponse.json({
          connected: true,
          account: {
            username: account.username,
            profilePictureUrl: account.profilePictureUrl,
          },
          media: liveMedia,
        });
      } catch (graphErr) {
        console.warn('Could not sync live media from Graph API, serving stored media:', graphErr);
      }
    }

    const storedMedia = await getMedia(account.id);
    return NextResponse.json({
      connected: true,
      account: {
        username: account.username,
        profilePictureUrl: account.profilePictureUrl,
      },
      media: storedMedia,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
