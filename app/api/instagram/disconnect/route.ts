import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/supabase/db';

export async function POST() {
  try {
    if (isSupabaseConfigured()) {
      await supabaseAdmin
        .from('instagram_accounts')
        .update({ status: 'DISCONNECTED' })
        .eq('user_id', 'user-default');
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
