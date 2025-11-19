// app/api/ask/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { email, message } = await req.json();
  if (!email || !message) {
    return NextResponse.json({ ok:false, status:400, body:'email and message are required' }, { status:400 });
  }

  const payload = {
    career_application: {
      name: 'Question via Live App',
      email,
      role: 'Junior Web Developer',
      notes: `Question: ${message}`,
      submission_url: 'https://example.com/submission',  // must be publicly accessible
      portfolio_url: 'https://dev.ampureintelligence.com/login',    // must be publicly accessible
      resume_url: 'https://drive.google.com/file/d/1hXAT5uBs_4T0sIQhKoHmSs_S9V4mSjrL/view?usp=drive_link'       // must be publicly accessible
    }
  };

  const upstream = await fetch('https://windbornesystems.com/career_applications.json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept':'application/json' },
    body: JSON.stringify(payload)
  });

  const bodyText = await upstream.text();
  let body: any = bodyText;
  try { body = JSON.parse(bodyText); } catch {}

  return NextResponse.json(
    { ok: upstream.status === 200, status: upstream.status, body },
    { status: upstream.ok ? 200 : upstream.status }
  );
}