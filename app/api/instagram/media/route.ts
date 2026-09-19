import { NextResponse } from 'next/server';
import { getMedia, getConnectedAccount } from '@/lib/supabase/db';
import { fetchInstagramMedia } from '@/lib/instagram/media';

export async function GET() {
  try {
    const account = await getConnectedAccount();
    if (!account) {
      return NextResponse.json({ media: [] });
    }

    // If live Instagram access token exists and not mock, sync fresh media
    if (account.accessToken && !account.accessToken.startsWith('mock_')) {
      try {
        const liveMedia = await fetchInstagramMedia(account.instagramUserId, account.accessToken);
        return NextResponse.json({ media: liveMedia });
      } catch (graphErr) {
        console.warn('Could not sync live media from Graph API, serving stored media:', graphErr);
      }
    }

    const storedMedia = await getMedia(account.id);
    return NextResponse.json({ media: storedMedia });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
