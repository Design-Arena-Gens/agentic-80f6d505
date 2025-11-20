import { NextResponse } from 'next/server';
import { getLatestRun, getRunHistory } from '@/lib/services/run.service';

export async function GET() {
  const [latest, history] = await Promise.all([getLatestRun(), getRunHistory()]);
  return NextResponse.json({ latest, history });
}
