import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getOAuthUrl } from '@/lib/instagram/oauth';

export async function GET(request: NextRequest) {
  try {
    const origin = request.nextUrl.origin;
    const redirectUri = `${origin}/api/instagram/callback`;
    const state = crypto.randomBytes(16).toString('hex');
    const provider = request.nextUrl.searchParams.get('provider') || 'auto';

    const { url: authUrl, provider: detectedProvider } = getOAuthUrl(state, redirectUri, provider);

    const response = NextResponse.json({ url: authUrl, state, provider: detectedProvider });

    // Set state cookie to prevent CSRF during OAuth callback
    response.cookies.set('oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    });

    // Set provider cookie so the callback route knows whether to exchange via Instagram or Facebook
    response.cookies.set('oauth_provider', detectedProvider, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600,
      path: '/',
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
