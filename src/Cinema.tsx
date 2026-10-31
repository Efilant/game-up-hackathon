import { useEffect, useState, useMemo } from 'react';
import { Play, Pause, RotateCcw, FastForward, Sliders, Grid } from 'lucide-react';
import { CityScene } from './CityScene';
import { baselineResult, BUDGET, DEFENSES, type DefenseId, type SimulationResult } from './simulation';
import {
  createInitialSpatialState,
  stepSpatialSimulation,
  type SpatialSimulationState,
} from './spatialSimulation';
import { gameAudio } from './audio';

const limitations: Record<DefenseId, string> = {
  'uyarı': 'İnsanlara zaman kazandırır; binaların fiziksel hasarını azaltmaz.',
  'sünger': 'Yüzey akışını azaltır; tek başına güvenlik puanını artırmaz.',
  'set': 'Kıyıda güçlüdür; iç bölgelerde etkisi sınırlıdır.',
  'dönüşüm': 'Altyapı ve güvenliği birlikte iyileştirir; bütçenin %36’sını kullanır.',
};

export function Adviser({
  person = 'aras',
  children,
}: {
  person?: 'mira' | 'aras' | 'eko' | string;
  children: React.ReactNode;
}) {
  const roleTitle =
    person === 'mira'
      ? 'MİRA · İklim Bilimci'
      : person === 'aras'
      ? 'ARAS · Şehir Mühendisi'
      : 'EKO · Simülasyon Zekâsı';

  return (
    <div className={`adviser adviser-${person}`}>
      <div className="adviser-avatar-wrapper">
        <img
          src={`/assets/characters/${person}-portrait.png`}
          alt={person === 'mira' ? 'Mira' : person === 'aras' ? 'Aras' : 'EKO'}
          loading="lazy"
          className="adviser-avatar-img"
        />
        <span className={`adviser-status-dot dot-${person}`} />
      </div>
      <div className="adviser-body">
        <strong>{roleTitle}</strong>
        <p>{children}</p>
      </div>
    </div>
  );
}

export function GameMenu({
  start,
  startWorld,
  settings,
  about,
}: {
  start: () => void;
  startWorld?: () => void;
  settings: () => void;
  about: () => void;
}) {
  return (
    <main className="cinema-menu">
      <div className="menu-sky" />
      <div className="menu-skyline">
        <CityScene result={baselineResult} compact weather={false} />
      </div>
      <div className="menu-fog" />
      <div className="weather-rain" />

      <section className="menu-front">
        <div className="edition-badge">
          <span className="pulse-dot" />
          <span className="edition">BİR ŞEHİR. BİR FIRTINA. İKİ GELECEK.</span>
        </div>

        <h1>
          FELAKET<br />
          <em>BENİM<span>.</span></em>
        </h1>

        <p className="tagline">
          Önce sistemi zorla.<br />
          Sonra onu kurtar.
        </p>

        <nav aria-label="Ana menü">
          <button
            className="primary-button"
            onClick={() => {
              gameAudio.unlock();
              start();
            }}
          >
            BAŞLAT <span>↗</span>
          </button>
          <button
            className="world-explore-button"
            onClick={() => {
              gameAudio.unlock();
              if (startWorld) startWorld();
              else start();
            }}
          >
            🎮 ŞEHRE İN (2.5D MACERA)
          </button>
          <button
            onClick={() => {
              gameAudio.unlock();
              settings();
            }}
          >
            AYARLAR
          </button>
          <button
            onClick={() => {
              gameAudio.unlock();
              about();
            }}
          >
            HAKKINDA
          </button>
        </nav>

        <div className="menu-footer-meta">
          <small>2045 / İklim dayanıklılığı hikâyesi · GameUP Türkiye 2026</small>
        </div>
      </section>

      <div className="menu-cast" aria-label="Şehrin ekibi">
        {[
          { key: 'mira', name: 'MİRA', role: 'İKLİM BİLİMCİ' },
          { key: 'aras', name: 'ARAS', role: 'ŞEHİR MÜHENDİSİ' },
          { key: 'eko', name: 'EKO', role: 'SİMÜLASYON REHBERİ' },
        ].map((c) => (
          <figure key={c.key} className={`cast-card card-${c.key}`}>
            <img
              src={`/assets/characters/${c.key}-portrait.png`}
              alt={c.name}
            />
            <figcaption>
              <strong>{c.name}</strong>
              <small>{c.role}</small>
            </figcaption>
          </figure>
        ))}
      </div>
    </main>
  );
}

