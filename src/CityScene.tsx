import { useId, useState } from 'react';
import { DISTRICTS, DEFENSES, type DefenseId, type SimulationResult } from './simulation';
import { gameAudio } from './audio';
import { type SpatialSimulationState } from './spatialSimulation';

export interface LandmarkInfo {
  id: string;
  name: string;
  district: string;
  type: string;
  status: string;
  description: string;
  riskFactor: string;
  recommendedDefense: string;
}

interface CitySceneProps {
  result: SimulationResult;
  selected?: DefenseId[];
  weather?: boolean;
  compact?: boolean;
  spatialState?: SpatialSimulationState;
  onToggleDefense?: (id: DefenseId) => void;
  activePlacementTool?: DefenseId | null;
  onSelectPlacementTool?: (id: DefenseId | null) => void;
  isPlanningMode?: boolean;
}

export function CityScene({
  result,
  selected = [],
  weather = true,
  compact = false,
  spatialState,
  onToggleDefense,
  activePlacementTool,
  onSelectPlacementTool,
  isPlanningMode = false,
}: CitySceneProps) {
  const [focus, setFocus] = useState(0);
  const [inspectedLandmark, setInspectedLandmark] = useState<LandmarkInfo | null>(null);
  const uid = useId().replace(/:/g, '');
  const district = DISTRICTS[focus];

  const has = (id: DefenseId) => selected.includes(id);
  const isStormy = weather;

  // Hastane Yolu Taşkın Durumu:
  // Eğer spatialState varsa oradan al; yoksa seçilen savunmalara göre hesapla
  const hospitalRoadPassable = spatialState
    ? spatialState.hospitalRoadPassable
    : (has('sünger') || has('dönüşüm'));

  const hospitalRoadWaterDepth = spatialState
    ? spatialState.hospitalRoadWaterDepth
    : has('sünger') && has('dönüşüm')
    ? 12.0
    : has('sünger')
    ? 18.5
    : has('dönüşüm')
    ? 22.0
    : 38.5; // Savunmasız durumda 38.5 cm > 30 cm eşik

  const handleLandmarkClick = (landmark: LandmarkInfo) => {
    setInspectedLandmark(landmark);
    gameAudio.effect('click');
  };

  return (
    <div className={`living-city ${compact ? 'compact-city' : ''} ${isStormy ? 'city-storm-active' : ''}`}>
      {/* 1. TACTICAL REAL-TIME STATUS HUD (Only in full/interactive mode) */}
      {!compact && (
        <div className="city-tactical-hud">
          <div className="hud-left">
            <div className={`hud-badge ${hospitalRoadPassable ? 'badge-passable' : 'badge-blocked'}`}>
              <span className="hud-indicator-dot" />
              <span className="hud-badge-title">HASTANE ERİŞİM YOLU:</span>
              <strong className="hud-badge-status">
                {hospitalRoadPassable ? 'ULAŞIMA AÇIK' : '⛔ GEÇİLEMEZ (SU ALTINDA)'}
              </strong>
              <span className="hud-depth-tag">Derinlik: {hospitalRoadWaterDepth} cm / Eşik: 30 cm</span>
            </div>
          </div>

          <div className="hud-right">
            {spatialState && (
              <div className="hud-time-tag">
                <span>SIM ZAMANI:</span> <b>{spatialState.timeString}</b>
                <small className="hud-rainfall-rate">{spatialState.rainfallRate} mm/h</small>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. MAIN 2.5D ISOMETRIC CITY CANVAS */}
      <svg
        viewBox="0 0 960 580"
        role="img"
        aria-label="ŞEHRİN YARINI — Yaşayan izometrik şehir simülasyonu"
        className="city-viewport-svg"
      >
        <defs>
          {/* Water Gradients */}
          <linearGradient id={`ocean-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#081827" />
            <stop offset="50%" stopColor="#0c2336" />
            <stop offset="100%" stopColor="#05101a" />
          </linearGradient>

          <linearGradient id={`floodGrad-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3ca8c8" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#1a556d" stopOpacity="0.9" />
          </linearGradient>

          <linearGradient id={`roadWaterGrad-${uid}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ff4d4d" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#25647a" stopOpacity="0.85" />
          </linearGradient>

          <linearGradient id={`terrainGrad-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1a3243" />
            <stop offset="50%" stopColor="#142838" />
            <stop offset="100%" stopColor="#0f1f2d" />
          </linearGradient>

          {/* District Highlights */}
          <radialGradient id={`glow-${uid}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#55d4c8" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#55d4c8" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ocean Background */}
        <rect width="960" height="580" fill={`url(#ocean-${uid})`} />

        {/* Ambient Sea Currents & Waves */}
        <g className="sea-currents" opacity="0.4">
          <path d="M20 440 Q 140 420, 260 450 T 500 460" stroke="#378299" strokeWidth="2" fill="none" opacity="0.3" strokeDasharray="8 12" />
          <path d="M60 480 Q 200 460, 340 490 T 580 500" stroke="#48b0cc" strokeWidth="1.5" fill="none" opacity="0.4" strokeDasharray="6 8" />
          <path d="M0 520 Q 180 500, 360 530 T 720 540" stroke="#25647a" strokeWidth="2.5" fill="none" opacity="0.25" />
        </g>

        {/* Island Base 3D Drop Extrusion */}
        <path d="M80 320 L 480 530 L 880 320 v 30 L 480 560 L 80 350 Z" fill="#09141f" />
        <path d="M80 350 L 480 560 L 880 350 v 14 L 480 574 L 80 364 Z" fill="#050b12" />

        {/* Island Top Surface */}
        <path
          d="M 480 100 L 880 310 L 480 520 L 80 310 Z"
          fill={`url(#terrainGrad-${uid})`}
          stroke="#2d4b60"
          strokeWidth="2.5"
        />

        {/* Geological Contours */}
        <path d="M 480 115 L 850 310 L 480 505 L 110 310 Z" fill="none" stroke="#223a4b" strokeWidth="1" strokeDasharray="4 6" opacity="0.6" />

        {/* Arterial Roadways */}
        <g className="city-arterials">
          {/* NW to SE Avenue */}
          <path d="M 270 200 L 690 420" stroke="#1d2e3d" strokeWidth="18" strokeLinecap="round" />
          <path d="M 270 200 L 690 420" stroke={has('dönüşüm') ? '#3ccbb5' : '#88a4b6'} strokeWidth="2" strokeDasharray="6 8" opacity={has('dönüşüm') ? '0.9' : '0.4'} />

          {/* SW to NE Avenue */}
          <path d="M 270 420 L 690 200" stroke="#1d2e3d" strokeWidth="18" strokeLinecap="round" />
          <path d="M 270 420 L 690 200" stroke={has('dönüşüm') ? '#3ccbb5' : '#88a4b6'} strokeWidth="2" strokeDasharray="6 8" opacity={has('dönüşüm') ? '0.9' : '0.4'} />

          {/* Central Junction Hub */}
          <ellipse cx="480" cy="310" rx="46" ry="24" fill="#182736" stroke={has('dönüşüm') ? '#3ccbb5' : '#3d5c70'} strokeWidth="2" />
          <ellipse cx="480" cy="310" rx="28" ry="14" fill="#12202c" />

          {/* Güvenli Dönüşüm Tahliye Koridoru Işıkları */}
          {has('dönüşüm') && (
            <g className="evacuation-lights" opacity="0.85">
              {[
                [320, 226], [380, 258], [440, 289], [520, 331], [580, 363], [640, 394],
                [320, 394], [380, 363], [440, 331], [520, 289], [580, 258], [640, 226],
              ].map(([lx, ly], idx) => (
                <circle key={idx} cx={lx} cy={ly} r="3" fill="#64fcd9">
                  <animate attributeName="opacity" values="0.3;1;0.3" dur="1.8s" begin={`${idx * 0.15}s`} repeatCount="indefinite" />
                </circle>
              ))}
            </g>
          )}

          {/* Sünger Kent Bio-kanalları ve Yağmur Bahçeleri */}
          {has('sünger') && (
            <g className="bioswale-network">
              <path d="M 290 190 L 670 390" stroke="#2da382" strokeWidth="5" strokeDasharray="14 8" opacity="0.85" />
              <path d="M 290 430 L 670 230" stroke="#2da382" strokeWidth="5" strokeDasharray="14 8" opacity="0.85" />
              <ellipse cx="480" cy="310" rx="18" ry="9" fill="#289b7b" opacity="0.85" />
              <circle cx="474" cy="308" r="4" fill="#3cd4a8" />
              <circle cx="486" cy="311" r="3" fill="#3cd4a8" />
            </g>
          )}
        </g>

        {/* 3. FOUR DISTINCT DISTRICTS & ARCHITECTURE */}
        {DISTRICTS.map((d, i) => {
          const coords = [
            [260, 305], // Kıyı
            [480, 190], // Merkez
            [480, 420], // Yamaç (Hastane burada)
            [700, 305], // Sanayi
          ][i];
          const [dx, dy] = coords;
          const impact = result.districts[i];
          const isFocused = focus === i;
          const isSeverelyDamaged = impact.damage > 90;
          const isFlooded = impact.flooded;

          return (
            <g
              key={d.id}
              className={`city-sector sector-${d.id} ${isFocused ? 'focused' : ''}`}
              transform={`translate(${dx}, ${dy})`}
              onMouseEnter={() => setFocus(i)}
              onClick={() => {
                setFocus(i);
                gameAudio.effect('hover');
              }}
            >
              {/* District Base Diamond */}
              <path
                d="M 0 -85 L 180 8 L 0 102 L -180 8 Z"
                fill={isFocused ? '#1d3b4e' : i === 2 ? '#182f3c' : '#172c3d'}
                stroke={isFocused ? '#8be7d6' : d.color}
                strokeWidth={isFocused ? '2.5' : '1'}
                strokeOpacity={isFocused ? '0.9' : '0.35'}
                className="district-ground"
              />

              <path d="M -130 8 L 130 8 M 0 -60 L 0 76" stroke="#2a4557" strokeWidth="1" strokeDasharray="3 5" opacity="0.4" />

              {/* === DISTRICT 0: KIYI MAHALLESİ === */}
              {i === 0 && (
                <g className="district-kıyı-architecture">
                  {/* Harbor Pier Landmark (Clickable) */}
                  <g
                    className="clickable-landmark landmark-harbor"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLandmarkClick({
                        id: 'liman_rihtim',
                        name: 'Liman & Sahil Rıhtımı',
                        district: 'Kıyı Mahallesi',
                        type: 'Lojistik & Ticari Liman',
                        status: has('set') ? 'Kıyı Setiyle Korunuyor' : 'Deniz Kabarması Tehdidi Altında',
                        description: 'Şehrin ana tedarik ve balıkçı limanı. Deniz seviyesine en yakın bölge (Kot: 1).',
                        riskFactor: 'Maruziyet 1.18 — fırtına dalgaları doğrudan rıhtım betonunu aşmaktadır.',
                        recommendedDefense: 'Kıyı Seti (Dalgakıran ve Taşkın Bariyeri)',
                      });
                    }}
                  >
                    <path d="M -160 30 L -90 -8 L -60 7 L -130 45 Z" fill="#1b2834" stroke="#3c5061" strokeWidth="1" />
                    <path d="M -160 30 v 14 L -130 59 v -14 Z" fill="#0d1720" />
                    {/* Gantry Crane */}
                    <path d="M -112 5 L -106 -15 L -100 5 M -106 -15 L -106 -38 L -86 -52 M -106 -38 L -118 -44" stroke="#f49a60" strokeWidth="2.5" fill="none" />
                    <line x1="-94" y1="-47" x2="-94" y2="-24" stroke="#cf814a" strokeWidth="1" strokeDasharray="2 2" />
                    <rect x="-98" y="-24" width="8" height="7" fill="#3ccbb5" rx="1" />
                    {/* Container Stacks */}
                    <rect x="-80" y="3" width="16" height="10" fill="#3da6b6" stroke="#1f5861" strokeWidth="1" />
                    <rect x="-62" y="5" width="16" height="10" fill="#f49a60" stroke="#8c4e27" strokeWidth="1" />
                  </g>

                  {/* Coastal Promenade Residences */}
                  {[
                    { bx: -20, by: -35, h: 38, w: 26, c: '#2e495c' },
                    { bx: 20, by: -45, h: 46, w: 28, c: '#34556a' },
                    { bx: 55, by: -20, h: 42, w: 24, c: '#2b4455' },
                    { bx: -10, by: 10, h: 32, w: 24, c: '#365366' },
                    { bx: 35, by: 12, h: 36, w: 26, c: '#2d4b5f' },
                  ].map((b, idx) => (
                    <g key={idx} transform={`translate(${b.bx}, ${b.by})`} className="coastal-building">
                      <path d={`M -${b.w / 2} 0 v -${b.h} l ${b.w * 0.55} 7 v ${b.h} Z`} fill={has('dönüşüm') ? '#2e6b72' : b.c} />
                      <path d={`M ${b.w * 0.05} 7 v -${b.h} l ${b.w * 0.55} -7 v ${b.h} Z`} fill={has('dönüşüm') ? '#1c494f' : '#1f3342'} />
                      <path
                        d={`M -${b.w / 2} -${b.h} l ${b.w * 0.55} 7 l ${b.w * 0.55} -7 l -${b.w * 0.55} -7 Z`}
                        fill={has('sünger') ? '#2ba883' : has('dönüşüm') ? '#67dbc4' : '#69889d'}
                      />
                      {[0, 1, 2].map((wIdx) => (
                        <line
                          key={wIdx}
                          x1={-b.w / 3}
                          y1={-b.h + 10 + wIdx * 8}
                          x2={b.w / 6}
                          y2={-b.h + 13 + wIdx * 8}
                          stroke={isSeverelyDamaged && wIdx === 1 ? '#0e1b24' : '#fedb9b'}
                          strokeWidth="2"
                        />
                      ))}
                    </g>
                  ))}

                  {/* DEFENSE: COASTAL SEA WALL (Kıyı Seti) */}
                  {has('set') && (
                    <g className="coastal-seawall">
                      <path
                        d="M -170 32 L -80 -12 L -40 8 L 10 32"
                        stroke="#e2b083"
                        strokeWidth="12"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                      <path
                        d="M -170 32 L -80 -12 L -40 8 L 10 32"
                        stroke="#453120"
                        strokeWidth="3"
                        strokeDasharray="6 8"
                        fill="none"
                      />
                      {[-140, -100, -60, -20].map((bx, bIdx) => (
                        <g key={bIdx} transform={`translate(${bx}, ${10 + bIdx * 2})`}>
                          <rect x="-4" y="-12" width="8" height="14" fill="#f4b57b" rx="2" stroke="#251608" strokeWidth="1" />
                          <circle cx="0" cy="-14" r="2.5" fill="#46f6d2" />
                        </g>
                      ))}
                    </g>
                  )}
                </g>
              )}

              {/* === DISTRICT 1: ESKİ MERKEZ === */}
              {i === 1 && (
                <g className="district-merkez-architecture">
                  <ellipse cx="0" cy="5" rx="55" ry="28" fill="#203443" stroke="#3b596d" strokeWidth="1" />

                  {/* Historic Clocktower Landmark (Clickable) */}
                  <g
                    className="clickable-landmark landmark-clocktower"
                    transform="translate(-45, -30)"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLandmarkClick({
                        id: 'saat_kulesi',
                        name: 'Eski Merkez Saat Kulesi & Meydan',
                        district: 'Eski Merkez',
                        type: 'Tarihi Miras & Kamusal Alan',
                        status: 'Taşkın Duyarlı Çukur Havza',
                        description: '1890 yapımı tarihi kentsel anıt. Çevreleyen sokaklar su tutmaya yatkındır.',
                        riskFactor: 'Kırılganlık 1.22 — zemin seviyesinde biriken su yapı taşlarına işler.',
                        recommendedDefense: 'Sünger Kent (Geçirgen Taş Kaplama) veya Güvenli Dönüşüm',
                      });
                    }}
                  >
                    <path d="M -12 0 v -65 l 14 7 v 65 Z" fill={has('dönüşüm') ? '#336166' : '#453835'} />
                    <path d="M 2 7 v -65 l 14 -7 v 65 Z" fill={has('dönüşüm') ? '#244549' : '#2b2321'} />
                    <path d="M -12 -65 l 14 7 l 14 -7 L 2 -100 Z" fill="#c97e5d" stroke="#6b3e2b" strokeWidth="1" />
                    <circle cx="2" cy="-58" r="5" fill="#fdeec8" />
                    <line x1="2" y1="-58" x2="4" y2="-60" stroke="#35261d" strokeWidth="1.5" />
                    <line x1="2" y1="-100" x2="2" y2="-108" stroke="#f6c27f" strokeWidth="2" />
                    <circle cx="2" cy="-108" r="2" fill="#ffd599" />
                  </g>

                  {/* Historic Townhouses */}
                  {[
                    { bx: -15, by: -45, h: 36, w: 26, c: '#485563' },
                    { bx: 25, by: -40, h: 42, w: 28, c: '#404c59' },
                    { bx: 55, by: -15, h: 34, w: 24, c: '#3b4754' },
                    { bx: -50, by: 15, h: 30, w: 24, c: '#424f5d' },
                    { bx: 35, by: 18, h: 32, w: 26, c: '#3a4652' },
                  ].map((b, idx) => (
                    <g key={idx} transform={`translate(${b.bx}, ${b.by})`} className="historic-house">
                      <path d={`M -${b.w / 2} 0 v -${b.h} l ${b.w * 0.55} 6 v ${b.h} Z`} fill={has('dönüşüm') ? '#2d6368' : b.c} />
                      <path d={`M ${b.w * 0.05} 6 v -${b.h} l ${b.w * 0.55} -6 v ${b.h} Z`} fill={has('dönüşüm') ? '#1e4448' : '#27313a'} />
                      <path
                        d={`M -${b.w / 2} -${b.h} l ${b.w * 0.55} 6 l ${b.w * 0.55} -6 l -${b.w * 0.55} -10 Z`}
                        fill={has('sünger') ? '#2ba883' : '#d27c62'}
                      />
                      {[0, 1].map((wIdx) => (
                        <rect key={wIdx} x={-b.w / 3 + wIdx * 10} y={-b.h + 10} width="5" height="8" rx="2" fill={isSeverelyDamaged ? '#1c2830' : '#ffdca3'} />
                      ))}
                    </g>
                  ))}
                </g>
              )}

              {/* === DISTRICT 2: YAMAÇ EVLERİ & HASTANE SENARYOSU === */}
              {i === 2 && (
                <g className="district-yamac-architecture">
                  {/* Stepped Terraces */}
                  <path d="M -120 -20 L 0 -70 L 120 -20 L 0 30 Z" fill="#1e343a" stroke="#2e5058" strokeWidth="1" />
                  <path d="M -140 10 L 0 -45 L 140 10 L 0 65 Z" fill="#172b31" stroke="#25434a" strokeWidth="1" />

                  {/* Retaining Wall Strata */}
                  <path d="M -120 -20 v 10 L 0 40 v -10 Z" fill="#132328" />
                  <path d="M 0 40 v -10 L 120 -10 v 10 Z" fill="#0d181b" />

                  {/* CRITICAL HOSPITAL ACCESS ROAD (Hastane Erişim Yolu) */}
                  <g
                    className="critical-road-corridor"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLandmarkClick({
                        id: 'hastane_yolu',
                        name: 'Hastane Acil Erişim Yolu',
                        district: 'Yamaç Evleri',
                        type: 'Kritik Ulaşım Güzergahı',
                        status: hospitalRoadPassable ? `ULAŞIMA AÇIK (${hospitalRoadWaterDepth} cm)` : `⛔ GEÇİLEMEZ (${hospitalRoadWaterDepth} cm > 30 cm)`,
                        description: 'Yamaç vadisinden hastaneye ulaşan tek acil servis koridoru.',
                        riskFactor: 'Şiddetli yağışta yamaç sırtından inen sular bu noktada çukur havza oluşturur.',
                        recommendedDefense: 'Sünger Kent (Teras Havzası) ile akışı yukarıda tut veya Güvenli Dönüşüm menfezleri ekle.',
                      });
                    }}
                  >
                    {/* Winding Road Surface connecting center to hospital */}
                    <path
                      d="M -70 52 Q -20 32, 0 10 T 20 -15"
                      stroke={has('dönüşüm') ? '#3ccbb5' : '#4a6070'}
                      strokeWidth="14"
                      strokeLinecap="round"
                      fill="none"
                    />
                    <path
                      d="M -70 52 Q -20 32, 0 10 T 20 -15"
                      stroke={hospitalRoadPassable ? '#8ae7d6' : '#ff4d4d'}
                      strokeWidth="2"
                      strokeDasharray="4 6"
                      fill="none"
                    />

                    {/* Water Accumulation on Road Dip (Visible Flood Progression) */}
                    <ellipse
                      cx="-15"
                      cy="22"
                      rx={Math.min(42, Math.max(12, hospitalRoadWaterDepth * 1.1))}
                      ry={Math.min(18, Math.max(5, hospitalRoadWaterDepth * 0.45))}
                      fill={hospitalRoadPassable ? '#3ca8c8' : '#e04a43'}
                      opacity={Math.min(0.85, 0.25 + hospitalRoadWaterDepth / 60)}
                      className="road-water-pool"
                    />

                    {/* Road Status Warning Barrier when Impassable */}
                    {!hospitalRoadPassable && (
                      <g transform="translate(-15, 12)" className="road-barrier-alarm">
                        <rect x="-24" y="-8" width="48" height="12" rx="2" fill="#d93838" stroke="#ffffff" strokeWidth="1" />
                        <text x="0" y="1" textAnchor="middle" fill="#ffffff" fontSize="7" fontWeight="bold">⛔ GEÇİLEMEZ</text>
                      </g>
                    )}

                    {/* Road Depth Label */}
                    <g transform="translate(-15, 34)">
                      <rect x="-28" y="-7" width="56" height="13" rx="2" fill="#081420" fillOpacity="0.85" stroke="#3d6575" strokeWidth="0.8" />
                      <text x="0" y="2" textAnchor="middle" fill={hospitalRoadPassable ? '#78ffd6' : '#ff7b72'} fontSize="8" fontFamily="'DM Mono', monospace">
                        {hospitalRoadWaterDepth} cm
                      </text>
                    </g>
                  </g>

                  {/* ANIMATED EMERGENCY AMBULANCE */}
                  <g
                    className={`emergency-ambulance ${hospitalRoadPassable ? 'ambulance-moving' : 'ambulance-blocked'}`}
                    transform={hospitalRoadPassable ? 'translate(10, -5)' : 'translate(-50, 42)'}
                  >
                    {/* Vehicle Body */}
                    <rect x="-10" y="-6" width="20" height="10" rx="2" fill="#f8fafc" stroke="#1e293b" strokeWidth="1" />
                    {/* Windshield */}
                    <rect x="3" y="-5" width="5" height="8" rx="1" fill="#38bdf8" />
                    {/* Red Cross on Side */}
                    <rect x="-5" y="-4" width="6" height="2" fill="#ef4444" />
                    <rect x="-3" y="-6" width="2" height="6" fill="#ef4444" />
                    {/* Strobe Light */}
                    <circle cx="-1" cy="-7" r="2" fill={hospitalRoadPassable ? '#38bdf8' : '#f59e0b'}>
                      <animate attributeName="opacity" values="0.3;1;0.3" dur="0.6s" repeatCount="indefinite" />
                    </circle>
                  </g>

                  {/* EMERGENCY HOSPITAL COMPLEX (Clickable) */}
                  <g
                    className="clickable-landmark landmark-hospital"
                    transform="translate(0, -35)"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLandmarkClick({
                        id: 'hastane',
                        name: 'Şehir Acil Durum Hastanesi & Helipad',
                        district: 'Yamaç Evleri',
                        type: 'Kritik Sağlık Altyapısı',
                        status: hospitalRoadPassable ? 'Erişilebilir (Acil Servis Aktif)' : 'Kritik Durum: Kara Yolu Kesildi!',
                        description: '400 yataklı bölge hastanesi. Doğal afet durumunda triyaj merkezi olarak işlev görür.',
                        riskFactor: 'Hastane binası yüksek kottadır ancak tek erişim yolu taşkın yatağındadır.',
                        recommendedDefense: 'Sünger Kent (Yağmur Bahçesi) veya Güvenli Dönüşüm (Yükseltilmiş Menfez)',
                      });
                    }}
                  >
                    <path d="M -26 0 v -36 l 32 14 v 36 Z" fill={has('dönüşüm') ? '#30717b' : '#395763'} />
                    <path d="M 6 14 v -36 l 28 -12 v 36 Z" fill={has('dönüşüm') ? '#1e484f' : '#273b43'} />
                    <path d="M -26 -36 l 32 14 l 28 -12 l -32 -14 Z" fill={has('sünger') ? '#2ba883' : '#e8edf0'} stroke="#8fa8b5" strokeWidth="1" />
                    {/* Helipad */}
                    <ellipse cx="2" cy="-35" rx="12" ry="6" fill="#2d424b" stroke="#ffffff" strokeWidth="1" />
                    <text x="2" y="-32" textAnchor="middle" fill="#ffffff" fontSize="7" fontWeight="bold">H</text>
                    {/* Red Cross */}
                    <g transform="translate(6, -14)">
                      <rect x="-6" y="-2" width="12" height="4" fill="#ff4d4d" rx="1" />
                      <rect x="-2" y="-6" width="4" height="12" fill="#ff4d4d" rx="1" />
                    </g>
                  </g>

                  {/* Hillside Residential Villas */}
                  {[
                    { bx: -55, by: -20, h: 28, w: 24, c: '#3b5157' },
                    { bx: 55, by: -15, h: 32, w: 26, c: '#364b50' },
                    { bx: 35, by: 25, h: 30, w: 24, c: '#32454a' },
                  ].map((b, idx) => (
                    <g key={idx} transform={`translate(${b.bx}, ${b.by})`} className="hillside-house">
                      <path d={`M -${b.w / 2} 0 v -${b.h} l ${b.w * 0.55} 5 v ${b.h} Z`} fill={has('dönüşüm') ? '#2e6b72' : b.c} />
                      <path d={`M ${b.w * 0.05} 5 v -${b.h} l ${b.w * 0.55} -5 v ${b.h} Z`} fill={has('dönüşüm') ? '#1e484f' : '#223237'} />
                      <path
                        d={`M -${b.w / 2} -${b.h} l ${b.w * 0.55} 5 l ${b.w * 0.55} -5 l -${b.w * 0.55} -5 Z`}
                        fill={has('sünger') ? '#2ba883' : '#d28972'}
                      />
                    </g>
                  ))}
                </g>
              )}

              {/* === DISTRICT 3: SANAYİ KORİDORU === */}
              {i === 3 && (
                <g className="district-sanayi-architecture">
                  <path d="M -80 -20 Q -30 -40, 20 -20 T 70 -30" stroke="#52687c" strokeWidth="4" fill="none" opacity="0.7" />

                  {/* Substation Landmark (Clickable) */}
                  <g
                    className="clickable-landmark landmark-substation"
                    transform="translate(35, -30)"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLandmarkClick({
                        id: 'sanayi_trafo',
                        name: 'Sanayi Depoları & Trafo İstasyonu',
                        district: 'Sanayi Koridoru',
                        type: 'Enerji & Lojistik Altyapısı',
                        status: 'Kritik Şebeke Risk Bölgesi',
                        description: 'Şehrin ana enerji indirici trafoları ve endüstriyel stoklama depoları.',
                        riskFactor: 'Maruziyet 1.04 — su seviyesi yükseldiğinde elektrik kesintisi tetiklenir.',
                        recommendedDefense: 'Erken Uyarı Ağı (Şebeke Koruması) veya Güvenli Dönüşüm',
                      });
                    }}
                  >
                    <ellipse cx="-12" cy="0" rx="14" ry="7" fill="#1b252f" />
                    <path d="M -26 0 v -36 a 14 7 0 0 1 28 0 v 36 Z" fill="#4d6174" stroke="#253543" strokeWidth="1" />
                    <ellipse cx="-12" cy="-36" rx="14" ry="7" fill="#6a829a" />

                    <ellipse cx="14" cy="10" rx="12" ry="6" fill="#1b252f" />
                    <path d="M 2 10 v -32 a 12 6 0 0 1 24 0 v 32 Z" fill="#435567" stroke="#202e3b" strokeWidth="1" />
                    <ellipse cx="14" cy="-22" rx="12" ry="6" fill="#5a7086" />
                  </g>

                  {/* Sawtooth Factory */}
                  <g transform="translate(-40, -35)" className="sawtooth-factory">
                    <path d="M -24 0 v -30 l 16 8 v -8 l 16 8 v -8 l 16 8 v 30 Z" fill={has('dönüşüm') ? '#2c5965' : '#33414d'} />
                    <path d="M 24 8 v -30 l 14 -7 v 30 Z" fill={has('dönüşüm') ? '#1b3840' : '#212b33'} />
                    <rect x="18" y="-48" width="6" height="24" fill="#a4614d" />
                  </g>

                  {/* Logistics Warehouse */}
                  {[
                    { bx: -45, by: 15, h: 22, w: 34, c: '#3a4957' },
                    { bx: 15, by: 20, h: 24, w: 32, c: '#32404e' },
                  ].map((b, idx) => (
                    <g key={idx} transform={`translate(${b.bx}, ${b.by})`} className="logistics-warehouse">
                      <path d={`M -${b.w / 2} 0 v -${b.h} l ${b.w * 0.55} 6 v ${b.h} Z`} fill={has('dönüşüm') ? '#285b63' : b.c} />
                      <path d={`M ${b.w * 0.05} 6 v -${b.h} l ${b.w * 0.55} -6 v ${b.h} Z`} fill={has('dönüşüm') ? '#193c41' : '#1e2730'} />
                      <path
                        d={`M -${b.w / 2} -${b.h} l ${b.w * 0.55} 6 l ${b.w * 0.55} -6 l -${b.w * 0.55} -6 Z`}
                        fill={has('sünger') ? '#2ba883' : '#6c8194'}
                      />
                      <rect x={-b.w / 4} y={-12} width={12} height={12} fill="#182129" stroke="#f49a60" strokeWidth="1" />
                    </g>
                  ))}
                </g>
              )}

              {/* 4. FLOOD WATER SURFACE (CRITICAL FOR TESTS & SPATIAL FEEDBACK) */}
              <ellipse
                data-damage={impact.damage}
                className={`flood-surface ${isFlooded ? 'surface-flooded' : ''}`}
                cx="0"
                cy="32"
                rx={Math.min(160, Math.max(20, impact.damage * 1.32))}
                ry={Math.min(62, Math.max(10, impact.damage * 0.45))}
                fill={`url(#floodGrad-${uid})`}
                opacity={Math.min(0.85, 0.15 + impact.damage / 320)}
              />

              {/* Flood Ripples */}
              {isFlooded && (
                <g className="flood-ripples" opacity="0.6">
                  <ellipse cx="0" cy="32" rx={Math.min(130, impact.damage * 1.05)} ry={Math.min(48, impact.damage * 0.36)} fill="none" stroke="#7be3ff" strokeWidth="1.5" strokeDasharray="8 12" />
                  <ellipse cx="0" cy="32" rx={Math.min(80, impact.damage * 0.65)} ry={Math.min(30, impact.damage * 0.22)} fill="none" stroke="#a3efff" strokeWidth="1" strokeDasharray="6 8" />
                </g>
              )}

              {/* Severe Damage Hazard Beacon */}
              {isSeverelyDamaged && (
                <g transform="translate(0, -65)" className="hazard-beacon">
                  <circle cx="0" cy="0" r="4" fill="#ff4d4d">
                    <animate attributeName="opacity" values="0.2;1;0.2" dur="0.8s" repeatCount="indefinite" />
                  </circle>
                  <circle cx="0" cy="0" r="10" fill="none" stroke="#ff4d4d" strokeWidth="1.5" opacity="0.5">
                    <animate attributeName="r" values="4;18" dur="1.2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.8;0" dur="1.2s" repeatCount="indefinite" />
                  </circle>
                </g>
              )}

              {/* 5. DEFENSE VISUAL: EARLY WARNING SENSORS (.signal-tower) */}
              {has('uyarı') && (
                <g className="signal-tower" transform="translate(0, -50)">
                  <path d="M 0 0 v -56" stroke="#bca4ff" strokeWidth="4" />
                  <path d="M -12 0 L 0 -36 L 12 0" stroke="#9980e6" strokeWidth="2" />
                  <line x1="-8" y1="-18" x2="8" y2="-18" stroke="#9980e6" strokeWidth="1.5" />
                  <circle cy="-56" r="6" fill="#c4afff" />
                  <path d="M -10 -64 Q 0 -58 10 -64" stroke="#8ae7d6" strokeWidth="2.5" fill="none" />
                  <circle cy="-56" r="12" fill="none" stroke="#bca4ff" strokeWidth="1.5" opacity="0.7">
                    <animate attributeName="r" values="6;28" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.8;0" dur="2s" repeatCount="indefinite" />
                  </circle>
                  <circle cy="-56" r="20" fill="none" stroke="#8ae7d6" strokeWidth="1" opacity="0.4">
                    <animate attributeName="r" values="10;42" dur="2s" begin="0.6s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.6;0" dur="2s" begin="0.6s" repeatCount="indefinite" />
                  </circle>
                </g>
              )}

              {/* 6. DEFENSE VISUAL: SPONGE-CITY SURFACE ADAPTATIONS */}
              {has('sünger') && (
                <g className="sponge-adaptations" transform="translate(0, 10)">
                  {[-75, 75].map((pos, pIdx) => (
                    <g key={pIdx} transform={`translate(${pos}, ${pIdx === 0 ? -15 : 15})`}>
                      <ellipse rx="22" ry="10" fill="#2d967b" stroke="#48dfb8" strokeWidth="1.5" />
                      <circle cx="-8" cy="-6" r="7" fill="#3cd4a8" />
                      <circle cx="6" cy="-4" r="8" fill="#248b6f" />
                      <circle cx="0" cy="-10" r="9" fill="#46f6c9" />
                    </g>
                  ))}
                </g>
              )}

              {/* District Name Label Placed on Base */}
              <g transform="translate(0, 114)" className="district-label-group">
                <rect x="-65" y="-14" width="130" height="22" rx="4" fill="#0c1a26" fillOpacity="0.85" stroke={isFocused ? '#8be7d6' : '#2b4455'} strokeWidth="1" />
                <text
                  y="1"
                  textAnchor="middle"
                  fill={isFocused ? '#ffffff' : '#c9d9e2'}
                  fontSize="11"
                  fontFamily="'Space Grotesk', sans-serif"
                  fontWeight="600"
                >
                  {d.name}
                </text>
              </g>
            </g>
          );
        })}

        {/* 4. INTERACTIVE DEFENSE PLACEMENT SLOTS */}
        {isPlanningMode && onToggleDefense && (
          <g className="interactive-placement-layer">
            {/* Slot 1: Sünger Kent (Yamaç Sırtı Havzası) */}
            <g
              transform="translate(420, 370)"
              className={`map-defense-slot slot-sponge ${has('sünger') ? 'slot-active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleDefense('sünger');
              }}
            >
              <circle r="18" fill={has('sünger') ? '#2ba883' : '#102738'} stroke="#48dfb8" strokeWidth="2" className="slot-ring" />
              <text y="4" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="bold">✣</text>
              <g transform="translate(0, 26)" className="slot-tag">
                <rect x="-55" y="-9" width="110" height="18" rx="3" fill="#081827" stroke="#48dfb8" strokeWidth="1" />
                <text y="3" textAnchor="middle" fill="#48dfb8" fontSize="8" fontFamily="'DM Mono', monospace" fontWeight="600">
                  {has('sünger') ? '✓ SÜNGER AKTİF (28k)' : '+ SÜNGER YERLEŞTİR (28k)'}
                </text>
              </g>
            </g>

            {/* Slot 2: Kıyı Seti (Liman Rıhtımı) */}
            <g
              transform="translate(190, 335)"
              className={`map-defense-slot slot-seawall ${has('set') ? 'slot-active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleDefense('set');
              }}
            >
              <circle r="18" fill={has('set') ? '#d99757' : '#102738'} stroke="#f4b57b" strokeWidth="2" className="slot-ring" />
              <text y="4" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="bold">▰</text>
              <g transform="translate(0, 26)" className="slot-tag">
                <rect x="-55" y="-9" width="110" height="18" rx="3" fill="#081827" stroke="#f4b57b" strokeWidth="1" />
                <text y="3" textAnchor="middle" fill="#f4b57b" fontSize="8" fontFamily="'DM Mono', monospace" fontWeight="600">
                  {has('set') ? '✓ SET AKTİF (42k)' : '+ KIYI SETİ KUR (42k)'}
                </text>
              </g>
            </g>

            {/* Slot 3: Güvenli Dönüşüm (Hastane Koridoru Menfezleri) */}
            <g
              transform="translate(540, 440)"
              className={`map-defense-slot slot-retrofit ${has('dönüşüm') ? 'slot-active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleDefense('dönüşüm');
              }}
            >
              <circle r="18" fill={has('dönüşüm') ? '#3ccbb5' : '#102738'} stroke="#72ffd9" strokeWidth="2" className="slot-ring" />
              <text y="4" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="bold">⌁</text>
              <g transform="translate(0, 26)" className="slot-tag">
                <rect x="-55" y="-9" width="110" height="18" rx="3" fill="#081827" stroke="#72ffd9" strokeWidth="1" />
                <text y="3" textAnchor="middle" fill="#72ffd9" fontSize="8" fontFamily="'DM Mono', monospace" fontWeight="600">
                  {has('dönüşüm') ? '✓ DÖNÜŞÜM AKTİF (36k)' : '+ DÖNÜŞÜM YAP (36k)'}
                </text>
              </g>
            </g>

            {/* Slot 4: Erken Uyarı Ağı (Merkez Radar Telemetrisi) */}
            <g
              transform="translate(480, 260)"
              className={`map-defense-slot slot-warning ${has('uyarı') ? 'slot-active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleDefense('uyarı');
              }}
            >
              <circle r="18" fill={has('uyarı') ? '#8b70db' : '#102738'} stroke="#bca4ff" strokeWidth="2" className="slot-ring" />
              <text y="4" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="bold">◉</text>
              <g transform="translate(0, 26)" className="slot-tag">
                <rect x="-55" y="-9" width="110" height="18" rx="3" fill="#081827" stroke="#bca4ff" strokeWidth="1" />
                <text y="3" textAnchor="middle" fill="#bca4ff" fontSize="8" fontFamily="'DM Mono', monospace" fontWeight="600">
                  {has('uyarı') ? '✓ UYARI AKTİF (18k)' : '+ UYARI AĞI KUR (18k)'}
                </text>
              </g>
            </g>
          </g>
        )}
      </svg>

      {/* Atmospheric Weather Overlay */}
      {weather && <div className="weather-rain" aria-hidden="true" />}

      {/* 5. LANDMARK INSPECTION POPUP MODAL */}
      {inspectedLandmark && (
        <div className="landmark-modal-card">
          <div className="landmark-modal-header">
            <div>
              <span className="landmark-type-badge">{inspectedLandmark.type}</span>
              <h4>{inspectedLandmark.name}</h4>
              <small className="landmark-district-tag">{inspectedLandmark.district}</small>
            </div>
            <button
              className="landmark-close-btn"
              onClick={() => setInspectedLandmark(null)}
              aria-label="Kapat"
            >
              ✕
            </button>
          </div>
          <div className="landmark-modal-body">
            <div className="landmark-status-row">
              <span>GÜNCEL DURUM:</span>
              <strong className={inspectedLandmark.status.includes('Kapalı') || inspectedLandmark.status.includes('GEÇİLEMEZ') ? 'text-danger' : 'text-safe'}>
                {inspectedLandmark.status}
              </strong>
            </div>
            <p>{inspectedLandmark.description}</p>
            <div className="landmark-risk-box">
              <span>⚠️ RİSK ANALİZİ:</span>
              <p>{inspectedLandmark.riskFactor}</p>
            </div>
            <div className="landmark-intervention-box">
              <span>🛡️ ÖNERİLEN MÜDAHALE:</span>
              <p>{inspectedLandmark.recommendedDefense}</p>
            </div>
          </div>
        </div>
      )}

      {/* 6. DISTRICT TABS & DETAILED INTEL (STRICT ACCESSIBILITY & TEST COMPLIANCE) */}
      {!compact && (
        <>
          <div className="district-tabs" aria-label="Bölge seçimi">
            {DISTRICTS.map((d, i) => (
              <button
                key={d.id}
                aria-pressed={focus === i}
                aria-label={d.name}
                onMouseEnter={() => setFocus(i)}
                onFocus={() => setFocus(i)}
                onClick={() => {
                  setFocus(i);
                  gameAudio.effect('click');
                }}
                className={`tab-btn ${focus === i ? 'tab-active' : ''}`}
              >
                {d.name}
              </button>
            ))}
          </div>

          <div className="district-intel" aria-live="polite">
            <div className="intel-header">
              <strong className="intel-title">{district.name}</strong>
              <span className="intel-meta">
                {district.subtitle} · Maruziyet {district.exposure} · Kırılganlık {district.vulnerability}
              </span>
            </div>
            <div className="intel-metrics">
              <span className="intel-stat damage-stat">
                Altyapı hasarı: <b>{result.districts[focus].damage} puan</b>
              </span>
              <span className="intel-stat safety-stat">
                Güvenlik: <b>%{result.districts[focus].safety}</b>
              </span>
              <span className="intel-status">
                {result.districts[focus].flooded ? '⚠️ TAŞKIN RİSKİ AKTİF' : '✓ GÜVENLİ SINIRDA'}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
