import { NextResponse } from 'next/server';
import { getLostFoundBaseUrl } from '@/lib/lost-found/config';

export const dynamic = 'force-dynamic';

export async function POST(_req: Request, { params }: { params: { alertId: string } }) {
  try {
    const res = await fetch(`${getLostFoundBaseUrl()}/alerts/${params.alertId}/reject`, {
      method: 'POST',
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      return NextResponse.json({ error: body?.detail ?? 'Could not reject alert' }, { status: res.status });
    }
    return NextResponse.json(body, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Lost & Found service is not running' }, { status: 502 });
  }
}
