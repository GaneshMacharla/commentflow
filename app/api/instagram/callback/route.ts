import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForToken, getLongLivedToken, getInstagramAccountInfo } from '@/lib/instagram/oauth';
import { encryptToken } from '@/lib/security/encryption';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { isSupabaseConfigured, saveConnectedAccountLocally } from '@/lib/supabase/db';

export async function GET(request: NextRequest) {
  const origin = (process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin).replace(/\/$/, '');

  try {
    const searchParams = request.nextUrl.searchParams;
    const rawCode = searchParams.get('code');
    const code = rawCode ? rawCode.split('#_')[0] : null;
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // User denied permissions or Meta returned an error
    if (error) {
      return NextResponse.redirect(
        new URL(`/instagram?error=${encodeURIComponent(errorDescription || error)}`, origin)
      );
    }

    // CSRF state validation
    const savedState = request.cookies.get('oauth_state')?.value;
    if (!state || state !== savedState) {
      return NextResponse.redirect(
        new URL('/instagram?error=Invalid+state+parameter.+Please+try+connecting+again.', origin)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/instagram?error=Missing+authorization+code', origin)
      );
    }

    const redirectUri = `${origin}/api/instagram/callback`;

    // ── Step 1: Exchange authorization code → short-lived token ──────────────
    const tokenData = await exchangeCodeForToken(code, redirectUri);

    // ── Step 2: Exchange short-lived → 60-day long-lived token ───────────────
    let finalToken = tokenData.access_token;
    try {
      const longLived = await getLongLivedToken(tokenData.access_token);
      if (longLived.access_token) {
        finalToken = longLived.access_token;
      }
    } catch (llErr) {
      // Non-fatal: short-lived token will still work for this session
      console.warn('Could not exchange for long-lived token, using short-lived:', llErr);
    }

    // ── Step 3: Fetch Instagram account info directly via Instagram Graph ─────
    const accountInfo = await getInstagramAccountInfo(finalToken);
    if (!accountInfo) {
      return NextResponse.redirect(
        new URL(
          '/instagram?error=Could+not+retrieve+Instagram+account+details.+Please+ensure+you+granted+all+requested+permissions.',
          origin
        )
      );
    }

    // ── Step 4: Encrypt token ─────────────────────────────────────────────────
    const encryptedToken = encryptToken(finalToken);
    const accountId = `ig-${accountInfo.id}`;
    const tokenExpiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      : null;

    // ── Step 5a: Persist to Supabase ─────────────────────────────────────────
    if (isSupabaseConfigured()) {
      try {
        await supabaseAdmin.from('instagram_accounts').upsert(
          {
            // user_id is intentionally NULL in MVP single-user mode (FK made nullable by migration)
            user_id: null,
            instagram_user_id: accountInfo.id,
            username: accountInfo.username,
            profile_picture_url: accountInfo.profile_picture_url || null,
            account_type: accountInfo.account_type || 'CREATOR',
            access_token_encrypted: encryptedToken,
            token_expires_at: tokenExpiresAt,
            status: 'CONNECTED',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'instagram_user_id' }
        );
      } catch (dbErr) {
        console.error('Failed to save account to Supabase, falling back to local store:', dbErr);
        // Fall through to local store below
        saveConnectedAccountLocally({
          id: accountId,
          instagramUserId: accountInfo.id,
          username: accountInfo.username,
          profilePictureUrl: accountInfo.profile_picture_url,
          accountType: accountInfo.account_type,
          accessTokenEncrypted: encryptedToken,
          accessToken: finalToken,
        });
      }
    } else {
      // ── Step 5b: Local in-memory fallback (no Supabase configured) ───────────
      saveConnectedAccountLocally({
        id: accountId,
        instagramUserId: accountInfo.id,
        username: accountInfo.username,
        profilePictureUrl: accountInfo.profile_picture_url,
        accountType: accountInfo.account_type,
        accessTokenEncrypted: encryptedToken,
        accessToken: finalToken,
      });
    }

    // ── Step 6: Redirect to success ───────────────────────────────────────────
    const successResponse = NextResponse.redirect(
      new URL(`/instagram?connected=true&username=${encodeURIComponent(accountInfo.username)}`, origin)
    );
    successResponse.cookies.delete('oauth_state');
    successResponse.cookies.delete('oauth_provider');
    return successResponse;
  } catch (err: any) {
    console.error('OAuth callback error:', err);
    return NextResponse.redirect(
      new URL(
        `/instagram?error=${encodeURIComponent(err.message || 'OAuth failed. Please try again.')}`,
        origin
      )
    );
  }
}
