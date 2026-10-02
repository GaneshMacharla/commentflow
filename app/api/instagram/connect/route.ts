import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getInstagramOAuthUrl } from '@/lib/instagram/oauth';

export function resolveRequestOrigin(request: NextRequest): string {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || request.nextUrl.host;
  const proto = request.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
  if (host && !host.includes('localhost')) {
    return `${proto}://${host}`.replace(/\/$/, '');
  }
  if (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes('localhost')) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  }
  return request.nextUrl.origin.replace(/\/$/, '');
}

export async function GET(request: NextRequest) {
  try {
    const origin = resolveRequestOrigin(request);
    const redirectUri = `${origin}/api/instagram/callback`;
    const state = crypto.randomBytes(16).toString('hex');

    console.log(`[OAuth Init] Generated redirect_uri: ${redirectUri}`);

    const authUrl = getInstagramOAuthUrl(state, redirectUri);

    const response = NextResponse.json({ url: authUrl, state, redirectUri });

    // Set state cookie to prevent CSRF during OAuth callback
    response.cookies.set('oauth_state', state, {
      httpOnly: true,
      secure: origin.startsWith('https'),
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
