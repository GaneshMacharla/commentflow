import { NextRequest, NextResponse } from 'next/server';
import { getAutomationById, updateAutomation, deleteAutomation } from '@/lib/supabase/db';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const automation = await getAutomationById(id);
    if (!automation) {
      return NextResponse.json({ error: 'Automation not found' }, { status: 404 });
    }
    return NextResponse.json({ automation });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const updated = await updateAutomation(id, body);
    if (!updated) {
      return NextResponse.json({ error: 'Automation not found' }, { status: 404 });
    }
    return NextResponse.json({ automation: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const success = await deleteAutomation(id);
    return NextResponse.json({ success });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
