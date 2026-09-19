import { NextRequest, NextResponse } from 'next/server';
import { updateAutomation } from '@/lib/supabase/db';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const updated = await updateAutomation(id, { status: 'ACTIVE', errorReason: null });
    return NextResponse.json({ success: true, automation: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
