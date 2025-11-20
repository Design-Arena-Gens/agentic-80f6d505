import { NextRequest, NextResponse } from 'next/server';
import { getBrandConfig, upsertBrandConfig } from '@/lib/services/config.service';

export async function GET() {
  const config = await getBrandConfig();
  return NextResponse.json({ config });
}

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as Record<string, unknown>;
  const config = await upsertBrandConfig(payload);
  return NextResponse.json({ config });
}
