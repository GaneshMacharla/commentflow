import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForToken, getLongLivedToken, getInstagramAccountInfo } from '@/lib/instagram/oauth';
import { encryptToken } from '@/lib/security/encryption';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/supabase/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (error) {
      return NextResponse.redirect(
        new URL(`/instagram?error=${encodeURIComponent(errorDescription || error)}`, request.url)
      );
    }

    const savedState = request.cookies.get('oauth_state')?.value;
    if (!state || state !== savedState) {
      return NextResponse.redirect(
        new URL('/instagram?error=Invalid+state+parameter', request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/instagram?error=Missing+authorization+code', request.url)
      );
    }

    const origin = request.nextUrl.origin;
    const redirectUri = `${origin}/api/instagram/callback`;

    // 1. Exchange authorization code for short token
    const tokenData = await exchangeCodeForToken(code, redirectUri);
    
    // 2. Exchange for 60-day long-lived token
    const longLived = await getLongLivedToken(tokenData.access_token);
    const finalToken = longLived.access_token || tokenData.access_token;

    // 3. Fetch connected Instagram business account info
    const accountInfo = await getInstagramAccountInfo(finalToken);
    if (!accountInfo) {
      return NextResponse.redirect(
        new URL('/instagram?error=No+Instagram+Professional+Account+linked+to+Page', request.url)
      );
    }

    // 4. Encrypt access token before storing
    const encryptedToken = encryptToken(finalToken);

    if (isSupabaseConfigured()) {
      await supabaseAdmin.from('instagram_accounts').upsert({
        user_id: 'user-default',
        instagram_user_id: accountInfo.id,
        username: accountInfo.username,
        profile_picture_url: accountInfo.profile_picture_url,
        account_type: accountInfo.account_type || 'CREATOR',
        access_token_encrypted: encryptedToken,
        status: 'CONNECTED',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'instagram_user_id' });
    }

    const response = NextResponse.redirect(new URL('/instagram?connected=true', request.url));
    response.cookies.delete('oauth_state');
    return response;
  } catch (err: any) {
    console.error('OAuth callback error:', err);
    return NextResponse.redirect(
      new URL(`/instagram?error=${encodeURIComponent(err.message || 'OAuth failed')}`, request.url)
    );
  }
}
