
// app/components/MapView.tsx
'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';

const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer    = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Marker       = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });
const Popup        = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false });

const MAX_MARKERS = 500;

// lightweight inline SVG balloon icon (no network fetch, crisp at all DPRs)
const BALLOON_SVG = encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#66d1ff"/>
      <stop offset="100%" stop-color="#1a84ff"/>
    </linearGradient>
  </defs>
  <g fill="none" stroke="rgba(0,0,0,.25)" stroke-width="1">
    <ellipse cx="24" cy="18" rx="13" ry="16" fill="url(#g)"/>
    <path d="M24 34c2 3 2 5 0 6-2-1-2-3 0-6z" fill="#e0a070"/>
    <path d="M24 40c0 0-6 5-10 6" stroke="rgba(0,0,0,.35)" stroke-linecap="round"/>
  </g>
</svg>
`);
const BALLOON_URL = `data:image/svg+xml;charset=utf-8,${BALLOON_SVG}`;

export default function MapView({ data, hour }: { data: any; hour: number }) {
  const [icon, setIcon] = useState<any>(null);

  // Set Leaflet defaults and create custom icon
  useEffect(() => {
    (async () => {
      const L = await import('leaflet');

      // ensure leaflet default assets are available if anything falls back
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      // custom balloon icon
      const size = 22; // tweak for density
      setIcon(
        L.icon({
          iconUrl: BALLOON_URL,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],   // centers icon on lat/lng
          popupAnchor: [0, -size / 2],
          className: 'wb-balloon-icon',
        })
      );
    })();

    // inject Leaflet CSS
    const id = 'leaflet-css';
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // a touch of CSS to keep icons crisp
    const cssId = 'wb-balloon-css';
    if (!document.getElementById(cssId)) {
      const style = document.createElement('style');
      style.id = cssId;
      style.textContent = `
        .wb-balloon-icon img { image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges; }
      `;
      document.head.appendChild(style);
    }
  }, []);

  const atTime = useMemo(() => {
    if (!data?.tracks) return [];
    const cutoff = Math.floor(Date.now() / 1000) - hour * 3600;

    const latest = data.tracks.map((tr: any) => {
      const pts = tr.points.filter((p: any) => p.t <= cutoff);
      const last = pts[pts.length - 1];
      return last ? { id: tr.id, ...last } : null;
    }).filter(Boolean) as Array<{ id: string; t: number; lat: number; lng: number; alt?: number }>;

    const valid = latest.filter(p =>
      Number.isFinite(p.lat) && Number.isFinite(p.lng) &&
      Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180 &&
      !(p.lat === 0 && p.lng === 0)
    );

    const seen = new Set<string>();
    const dedup = [];
    for (const p of valid) {
      const key = `${Math.round(p.lat * 1000)}|${Math.round(p.lng * 1000)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      dedup.push(p);
    }

    return dedup.slice(0, MAX_MARKERS);
  }, [data, hour]);

  return (
    <MapContainer center={[20, 0]} zoom={2} style={{ height: 520 }}>
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="© OpenStreetMap contributors"
        crossOrigin=""
      />
      {icon && atTime.map(p => (
        <Marker key={`${p.id}-${p.t}`} position={[p.lat, p.lng]} icon={icon}>
          <Popup>
            <div style={{ fontSize: 12 }}>
              <b>{p.id}</b><br />
              t: {new Date(p.t * 1000).toISOString()}<br />
              lat: {p.lat.toFixed(3)}, lng: {p.lng.toFixed(3)}{p.alt != null ? `, alt: ${p.alt}` : ''}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}