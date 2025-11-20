import { NextResponse } from 'next/server';
import { executeDailyRun } from '@/lib/pipeline/agent';

export async function POST() {
  try {
    const result = await executeDailyRun();
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: (error as Error).message,
      },
      { status: 500 },
    );
  }
}
