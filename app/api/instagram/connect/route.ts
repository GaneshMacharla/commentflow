import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getInstagramOAuthUrl } from '@/lib/instagram/oauth';

export async function GET(request: NextRequest) {
  try {
    const origin = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const redirectUri = `${origin.replace(/\/$/, '')}/api/instagram/callback`;
    const state = crypto.randomBytes(16).toString('hex');

    const authUrl = getInstagramOAuthUrl(state, redirectUri);

    const response = NextResponse.json({ url: authUrl, state });

    // Set state cookie to prevent CSRF during OAuth callback
    response.cookies.set('oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