export function Strategy({
  selected,
  budgetUsed,
  projected,
  toggle,
  onContinue,
}: {
  selected: DefenseId[];
  budgetUsed: number;
  projected: SimulationResult;
  toggle: (id: DefenseId) => void;
  onContinue: () => void;
}) {
  const damageSaved = baselineResult.totalDamage - projected.totalDamage;
  const safetyGained = projected.safety - baselineResult.safety;

  // Hastane Yolu Simülasyon Durumu
  const hospitalRoadPassable = selected.includes('sünger') || selected.includes('dönüşüm');
  const estimatedDepth = selected.includes('sünger') && selected.includes('dönüşüm')
    ? 12
    : selected.includes('sünger')
    ? 18
    : selected.includes('dönüşüm')
    ? 22
    : 38;

  const getAdvisorNote = () => {
    if (selected.includes('set') && selected.includes('sünger')) {
      return 'Kıyı seti deniz kabarmasını keserken, sünger kent iç mahallelerdeki ve hastane yolundaki yüzey akışını emiyor. Dengeli ve güçlü bir hat.';
    }
    if (selected.includes('uyarı') && selected.length === 1) {
      return 'Erken uyarı ambulanslara ve insanlara tahliye zamanı kazandırır; ancak su seviyesi yine de hastane yolunu keser. Fiziksel bir drenaj veya menfez yatırımı da gerekli.';
    }
    if (selected.includes('dönüşüm')) {
      return 'Güvenli Dönüşüm hastane yolunun altına yüksek kapasiteli menfez yerleştirdi ve kritik yapıları güçlendirdi; bütçenin büyük kısmını hak eden bir direnç yatırımı.';
    }
    if (selected.length > 0) {
      return `${selected.length} yatırım devrede. ${BUDGET - budgetUsed} kredi kaldı. Haritadaki yuvalara doğrudan tıklayarak da yatırımları yönetebilirsin.`;
    }
    return 'Harita üzerindeki savunma yuvalarına dokunarak veya kartları seçerek müdahale et. Önceliğimiz Hastane Erişim Yolu ve taşkın havzaları olmalı.';
  };

  const currentSpeaker = selected.includes('dönüşüm') || selected.includes('set')
    ? 'aras'
    : selected.includes('sünger')
    ? 'mira'
    : 'eko';

  return (
    <main className="game-view strategy">
      <div className="view-heading">
        <div>
          <div className="eyebrow safe">02 / ŞEHRİN YANINDA</div>
          <h2>Geleceği kur.</h2>
          <p>Haritadaki yuvalara dokunarak doğrudan müdahale et. Fırtına aynı; değişen, senin hazırlığın.</p>
        </div>

        <div className="budget-readout">
          <div className="budget-header">
            <span>KALAN KAYNAK</span>
            <span className="budget-spent-hint">{budgetUsed} harcandı</span>
          </div>
          <strong>
            {BUDGET - budgetUsed}
            <small> / 100 kredi</small>
          </strong>
          <progress
            value={budgetUsed}
            max={100}
            aria-label="Kullanılan bütçe"
            className="budget-progress-bar"
          />
        </div>
      </div>

      {/* Live Tactical Forecast Bar */}
      <div className="strategy-forecast-bar">
        <div className="forecast-item">
          <span>ÖNGÖRÜLEN HASAR AZALMASI</span>
          <b className={damageSaved > 0 ? 'text-gain' : ''}>
            {damageSaved > 0 ? `−${damageSaved} puan` : 'Değişim yok'}
          </b>
        </div>
        <div className="forecast-item">
          <span>İNSAN GÜVENLİK ARTIŞI</span>
          <b className={safetyGained > 0 ? 'text-gain' : ''}>
            {safetyGained > 0 ? `+%${safetyGained}` : '%0'}
          </b>
        </div>
        <div className="forecast-item">
          <span>DAYANIKLILIK SKORU</span>
          <b>%{projected.resilience}</b>
        </div>
      </div>

      {/* Hospital Access Road Crisis Card */}
      <div className={`hospital-crisis-banner ${hospitalRoadPassable ? 'crisis-resolved' : 'crisis-active'}`}>
        <div className="crisis-banner-icon">
          {hospitalRoadPassable ? '✓' : '⚠️'}
        </div>
        <div className="crisis-banner-text">
          <strong>KRİTİK HEDEF: HASTANE ACİL ERİŞİM YOLU</strong>
          <p>
            {hospitalRoadPassable
              ? `Yol ulaşıma açık (Tahmini derinlik: ${estimatedDepth} cm < 30 cm eşik). Ambulanslar hastaneye kesintisiz ulaşabilecek!`
              : `Yol taşkın riski altında (Tahmini derinlik: ${estimatedDepth} cm > 30 cm eşik). Haritadaki Sünger Kent veya Güvenli Dönüşüm yuvasını kullanarak yolu kurtar!`}
          </p>
        </div>
        <div className="crisis-depth-gauge">
          <span>TAHMİNİ SU:</span>
          <b>{estimatedDepth} cm</b>
        </div>
      </div>

      <div className="strategy-layout">
        <section className="strategy-map-column">
          <div className="tactical-map-frame">
            <div className="tactical-frame-tag">
              <span>İNTERAKTİF HARİTA: YUVALARA VEYA BİNALARA DOKUN</span>
            </div>
            {/* Interactive map slots enabled */}
            <CityScene
              result={projected}
              selected={selected}
              weather={false}
              isPlanningMode={true}
              onToggleDefense={toggle}
            />
          </div>

          <Adviser person={currentSpeaker}>
            {getAdvisorNote()}
          </Adviser>
        </section>

        <section className="strategy-cards" aria-label="Savunma yatırımları">
          <div className="cards-header-tag">SAVUNMA YATIRIM LİSTESİ</div>
          {DEFENSES.map((d) => {
            const active = selected.includes(d.id);
            const canAfford = budgetUsed + d.cost <= BUDGET;
            const disabled = !active && !canAfford;

            return (
              <button
                key={d.id}
                aria-pressed={active}
                disabled={disabled}
                className={`defense-card ${active ? 'active' : ''}`}
                onClick={() => toggle(d.id)}
              >
                <div className="defense-icon">{d.icon}</div>
                <div className="defense-content">
                  <div className="defense-title">
                    <b>{d.name}</b>
                    <span className="defense-cost-badge">{d.cost} kredi</span>
                  </div>
                  <p>{d.description}</p>
                  <small className="defense-effect-tag">
                    {d.id === 'sünger' ? 'Hasar −18% • Güvenlik değişmez' : d.effects}
                  </small>
                  <p className="limitation">{limitations[d.id]}</p>
                </div>
                <div className="check">{active ? '✓' : '+'}</div>
              </button>
            );
          })}

          <button
            className="primary-button apply-plan"
            disabled={!selected.length}
            onClick={onContinue}
          >
            <span>PLANI UYGULA</span>
            <span>↗</span>
          </button>
        </section>
      </div>
    </main>
  );
}

