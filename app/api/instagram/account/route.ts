import { NextResponse } from 'next/server';
import { getConnectedAccount } from '@/lib/supabase/db';

export async function GET() {
  try {
    const account = await getConnectedAccount();
    if (!account) {
      return NextResponse.json({ connected: false, account: null });
    }

    // Never return the access token to the frontend
    const { accessToken, ...safeAccount } = account;
    return NextResponse.json({
      connected: true,
      account: safeAccount,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
