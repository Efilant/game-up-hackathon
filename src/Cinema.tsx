import { useEffect, useState, useMemo } from 'react';
import { CityScene } from './CityScene';
import { baselineResult } from './simulation';
import { gameAudio } from './audio';
import { BRAND_ASSETS, BRANDING, getAchievementAsset } from './branding';
import { ACHIEVEMENTS } from './chapterProgress';
import { BrandLogo } from './BrandLogo';

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
  onNewGame,
  onContinue,
  onChapter,
  settings,
  about,
}: {
  onNewGame: () => void;
  onContinue: () => void;
  onChapter: () => void;
  settings: () => void;
  about: () => void;
}) {
  const [panel, setPanel] = useState<'chapters' | 'badges' | null>(null);
  const [hasSave, setHasSave] = useState(false);
  const storedBadges = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('sehrin_yarini_achievements') ?? '{}') as Record<string, unknown>; } catch (_) { return {}; }
  }, [panel]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem('felaket_benim_quest_save_v2');
      const save = raw ? JSON.parse(raw) as Record<string, unknown> : null;
      setHasSave(Boolean(save && typeof save.questStep === 'number' && save.questStep >= 1 && save.questStep <= 7));
    } catch (_) { setHasSave(false); }
  }, [panel]);
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

        <BrandLogo className="menu-brand-logo" priority />
        <h1 aria-label="ŞEHRİN YARINI.">
          BİR KARAR<br />
          <em>İKİ GELECEK<span>.</span></em>
        </h1>

        <p className="tagline">
          {BRANDING.subtitle}<br />
          Bir karar, iki gelecek.
        </p>

        <nav aria-label="Ana menü">
          <button
            className="primary-button"
            onClick={() => {
              gameAudio.unlock();
              onNewGame();
            }}
          >
            YENİ OYUN <span>↗</span>
          </button>
          <button
            className="continue-game-button"
            disabled={!hasSave}
            onClick={() => {
              gameAudio.unlock();
              if (hasSave) onContinue();
            }}
            title={hasSave ? 'Kayıtlı RPG oyununa devam et' : 'Devam etmek için kayıt bulunamadı'}
          >
            DEVAM ET {hasSave ? '↗' : '· KAYIT YOK'}
          </button>
          <button onClick={() => { setPanel('chapters'); }}>{'BÖLÜMLER'}</button>
          <button onClick={() => setPanel('badges')}>ROZETLERİM</button>
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
      {panel && (
        <div className="menu-collection-overlay" role="dialog" aria-label={panel === 'chapters' ? 'Bölüm seçimi' : 'Rozetlerim'}>
          <div className="menu-collection-card">
            <button className="settings-close" onClick={() => setPanel(null)} aria-label="Kapat">×</button>
            {panel === 'chapters' ? (
              <>
                <div className="eyebrow safe">BÖLÜM SEÇİMİ</div>
                <h2>Şehrin yarını için ilk adım</h2>
                <button className="chapter-select-card chapter-select-card-art" onClick={() => { setPanel(null); onChapter(); }}>
                  <img src={BRAND_ASSETS.chapters.hospital} alt="Yamaç Hastanesi pixel-art görünümü" />
                  <span className="chapter-select-card-copy"><b>BÖLÜM 1 — YAMAÇ HASTANESİ</b><span>TAŞKINLA MÜCADELE · OYNA</span></span>
                </button>
                <div className="chapter-select-card chapter-select-card-art locked"><img src={BRAND_ASSETS.chapters.heat} alt="Serin Şehir pixel-art görünümü" /><span className="chapter-select-card-copy"><b>BÖLÜM 2 — SERİN ŞEHİR</b><span>YAKINDA · SICAK HAVA DALGASI</span></span></div>
                <div className="chapter-select-card chapter-select-card-art locked"><img src={BRAND_ASSETS.chapters.drought} alt="Son Damla pixel-art görünümü" /><span className="chapter-select-card-copy"><b>BÖLÜM 3 — SON DAMLA</b><span>YAKINDA · KURAKLIK</span></span></div>
              </>
            ) : (
              <>
                <div className="eyebrow safe">ROZETLERİM</div>
                <h2>Şehrin yarınına katkıların</h2>
                <div className="badge-collection-grid">
                  {ACHIEVEMENTS.map((badge) => {
                    const record = storedBadges[badge.id] as { unlockedAt?: string } | undefined;
                    const unlocked = Boolean(record);
                    return (
                      <article className={`badge-collection-item ${unlocked ? 'unlocked' : 'locked'}`} key={badge.id} data-achievement-id={badge.id}>
                        <div className="badge-collection-icon">
                          <img src={getAchievementAsset(badge.id)} alt={`${badge.title} rozeti`} />
                          {!unlocked && <img className="badge-lock-overlay" src={BRAND_ASSETS.lock} alt="Kilitli" />}
                        </div>
                        <div className="badge-collection-copy"><span>{badge.title}</span><small>{badge.description}</small><em>{unlocked ? `KAZANILDI${record?.unlockedAt ? ` · ${new Date(record.unlockedAt).toLocaleDateString('tr-TR')}` : ''}` : 'KİLİTLİ'}</em></div>
                      </article>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
export function NewGameSetup({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: (heroType: 'female' | 'male', gameMode: 'relaxed' | 'adventure') => void;
}) {
  const [heroType, setHeroType] = useState<'female' | 'male'>('female');
  const [gameMode, setGameMode] = useState<'relaxed' | 'adventure'>('relaxed');
  const [playerName, setPlayerName] = useState('');

  const confirm = () => {
    try { localStorage.setItem('felaket_benim_player_name', playerName.trim()); } catch (_) {}
    onConfirm(heroType, gameMode);
  };

  return (
    <div className="new-game-setup-overlay" role="dialog" aria-label="Yeni oyun kurulumu">
      <section className="new-game-setup-card">
        <button className="settings-close" onClick={onCancel} aria-label="Yeni oyun kurulumunu kapat">×</button>
        <div className="eyebrow safe">YENİ OYUN · BÖLÜM 1</div>
        <h2>Şehrin yarınına adım at.</h2>
        <p>Karakterini ve oynama ritmini seç. Bundan sonra tek yol, keşfedilebilir RPG şehri.</p>

        <label className="new-game-name-field">
          <span>KAHRAMAN ADI <small>(İSTEĞE BAĞLI)</small></span>
          <input value={playerName} onChange={(event) => setPlayerName(event.target.value)} placeholder="Adını yaz" maxLength={24} />
        </label>

        <div className="new-game-section-label">SAHA GÖREVLİSİ</div>
        <div className="new-game-hero-grid">
          <button className={`new-game-hero-card ${heroType === 'female' ? 'selected' : ''}`} onClick={() => setHeroType('female')} data-hero-choice="female">
            <img src="/assets/characters/mira-portrait.png" alt="Deniz" />
            <span><b>Deniz</b><small>HİDROLOG · Analitik saha okuması</small></span>
            {heroType === 'female' && <i>✓</i>}
          </button>
          <button className={`new-game-hero-card ${heroType === 'male' ? 'selected' : ''}`} onClick={() => setHeroType('male')} data-hero-choice="male">
            <img src="/assets/characters/aras-portrait.png" alt="Barış" />
            <span><b>Barış</b><small>MİMAR · Dayanıklı altyapı</small></span>
            {heroType === 'male' && <i>✓</i>}
          </button>
        </div>

        <div className="new-game-section-label">OYUN RİTMİ</div>
        <div className="new-game-mode-grid">
          <button className={gameMode === 'relaxed' ? 'selected' : ''} onClick={() => setGameMode('relaxed')}><b>RAHAT KEŞİF</b><small>Süre baskısı yok; şehri ve çözümleri kendi ritminde incele.</small></button>
          <button className={gameMode === 'adventure' ? 'selected' : ''} onClick={() => setGameMode('adventure')}><b>MACERA</b><small>Fırtına başladığında 240 saniyelik karar penceresi açılır.</small></button>
        </div>

        <div className="new-game-actions">
          <button className="dialog-close-btn" onClick={onCancel}>VAZGEÇ</button>
          <button className="primary-button" onClick={confirm}>ŞEHRE GİR ↗</button>
        </div>
      </section>
    </div>
  );
}
