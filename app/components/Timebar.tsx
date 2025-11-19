'use client';
export default function Timebar({ onChange }: { onChange: (h: number) => void }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, margin: '0 12px' }}>
      <span>now</span>
      <input type="range" min={0} max={23} defaultValue={0}
             onChange={e => onChange(Number(e.target.value))} />
      <span>{'Live'}</span>
    </div>
  );
}