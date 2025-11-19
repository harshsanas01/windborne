import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const res = await fetch('https://windbornesystems.com/career_applications.json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  return NextResponse.json({ ok: res.status === 200, status: res.status, body: text.slice(0, 2000) }, { status: 200 });
}