import { useId, useState } from 'react';
import { DISTRICTS, type DefenseId, type SimulationResult } from './simulation';
import { gameAudio } from './audio';

export function CityScene({ result, selected = [], weather = true, compact = false }: { result: SimulationResult; selected?: DefenseId[]; weather?: boolean; compact?: boolean }) {
  const [focus, setFocus] = useState(0);
  const sea = useId();
  const district = DISTRICTS[focus];
  return <div className={`living-city ${compact ? 'compact-city' : ''}`}>
    <svg viewBox="0 0 900 540" role="img" aria-label="Dört bölgeli izometrik şehir; su alanları hesaplanan hasarla orantılıdır">
      <defs><linearGradient id={sea} x2="0" y2="1"><stop stopColor="#143c58"/><stop offset="1" stopColor="#081421"/></linearGradient></defs>
      <rect width="900" height="540" fill={`url(#${sea})`}/>
      {Array.from({length:14},(_,i)=><path key={i} d={`M${i*73-80} ${400+i%3*25}l100 45`} stroke="#4cbacb" opacity=".12"/>)}
      <path d="M450 90 850 300 450 510 50 300Z" fill="#122b3a" stroke="#3d6575" strokeWidth="3"/>
      <path d="M50 300 450 510 850 300v22L450 532 50 322Z" fill="#09131e"/>
      {DISTRICTS.map((d,i)=>{
        const [x,y]=[[245,240],[450,135],[450,345],[655,240]][i];
        const impact=result.districts[i];
        return <g key={d.id} transform={`translate(${x},${y})`} className={`city-sector ${focus===i?'focused':''}`} onMouseEnter={()=>setFocus(i)} onClick={()=>{setFocus(i);gameAudio.effect('hover')}}>
          <path d="M0-80 180 12 0 104-180 12Z" fill={i===2?'#223e40':'#253a4c'} stroke={d.color} strokeOpacity=".4"/>
          <path d="M-160 12H160M0-65v145" stroke="#657b86" strokeWidth="9"/>
          <path d="M-160 12H160" stroke="#dab98d" strokeDasharray="4 10" opacity=".5"/>
          {Array.from({length:8},(_,j)=>{
            const bx=(j%4-1.5)*47, by=Math.floor(j/4)*47-23, h=24+(i*7+j*13)%38;
            const renewed=selected.includes('dönüşüm');
            return <g key={j} transform={`translate(${bx},${by})`} className="iso-building">
              <path d={`M-15 0v-${h}l27 13v${h}Z`} fill={renewed?'#417f85':'#3a5264'}/>
              <path d={`M12 13v-${h}l15-8v${h}Z`} fill={renewed?'#26566c':'#23384c'}/>
              <path d={`M-15 -${h}l15-8 27 13-15 8Z`} fill={renewed?'#82cbb6':'#80939a'}/>
              {[0,1,2].map(k=><path key={k} d={`M-10 ${-h+8+k*8}l16 8`} stroke={impact.damage>95&&j%2===0?'#263b50':'#ffc686'} strokeWidth="2"/>)}
              {renewed&&<path d={`M-15 -${h}l27 13`} stroke="#a1ffe2" strokeWidth="3"/>}
            </g>;
          })}
          <ellipse data-damage={impact.damage} className="flood-surface" cx="0" cy="36" rx={Math.min(164,impact.damage*1.35)} ry={Math.min(60,impact.damage*.46)} fill="#42adcf" opacity={.13+impact.damage/500}/>
          {selected.includes('sünger')&&[-100,90].map(p=><g key={p} transform={`translate(${p},15)`}><ellipse rx="24" ry="11" fill="#3cbb9c"/><path d="M0 0v-27" stroke="#83d0a1" strokeWidth="5"/><circle cy="-26" r="12" fill="#397e69"/></g>)}
          {selected.includes('set')&&i===0&&<path d="M-160 48-30 115 115 45" fill="none" stroke="#e4b38d" strokeWidth="10"/>}
          {selected.includes('uyarı')&&<g className="signal-tower" transform="translate(0,-45)"><path d="M0 0v-50" stroke="#bcb4f9" strokeWidth="4"/><circle cy="-50" r="5" fill="#bca4ff"/><path d="M-16-60q16-20 32 0M-25-67q25-30 50 0" fill="none" stroke="#a698ff" strokeWidth="2"/></g>}
          <text y="112" textAnchor="middle" fill="#e1ebeb" fontSize="12">{d.name}</text>
        </g>;
      })}
    </svg>
    {weather&&<div className="weather-rain" aria-hidden="true"/>}
    {!compact&&<><div className="district-tabs" aria-label="Bölge seçimi">{DISTRICTS.map((d,i)=><button key={d.id} aria-pressed={focus===i} onMouseEnter={()=>setFocus(i)} onFocus={()=>setFocus(i)} onClick={()=>setFocus(i)}>{d.name}</button>)}</div><div className="district-intel" aria-live="polite"><strong>{district.name}</strong><span>{district.subtitle} · Maruziyet {district.exposure} · Kırılganlık {district.vulnerability}</span><span>Altyapı hasarı: {result.districts[focus].damage} puan · Güvenlik: %{result.districts[focus].safety}</span></div></>}
  </div>;
}
