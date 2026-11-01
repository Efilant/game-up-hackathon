import { useEffect, useState } from 'react';
import { Settings, Volume2, VolumeX } from 'lucide-react';

import { BrandLogo } from './BrandLogo';
import { GameMenu, NewGameSetup } from './Cinema';
import { ExplorableWorld } from './ExplorableWorld';
import { gameAudio } from './audio';
import { BRANDING } from './branding';

type Screen = 'menu' | 'credits' | 'world';

function Sound({
  muted,
  onToggle,
  onSettings,
}: {
  muted: boolean;
  onToggle: () => void;
  onSettings: () => void;
}) {
  return (
    <div className="audio-actions">
      <button className="sound-button" onClick={onToggle} aria-label={muted ? 'Sesi aç' : 'Sesi kapat'}>
        {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
        <span>{muted ? 'SESSİZ' : 'SES AÇIK'}</span>
      </button>
      <button className="settings-button" onClick={onSettings} aria-label="Ses ayarlarını aç">
        <Settings size={16} />
      </button>
    </div>
  );
}

function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [muted, setMuted] = useState(false);
  const [musicVolume, setMusicVolume] = useState(58);
  const [sfxVolume, setSfxVolume] = useState(72);
  const [showSettings, setShowSettings] = useState(false);
  const [showNewGameSetup, setShowNewGameSetup] = useState(false);
  const [transition, setTransition] = useState('');

  useEffect(() => {
    gameAudio.setScene(screen === 'world' ? 'plan' : screen);
  }, [screen]);

  useEffect(() => {
    gameAudio.setLevels(musicVolume, sfxVolume, muted);
  }, [musicVolume, sfxVolume, muted]);

  useEffect(() => () => gameAudio.dispose(), []);

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowSettings(false);
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, []);

  const go = (next: Screen) => {
    gameAudio.unlock();
    gameAudio.effect('transition');
    setTransition(next === 'world' ? '00 / ŞEHRİN İÇİNDE — 2.5D MACERA' : '');
    setScreen(next);
    setShowNewGameSetup(false);
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    if (!transition) return;
    const timer = window.setTimeout(() => setTransition(''), 1200);
    return () => window.clearTimeout(timer);
  }, [transition]);

  const confirmNewGame = (heroType: 'female' | 'male', gameMode: 'relaxed' | 'adventure') => {
    try {
      localStorage.removeItem('felaket_benim_quest_save_v2');
      localStorage.setItem('felaket_benim_hero', heroType);
      localStorage.setItem('sehrin_yarini_mode', gameMode);
    } catch (_) {
      // The world still starts when storage is unavailable.
    }
    go('world');
  };

  return (
    <div
      className={`game-shell screen-${screen}`}
      onPointerDownCapture={() => gameAudio.unlock()}
      onKeyDownCapture={() => gameAudio.unlock()}
    >
      <div className="grain" />

      {transition && (
        <div className="chapter-curtain" key={transition} aria-live="polite">
          <BrandLogo className="curtain-brand-logo" priority />
          <small>{BRANDING.title}</small>
          <strong>{transition}</strong>
        </div>
      )}

      {screen !== 'world' && (
        <header className="topbar">
          <BrandLogo variant="compact" className="topbar-brand-logo" />
          <div className="chapter">{screen === 'menu' ? BRANDING.subtitle.toUpperCase() : 'KÜNYE'}</div>
          <Sound
            muted={muted}
            onToggle={() => setMuted((value) => !value)}
            onSettings={() => setShowSettings((value) => !value)}
          />
        </header>
      )}

      {showSettings && (
        <aside className="audio-popover">
          <button className="settings-close" aria-label="Ayarları kapat" onClick={() => setShowSettings(false)}>
            ×
          </button>
          <div className="panel-label">SES KONTROLÜ</div>
          <label>
            MÜZİK
            <input aria-label="Müzik seviyesi" type="range" min="0" max="100" value={musicVolume} onChange={(event) => setMusicVolume(Number(event.target.value))} />
            <b>{musicVolume}</b>
          </label>
          <label>
            EFEKTLER
            <input aria-label="Efekt seviyesi" type="range" min="0" max="100" value={sfxVolume} onChange={(event) => setSfxVolume(Number(event.target.value))} />
            <b>{sfxVolume}</b>
          </label>
          <button className="text-button" onClick={() => setMuted((value) => !value)}>
            {muted ? 'SESSİZİ KALDIR' : 'TÜMÜNÜ SUSTUR'}
          </button>
        </aside>
      )}

      {screen === 'menu' && (
        <GameMenu
          onNewGame={() => setShowNewGameSetup(true)}
          onContinue={() => go('world')}
          onChapter={() => setShowNewGameSetup(true)}
          settings={() => setShowSettings(true)}
          about={() => go('credits')}
        />
      )}

      {screen === 'menu' && showNewGameSetup && (
        <NewGameSetup onCancel={() => setShowNewGameSetup(false)} onConfirm={confirmNewGame} />
      )}

      {screen === 'world' && (
        <ExplorableWorld
          onBackToMenu={() => go('menu')}
          muted={muted}
          onToggleMute={() => setMuted((value) => !value)}
        />
      )}

      {screen === 'credits' && (
        <main className="simple-view">
          <BrandLogo className="credits-brand-logo" />
          <div className="eyebrow">{BRANDING.title} / KÜNYE</div>
          <h2>Bir karar, iki gelecek.</h2>
          <p>{BRANDING.title}, iklim uyumunu yaşayan bir şehirde keşif, karar ve dayanışma üzerinden anlatan bir maceradır.</p>
          <div className="credit-grid">
            <div><span>YARATICI REHBER</span><strong>Mira</strong><small>İklim bilimci</small></div>
            <div><span>SİSTEM MÜHENDİSİ</span><strong>Aras</strong><small>Altyapı ve bütçe</small></div>
            <div><span>ANLATICI</span><strong>EKO</strong><small>Simülasyon zekâsı</small></div>
          </div>
          <button className="primary-button" onClick={() => go('menu')}>MENÜYE DÖN</button>
        </main>
      )}
    </div>
  );
}

export default App;
