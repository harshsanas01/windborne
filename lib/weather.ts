// Open-Meteo fetch for an array of points, batched to limit requests.
export type WeatherAtPoint = {
  t: string;
  lat: number;
  lon: number;
  temperature_2m?: number | null;
  wind_speed_10m?: number | null;
  wind_direction_10m?: number | null;
};

export async function enrichWithWeather(points: { t: string; lat: number; lon: number }[]): Promise<WeatherAtPoint[]> {
  const out: WeatherAtPoint[] = [];
  // Batch by 50 requests max to be polite.
  const chunk = <T,>(arr: T[], n: number) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));
  const batches = chunk(points, 50);

  for (const batch of batches) {
    const reqs = batch.map(async p => {
      const url = new URL('https://api.open-meteo.com/v1/forecast');
      url.searchParams.set('latitude', String(p.lat));
      url.searchParams.set('longitude', String(p.lon));
      url.searchParams.set('current', 'temperature_2m,wind_speed_10m,wind_direction_10m');
      url.searchParams.set('timezone', 'UTC');
      try {
        const r = await fetch(url.toString(), { cache: 'no-store' });
        if (!r.ok) throw new Error();
        const j = await r.json();
        const cur = j.current ?? {};
        out.push({
          t: p.t, lat: p.lat, lon: p.lon,
          temperature_2m: cur.temperature_2m ?? null,
          wind_speed_10m: cur.wind_speed_10m ?? null,
          wind_direction_10m: cur.wind_direction_10m ?? null
        });
      } catch {
        out.push({ t: p.t, lat: p.lat, lon: p.lon });
      }
    });
    await Promise.all(reqs);
  }
  return out;
}