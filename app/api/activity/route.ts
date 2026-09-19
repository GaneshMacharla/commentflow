import { NextRequest, NextResponse } from 'next/server';
import { getActivityLogs, getDashboardStats } from '@/lib/supabase/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const status = searchParams.get('status') || undefined;

    const [logs, stats] = await Promise.all([
      getActivityLogs(limit, status),
      getDashboardStats(),
    ]);

    return NextResponse.json({ logs, stats });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