export function SecondStorm({
  selected,
  projected,
  onContinue,
}: {
  selected: DefenseId[];
  projected: SimulationResult;
  onContinue: () => void;
}) {
  const [done, setDone] = useState(false);
  const [simState, setSimState] = useState<SpatialSimulationState>(() => createInitialSpatialState(selected));
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState<1 | 2>(1);

  // Playwright test & fallback timer (enables after 2.4s minimum)
  useEffect(() => {
    const t = setTimeout(() => setDone(true), 2400);
    return () => clearTimeout(t);
  }, []);

  // Time-based spatial simulation runner
  useEffect(() => {
    if (!isPlaying || simState.isCompleted) return;

    const intervalMs = speed === 2 ? 65 : 120;
    const timer = setInterval(() => {
      setSimState((prev) => {
        const next = stepSpatialSimulation(prev, selected);
        if (next.isCompleted) {
          setDone(true);
        }
        return next;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, speed, selected, simState.isCompleted]);

  const latestEvent = simState.events[simState.events.length - 1];

  return (
    <main className="game-view second-storm">
      <div className="storm-header-block">
        <div className="eyebrow danger">03 / AYNI FIRTINA</div>
        <h2>Bu kez hazırız.</h2>
        <p>88 mm/saat · Canlı mekanik taşkın simülasyonu ve acil müdahale koridoru</p>
      </div>

      {/* Interactive Simulation Controls Bar */}
      <div className="storm-sim-toolbar">
        <div className="sim-time-display">
          <span className="sim-clock-icon">⏱</span>
          <span className="sim-time-val">{simState.timeString}</span>
          <span className="sim-tick-val">(Adım {simState.tick} / {simState.maxTicks})</span>
        </div>

        <div className="sim-controls">
          <button
            className="sim-ctrl-btn"
            onClick={() => setIsPlaying(!isPlaying)}
            aria-label={isPlaying ? 'Duraklat' : 'Oynat'}
            title={isPlaying ? 'Duraklat' : 'Oynat'}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            <span>{isPlaying ? 'DURAKLAT' : 'OYNAT'}</span>
          </button>

          <button
            className={`sim-ctrl-btn ${speed === 2 ? 'btn-active' : ''}`}
            onClick={() => setSpeed(speed === 1 ? 2 : 1)}
            title="Hızlandır"
          >
            <FastForward size={14} />
            <span>{speed}x</span>
          </button>

          <button
            className="sim-ctrl-btn"
            onClick={() => {
              setSimState(createInitialSpatialState(selected));
              setIsPlaying(true);
            }}
            title="Simülasyonu Baştan Başlat"
          >
            <RotateCcw size={14} />
          </button>
        </div>

        <div className={`sim-hospital-badge ${simState.hospitalRoadPassable ? 'passable' : 'blocked'}`}>
          <span>HASTANE YOLU:</span>
          <b>{simState.hospitalRoadPassable ? '✓ AÇIK' : '⛔ GEÇİLEMEZ'}</b>
          <small>({simState.hospitalRoadWaterDepth} cm)</small>
        </div>
      </div>

      {/* Real-time simulation event ticker */}
      {latestEvent && (
        <div className={`storm-event-ticker event-${latestEvent.type}`}>
          <span className="ticker-time">{latestEvent.timeString}</span>
          <strong className="ticker-title">{latestEvent.title}</strong>
          <span className="ticker-desc">{latestEvent.description}</span>
        </div>
      )}

      <div className="storm-canvas-container">
        <div className="storm-radar-indicator">
          <span className="radar-sweep" />
          <span className="radar-label">RADAR: AKTİF FIRTINA CEPHESİ ({simState.rainfallRate} mm/h)</span>
        </div>
        <CityScene result={projected} selected={selected} spatialState={simState} />
      </div>

      <div className="storm-progress">
        <i style={{ width: `${(simState.tick / simState.maxTicks) * 100}%` }} />
      </div>

      <div className="replay-stats">
        <div>
          <span>ALTYAPI HASARI</span>
          <b>
            <del>{baselineResult.totalDamage}</del> → {projected.totalDamage}
          </b>
        </div>
        <div>
          <span>İNSAN GÜVENLİĞİ</span>
          <b>
            %{baselineResult.safety} → %{projected.safety}
          </b>
        </div>
        <div>
          <span>YATIRIM</span>
          <b>{projected.budgetUsed} kredi</b>
        </div>
      </div>

      <div className="storm-actions">
        <button
          className="primary-button storm-continue-btn"
          disabled={!done}
          onClick={onContinue}
        >
          {done ? 'ŞEHRİN HAFIZASINI AÇ' : 'FIRTINA İZLENİYOR…'} ↗
        </button>
      </div>
    </main>
  );
}

export function CityMemory({
  baseline,
  finalResult,
  selected,
  onRestart,
}: {
  baseline: SimulationResult;
  finalResult: SimulationResult;
  selected: DefenseId[];
  onRestart: () => void;
}) {
  const tier = finalResult.resilience >= 80 ? 2 : finalResult.resilience >= 65 ? 1 : 0;
  const verdictTitles = [
    'RİSK HÂLÂ YÜKSEK',
    'BİR ADIM DAHA GÜVENLİ',
    'ŞEHİR DAHA DİRENÇLİ',
  ];

  const hospitalRoadSaved = selected.includes('sünger') || selected.includes('dönüşüm');
  const [sliderPos, setSliderPos] = useState(50);
  const [viewMode, setViewMode] = useState<'pair' | 'slider'>('pair');

  return (
    <main className="game-view city-memory">
      <div className="results-heading">
        <div>
          <div className="eyebrow safe">SON BÖLÜM / ŞEHRİN HAFIZASI</div>
          <h2>
            Aynı yağmur.<br />
            <em>Başka bir yarın.</em>
          </h2>
        </div>
        <div className={`result-verdict verdict-tier-${tier}`}>
          <div className="verdict-banner">{verdictTitles[tier]}</div>
          <small>Hiçbir plan bütün riski ortadan kaldırmaz.</small>
        </div>
      </div>

      {/* View Mode Selector */}
      <div className="memory-view-toggle">
        <button
          className={`toggle-btn ${viewMode === 'pair' ? 'active' : ''}`}
          onClick={() => setViewMode('pair')}
        >
          <Grid size={13} /> Yan Yana İncele
        </button>
        <button
          className={`toggle-btn ${viewMode === 'slider' ? 'active' : ''}`}
          onClick={() => setViewMode('slider')}
        >
          <Sliders size={13} /> Karşılaştırma Kaydırıcısı
        </button>
      </div>

      {/* Interactive Split Comparison Slider Mode */}
      {viewMode === 'slider' ? (
        <div className="memory-slider-container">
          <div className="slider-canvas-wrapper">
            {/* Base layer: Defended city */}
            <div className="slider-layer layer-after">
              <CityScene result={finalResult} selected={selected} compact />
              <span className="slider-tag after-tag">02 — SENİN KARARLARINLA (%{finalResult.resilience} Direnç)</span>
            </div>

            {/* Top clipped layer: Baseline defenseless city */}
            <div
              className="slider-layer layer-before"
              style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
            >
              <CityScene result={baseline} compact />
              <span className="slider-tag before-tag">01 — SAVUNMASIZ ŞEHİR (%{baseline.resilience} Direnç)</span>
            </div>

            {/* Slider bar line */}
            <div className="slider-divider" style={{ left: `${sliderPos}%` }}>
              <div className="slider-handle">
                <span>◀ ▶</span>
              </div>
            </div>
          </div>

          <div className="slider-input-track">
            <span>Savunmasız Şehir</span>
            <input
              type="range"
              min="0"
              max="100"
              value={sliderPos}
              onChange={(e) => setSliderPos(Number(e.target.value))}
              aria-label="Karşılaştırma Kaydırıcısı"
            />
            <span>Senin Kararlarınla</span>
          </div>
        </div>
      ) : (
        /* Dual View Mode (.memory-pair is strictly preserved for tests) */
        <div className="memory-pair">
          <section className="memory-card card-before">
            <div className="memory-card-header">
              <h3>01 — Savunmasız şehir</h3>
              <span className="memory-tag tag-hazard">HASAR: {baseline.totalDamage}p</span>
            </div>
            <CityScene result={baseline} compact />
          </section>

          <section className="memory-card card-after">
            <div className="memory-card-header">
              <h3>02 — Senin kararlarınla</h3>
              <span className="memory-tag tag-resilient">HASAR: {finalResult.totalDamage}p</span>
            </div>
            <CityScene result={finalResult} selected={selected} compact />
          </section>
        </div>
      )}

      {/* Hospital Scenario Consequence Card */}
      <div className={`memory-hospital-result ${hospitalRoadSaved ? 'saved' : 'lost'}`}>
        <div className="result-badge-icon">{hospitalRoadSaved ? '🚑' : '🚨'}</div>
        <div className="result-badge-body">
          <strong>HASTANE ERİŞİM ARTERİ SONUCU</strong>
          <p>
            {hospitalRoadSaved
              ? 'Müdahalelerin sayesinde Hastane Erişim Yolu ulaşıma açık tutuldu. Ambulans filosu fırtına boyunca 400 yataklı şehir hastanesine acil hastaları kesintisiz taşıyabildi.'
              : 'Yeterli drenaj veya koruma sağlanamadığı için yamaç akışı yolu kesti (Su derinliği: 38 cm). Ambulanslar acil servise ulaşamadı; hastane lojistiği saatlerce kesintiye uğradı.'}
          </p>
        </div>
        <div className="result-badge-status">
          <small>DURUM:</small>
          <b>{hospitalRoadSaved ? '✓ ERİŞİLEBİLİR' : '⛔ GEÇİLEMEDİ'}</b>
        </div>
      </div>

      <div className="memory-metrics">
        {[
          ['Altyapı hasarı', baseline.totalDamage, finalResult.totalDamage],
          ['İnsan güvenliği', baseline.safety, finalResult.safety],
          ['Dayanıklılık', baseline.resilience, finalResult.resilience],
        ].map(([label, b, a]) => (
          <div key={label as string} className="metric-box">
            <span>{label} · oyun puanı</span>
            <strong>
              <del>{b}</del> → {a}
            </strong>
          </div>
        ))}

        <div className="metric-box">
          <span>Kullanılan bütçe</span>
          <strong>{finalResult.budgetUsed} / 100</strong>
        </div>
      </div>

      <div className="active-defenses-section">
        <span className="active-defenses-title">DEVREYE ALINAN SAVUNMALAR:</span>
        <div className="active-defenses">
          {selected.length > 0 ? (
            selected.map((id) => (
              <span key={id} className="active-defense-badge">
                {DEFENSES.find((d) => d.id === id)?.icon} {DEFENSES.find((d) => d.id === id)?.name}
              </span>
            ))
          ) : (
            <span className="active-defense-badge none">Önlem seçilmedi</span>
          )}
        </div>
      </div>

      <Adviser person="mira">
        {[
          'Bazı insanlara zaman kazandırdık ama şehir hâlâ kırılgan. Başka bir yatırım bileşimi denemek bize yeni bir yol gösterebilir.',
          'Bu şehir artık aynı şehir değil. Kararların bir fark yarattı; yine de suyun ulaştığı mahalleleri unutmamalıyız.',
          'Birlikte hazırlanınca aynı tehlikenin sonuçlarını değiştirebildik. Dayanıklılık, bugün kurduğumuzu yarın da korumak demek.',
        ][tier]}
      </Adviser>

      <footer>
        <small>Bu, basitleştirilmiş bir oyun modelidir; gerçek dünya afet tahmini değildir.</small>
        <button className="primary-button" onClick={onRestart}>
          YENİDEN OYNA ↻
        </button>
      </footer>
    </main>
  );
}
