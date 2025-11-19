import { NextResponse } from 'next/server';
import { z } from 'zod';

const Point = z.object({
  id: z.string(),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  alt: z.number().optional(),
  t: z.number().int(), // unix seconds
});

type Raw = unknown;
const nowSec = () => Math.floor(Date.now() / 1000);
const pad2 = (n: number) => String(n).padStart(2, '0');
const normLon = (x: number) => {
  let v = x;
  while (v > 180) v -= 360;
  while (v < -180) v += 360;
  return v;
};
const round = (v: number, p = 3) => Math.round(v * 10 ** p) / 10 ** p;
const stableId = (lat: number, lon: number) =>
  `${Math.round(lat * 1000)}:${Math.round(lon * 1000)}`;

async function safeFetch(url: string) {
  try {
    const r = await fetch(url, {
      cache: 'no-store',
      headers: { 'User-Agent': 'WindborneViewer/1.0' },
    });
    if (!r.ok) return null;
    const text = await r.text();
    return JSON.parse(text) as Raw;
  } catch {
    return null;
  }
}

function toNum(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v);
  return undefined;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const base = 'https://a.windbornesystems.com/treasure';
  const hours = Array.from({ length: 24 }, (_, i) => i); // 00..23
  const snaps = await Promise.all(hours.map(h => safeFetch(`${base}/${pad2(h)}.json`)));

  const rows: Array<z.infer<typeof Point> & { hourAgo: number }> = [];

  const pushRow = (
    p: {
      id?: unknown;
      lat?: unknown;
      lon?: unknown;
      lng?: unknown;
      long?: unknown;
      latitude?: unknown;
      longitude?: unknown;
      alt?: unknown;
      altitude?: unknown;
      t?: unknown;
      ts?: unknown;
      time?: unknown;
      timestamp?: unknown;
    },
    hourAgo: number
  ) => {
    const lat0 = toNum(p.lat ?? p.latitude);
    const lon0 = toNum(p.lon ?? p.lng ?? p.longitude ?? p.long);
    if (lat0 === undefined || lon0 === undefined) return;

    const lat = Math.max(-90, Math.min(90, lat0));
    const lon = normLon(lon0);
    if (lat === 0 && lon === 0) return;

    let t = toNum(p.t ?? p.ts ?? p.time ?? p.timestamp);
    if (!t) t = nowSec() - hourAgo * 3600;
    if (t > 1_000_000_000_000) t = Math.floor(t / 1000);

    const alt = toNum(p.alt ?? p.altitude);

    const idRaw =
      typeof p.id === 'string' && p.id.trim() !== ''
        ? p.id
        : stableId(round(lat, 3), round(lon, 3));

    const maybe = Point.safeParse({ id: String(idRaw), lat, lon, alt, t });
    if (maybe.success) rows.push({ ...maybe.data, hourAgo });
  };

  const visit = (val: any, hourAgo: number) => {
    if (!val) return;

    // [lat, lon] or [lat, lon, alt]
    if (Array.isArray(val)) {
      if (
        val.length >= 2 &&
        typeof val[0] === 'number' &&
        typeof val[1] === 'number' &&
        (val.length === 2 || typeof val[2] === 'number' || val[2] === undefined)
      ) {
        const [lat, lon, alt] = val as [number, number, number?];
        pushRow({ lat, lon, alt }, hourAgo);
        return;
      }
      for (const v of val) visit(v, hourAgo);
      return;
    }

    if (typeof val === 'object') {
      const hasLat = 'lat' in val || 'latitude' in val;
      const hasLon = 'lon' in val || 'lng' in val || 'longitude' in val || 'long' in val;
      if (hasLat && hasLon) pushRow(val as any, hourAgo);
      for (const v of Object.values(val)) visit(v, hourAgo);
    }
  };

  snaps.forEach((snap, idx) => {
    if (!snap) return;
    visit(snap, idx);
  });

  // build tracks by id; keep chronological order; dedup within same hour+cell
  const byId = new Map<string, { id: string; points: Array<{ t: number; lat: number; lng: number; alt?: number }> }>();
  const seenPerHour = new Map<number, Set<string>>();

  for (const r of rows) {
    const hourAgo = r.hourAgo;
    const cell = `${Math.round(r.lat * 1000)}|${Math.round(r.lon * 1000)}|${hourAgo}`;
    const seen = seenPerHour.get(hourAgo) ?? new Set<string>();
    if (seen.has(cell)) continue;
    seen.add(cell);
    seenPerHour.set(hourAgo, seen);

    const item = byId.get(r.id) ?? { id: r.id, points: [] };
    item.points.push({ t: r.t, lat: r.lat, lng: r.lon, alt: r.alt });
    byId.set(r.id, item);
  }

  const tracks = Array.from(byId.values()).map(tr => {
    tr.points.sort((a, b) => a.t - b.t);
    return tr;
  });

  // optional server-side limit of returned latest positions (for bandwidth)
  const limit = Math.max(0, Math.min(5000, Number(url.searchParams.get('limit') || '0')));
  if (limit > 0) {
    // keep only first N tracks by latest-time presence
    tracks.sort((a, b) => (b.points[b.points.length - 1]?.t ?? 0) - (a.points[a.points.length - 1]?.t ?? 0));
    tracks.splice(limit);
  }

  return NextResponse.json(
    { tracks, updatedAt: nowSec() },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}