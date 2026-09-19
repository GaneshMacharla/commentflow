import { NextRequest, NextResponse } from 'next/server';
import { getAutomations, createAutomation, getConnectedAccount } from '@/lib/supabase/db';
import { z } from 'zod';

const createAutomationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  mediaId: z.string().nullable().optional(),
  matchType: z.enum(['CONTAINS', 'EXACT', 'STARTS_WITH', 'ENDS_WITH']).default('CONTAINS'),
  matchMode: z.enum(['ANY', 'ALL']).default('ANY'),
  keywords: z.array(z.string()).min(1, 'At least one keyword is required'),
  publicReply: z.string().optional(),
  privateMessage: z.string().optional(),
});

/**
 * GET /api/automations
 * Returns list of automations
 */
export async function GET() {
  try {
    const automations = await getAutomations();
    return NextResponse.json({ automations });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/automations
 * Creates a new automation
 */
export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const validated = createAutomationSchema.parse(json);

    const account = await getConnectedAccount();
    const accountId = account?.id || 'acc-1';

    const automation = await createAutomation({
      instagramAccountId: accountId,
      mediaId: validated.mediaId || null,
      name: validated.name,
      matchType: validated.matchType,
      matchMode: validated.matchMode,
      keywords: validated.keywords,
      publicReply: validated.publicReply,
      privateMessage: validated.privateMessage,
    });

    return NextResponse.json({ automation }, { status: 201 });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
