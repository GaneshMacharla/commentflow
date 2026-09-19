import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { isSupabaseConfigured, clearConnectedAccountLocally } from '@/lib/supabase/db';

export async function POST() {
  try {
    if (isSupabaseConfigured()) {
      // Mark all CONNECTED accounts as DISCONNECTED (single-user MVP)
      await supabaseAdmin
        .from('instagram_accounts')
        .update({ status: 'DISCONNECTED', updated_at: new Date().toISOString() })
        .eq('status', 'CONNECTED');
    }

    // Always clear the local in-memory store (covers both local dev and Supabase mode)
    clearConnectedAccountLocally();

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
