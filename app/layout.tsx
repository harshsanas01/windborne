'use client';
import 'leaflet/dist/leaflet.css';
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html><body>{children}</body></html>;
}