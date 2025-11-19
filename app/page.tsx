
'use client';
import dynamic from 'next/dynamic';
const MapView = dynamic(() => import('./components/MapView'), { ssr: false });

import { useCallback, useEffect, useMemo, useState } from 'react';
import Timebar from './components/Timebar';

export default function Page() {
  const [data, setData] = useState<any>(null);
  const [hour, setHour] = useState(0);
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const r = await fetch('/api/constellation', { cache: 'no-store' });
    const j = await r.json();
    setData(j);
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [load]);

  const count = useMemo(() => {
    if (!data?.tracks) return 0;
    const cutoff = Math.floor(Date.now() / 1000) - hour * 3600;
    return data.tracks.filter((tr: any) => tr.points.some((p: any) => p.t <= cutoff)).length;
  }, [data, hour]);

  return (
    <>
      <div className="header" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <b>WindBorne 24h Live</b>
        <Timebar onChange={setHour} />
        <span className="badge">{count} balloons</span>
      </div>

      <MapView data={data} hour={hour} />

      <div className="footer" style={{ display:'flex', gap:12, alignItems:'center', flexWrap:'wrap', marginTop: 8 }}>
        <input className="input" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="input" style={{ minWidth: 320 }} placeholder="Ask a question to the team" value={msg} onChange={e=>setMsg(e.target.value)} />
        <button className="button" onClick={async ()=>{
          const r = await fetch('/api/ask', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, message: msg }) });
          const j = await r.json();
          alert(j.ok ? 'Sent to WindBorne (200)' : `Not accepted (${j.status})`);
        }}>Send question</button>
      </div>
    </>
  );
}