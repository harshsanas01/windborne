Project name
WindBorne Constellation Explorer

One‑liner
Interactive map that pulls the last 24 hours of WindBorne balloon snapshots, cleans corrupted entries, derives per‑balloon tracks, enriches each hourly point with Open‑Meteo weather, and updates live.

Live behavior

Refreshes data every 60 seconds on the server and every 5 minutes on the client
Time slider scrubs up to 23 hours back
Robust to missing/corrupted JSON among the 24 WindBorne files
Tech stack

Next.js 14 (App Router) + React 18
API Routes for server data fetching/cleanup
Leaflet + react-leaflet for maps
TypeScript
Vercel for hosting
Data sources

WindBorne constellation snapshots: https://a.windbornesystems.com/treasure/{HH}.json
00.json is “now,” 01.json is 1 hour ago, ... up to 23.json
Files may be partially corrupted; parser skips bad rows and continues
Open‑Meteo Weather API: https://api.open-meteo.com/v1/forecast
Hourly variables used: temperature_2m, windspeed_10m
No API key, CORS enabled, HTTPS
Key features

Aggregates 24 hourly snapshots into per‑balloon tracks with derived metrics:
Haversine distance and drift speed between hourly positions
Per‑point surface temperature and wind speed from Open‑Meteo
Map visualizations:
Polylines for tracks with color ramp by drift speed
Circle markers with tooltip showing time, altitude, temp, wind
Time slider to reveal positions at a selected hour
