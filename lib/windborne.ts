// Robustly pull 00-23 snapshots and build tracks, ignoring corrupted chunks.
export async function fetchConstellation(): Promise<import('./types').Constellation> {
  const base = 'https://a.windbornesystems.com/treasure';
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const nowIso = new Date().toISOString();

  const snapshots = await Promise.allSettled(
    hours.map(async h => {
      const url = `${base}/${h}.json`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // Some files may be partially corrupt or contain stray characters.
      const text = await res.text();
      // Trim BOM or trailing junk heuristically.
      const cleaned = text.trim().replace(/^[^\[{]*/,'').replace(/[^\]}]+$/,'');
      try {
        return { hour: h, json: JSON.parse(cleaned) };
      } catch {
        // Try last-ditch recovery by slicing to last closing brace/bracket.
        const last = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
        if (last > 0) {
          const slice = cleaned.slice(0, last + 1);
          return { hour: h, json: JSON.parse(slice) };
        }
        throw new Error(`Corrupt ${h}.json`);
      }
    })
  );

  // Normalize to per-balloon tracks. The files are undocumented, so we defensively probe.
  const byId = new Map<string, import('./types').BalloonPoint[]>();

  for (const s of snapshots) {
    if (s.status !== 'fulfilled') continue;
    const { hour, json } = s.value as { hour: string; json: any };
    // Accept arrays of objects or object maps. Try common field aliases.
    const items: any[] = Array.isArray(json) ? json : Object.values(json || {});
    const hourAgo = Number(hour); // 00 is now, 23 is 23h ago
    const timestamp = new Date(Date.now() - hourAgo * 3600_000).toISOString();

    for (const it of items) {
      if (!it) continue;
      const id = String(it.id ?? it._id ?? it.name ?? it.serial ?? '').trim();
      const lat = Number(it.lat ?? it.latitude ?? it.position?.lat ?? it.pos?.lat);
      const lon = Number(it.lon ?? it.lng ?? it.longitude ?? it.position?.lon ?? it.pos?.lon);
      const alt = it.alt ?? it.altitude ?? it.h ?? null;
      if (!id || !isFinite(lat) || !isFinite(lon)) continue;

      const arr = byId.get(id) ?? [];
      arr.push({ id, t: timestamp, lat, lon, alt: typeof alt === 'number' ? alt : null });
      byId.set(id, arr);
    }
  }

  // Sort points per id by time asc and dedupe identical consecutive points.
  const tracks = [...byId.entries()].map(([id, pts]) => {
    pts.sort((a, b) => a.t.localeCompare(b.t));
    const cleaned: typeof pts = [];
    for (const p of pts) {
      const prev = cleaned[cleaned.length - 1];
      if (!prev || prev.lat !== p.lat || prev.lon !== p.lon || prev.alt !== p.alt) cleaned.push(p);
    }
    return { id, points: cleaned };
  }).filter(t => t.points.length > 0);

  return { updatedAt: nowIso, tracks };
}