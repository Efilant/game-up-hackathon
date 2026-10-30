import { useEffect, useMemo, useState } from 'react';
import { Volume2, VolumeX, Settings, RotateCcw, ArrowRight } from 'lucide-react';
import { baselineResult, BUDGET, calculateImpact, DEFENSES, DISTRICTS, type DefenseId, type DistrictId, type SimulationResult } from './simulation';

import { CityScene } from './CityScene';
import { GameMenu, Strategy, SecondStorm, CityMemory } from './Cinema';
import { gameAudio } from './audio';

type Screen = 'menu' | 'intro' | 'stress' | 'reversal' | 'plan' | 'replay' | 'results' | 'credits';
type Speaker = 'EKO' | 'MİRA' | 'ARAS';
const CHARACTERS: Record<Speaker, { role: string; image: string; alt: string }> = {
  'MİRA': { role: 'İklim Bilimci', image: '/assets/characters/mira-portrait.png', alt: 'Mira, iklim bilimci' },
  'ARAS': { role: 'Şehir Mühendisi', image: '/assets/characters/aras-portrait.png', alt: 'Aras, şehir mühendisi' },
  'EKO': { role: 'Simülasyon Yapay Zekâsı', image: '/assets/characters/eko-portrait.png', alt: 'EKO, simülasyon yapay zekâsı' },
};
const dialogue: Partial<Record<Screen, { speaker: Speaker; text: string; hint: string }[]>> = {
  intro: [
    { speaker: 'EKO', text: '2045. Şehir, yağmurun artık sadece yağmur olmadığını öğrendi.', hint: 'SİMÜLASYON KAYDI / 2045.10.18' },
    { speaker: 'MİRA', text: 'Yağış tehlikedir. Suyun önündeki evler maruziyet, dayanıksız yapılar kırılganlıktır. Ben Mira. Birlikte bunların nerede buluştuğunu göreceğiz.', hint: 'İKLİM BİLİMİ BİRİMİ' },
    { speaker: 'ARAS', text: 'Dört bölge, dört ayrı kırılganlık. Ben altyapının nerede dayanacağını, nerede bedel isteyeceğini göstereceğim.', hint: 'KENT MÜHENDİSLİĞİ / SEKTÖR 04' },
    { speaker: 'EKO', text: 'Kurallar basit: aynı fırtına, iki farklı gelecek. Hazır olduğunda sistemi zorla.', hint: 'EKO / GÖZLEM MODU' },
  ],
  reversal: [
    { speaker: 'EKO', text: 'Kıyı yolu kapandı. Eski Merkez’de ışıklar söndü. Bu yalnızca bir simülasyondu. Artık nerede kırıldığını biliyorsun. Peki aynı şehri koruyabilir misin?', hint: 'STRES TESTİ SONUCU' },
    { speaker: 'ARAS', text: 'Gördün mü? Her şeyi aynı anda onaramayız. Yüz kredimiz var. Bir seçim, başka bir ihtimalden vazgeçmek demek.', hint: 'ARAS / KENT MÜHENDİSLİĞİ' },
    { speaker: 'MİRA', text: 'Fırtınayı değiştiremeyiz. Ama insanları, altyapıyı ve birbirimize ulaşma şeklimizi değiştirebiliriz.', hint: 'MİRA / İKLİM BİLİMİ' },
  ],
};

function Sound({ muted, onToggle, onSettings }: { muted: boolean; onToggle: () => void; onSettings: () => void }) {
  return <div className="audio-actions"><button className="sound-button" onClick={onToggle} aria-label={muted ? 'Sesi aç' : 'Sesi kapat'}>{muted ? <VolumeX size={17} /> : <Volume2 size={17} />}<span>{muted ? 'SESSİZ' : 'SES AÇIK'}</span></button><button className="settings-button" onClick={onSettings} aria-label="Ses ayarlarını aç"><Settings size={16} /></button></div>;
}

function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [muted, setMuted] = useState(false);
  const [musicVolume, setMusicVolume] = useState(58);
  const [sfxVolume, setSfxVolume] = useState(72);
  const [showSettings, setShowSettings] = useState(false);
  const [dialogueStep, setDialogueStep] = useState(0);
  const [selected, setSelected] = useState<DefenseId[]>([]);
  const [hovered, setHovered] = useState<DistrictId | null>(null);
  const [baseline, setBaseline] = useState<SimulationResult>(baselineResult);
  const [finalResult, setFinalResult] = useState<SimulationResult | null>(null);
  const [transition, setTransition] = useState('');
  const playTone = (frequency = 220) => { gameAudio.unlock(); gameAudio.effect(frequency===350?'investment':'click'); };
  const go = (next: Screen) => {
    gameAudio.unlock();
    gameAudio.effect('transition');
    setTransition(({intro:'01 / LALE KENTİ — 2045',stress:'İLK KAYIT / KIRILMA NOKTASI',reversal:'ARTIK TEHDİDİ BİLİYORSUN.',plan:'ŞİMDİ ŞEHRİN YANINDA DUR.',replay:'AYNI FIRTINA / İKİNCİ ŞANS',results:'ŞEHRİN HAFIZASI'} as Partial<Record<Screen,string>>)[next] ?? '');
    setScreen(next); setDialogueStep(0); window.scrollTo(0,0);
  };
  useEffect(()=>{if(!transition)return;const t=setTimeout(()=>setTransition(''),1200);return()=>clearTimeout(t)},[transition]);
  useEffect(()=>{gameAudio.setScene(screen)},[screen]);
  useEffect(()=>{gameAudio.setLevels(musicVolume,sfxVolume,muted)},[musicVolume,sfxVolume,muted]);
  useEffect(()=>()=>gameAudio.dispose(),[]);
  const currentDialogue = dialogue[screen]?.[dialogueStep];
  const budgetUsed = selected.reduce((sum, id) => sum + DEFENSES.find((d) => d.id === id)!.cost, 0);
  const projected = useMemo(() => calculateImpact(selected), [selected]);

  useEffect(() => { if (screen === 'stress') setBaseline(baselineResult); }, [screen]);
  useEffect(()=>{const close=(event:KeyboardEvent)=>{if(event.key==='Escape')setShowSettings(false)};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close)},[]);
  const start = () => { setSelected([]); setFinalResult(null); go('intro'); };
  const advanceDialogue = () => { if (dialogueStep < (dialogue[screen]?.length ?? 1) - 1) { playTone(330); setDialogueStep((s) => s + 1); } else go(screen === 'intro' ? 'stress' : 'plan'); };
  const toggleDefense = (id: DefenseId) => { const defense = DEFENSES.find((d) => d.id === id)!; if (!selected.includes(id) && budgetUsed + defense.cost > BUDGET) return; playTone(350); setSelected((items) => items.includes(id) ? items.filter((x) => x !== id) : [...items, id]); };

  return <div className={`game-shell screen-${screen}`} onPointerDownCapture={()=>gameAudio.unlock()} onKeyDownCapture={()=>gameAudio.unlock()}>
    <div className="grain" />
    {transition && <div className="chapter-curtain" key={transition} aria-live="polite"><small>FELAKET BENİM</small><strong>{transition}</strong></div>}
    <header className="topbar"><div className="brand-mark">F<span>/</span>B</div><div className="chapter">{screen === 'menu' ? 'İKLİM SİMÜLASYONU' : `BÖLÜM ${screen === 'plan' || screen === 'replay' || screen === 'results' ? '02' : '01'} / 02`}</div><Sound muted={muted} onToggle={() => setMuted((m) => !m)} onSettings={() => setShowSettings((open) => !open)} /></header>
    {showSettings && <aside className="audio-popover"><button className="settings-close" aria-label="Ayarları kapat" onClick={()=>setShowSettings(false)}>×</button><div className="panel-label">SES KONTROLÜ</div><label>MÜZİK <input aria-label="Müzik seviyesi" type="range" min="0" max="100" value={musicVolume} onChange={(event) => setMusicVolume(Number(event.target.value))} /><b>{musicVolume}</b></label><label>EFEKTLER <input aria-label="Efekt seviyesi" type="range" min="0" max="100" value={sfxVolume} onChange={(event) => setSfxVolume(Number(event.target.value))} /><b>{sfxVolume}</b></label><button className="text-button" onClick={() => setMuted((m) => !m)}>{muted ? 'SESSİZİ KALDIR' : 'TÜMÜNÜ SUSTUR'}</button></aside>}
    {screen === 'menu' && <GameMenu start={start} settings={()=>setShowSettings(true)} about={()=>go('credits')}/>} 
    {screen === 'credits' && <main className="simple-view"><div className="eyebrow">FELAKET BENİM / KÜNYE</div><h2>Bir oyun, iki gelecek.</h2><p>FELAKET BENİM, GameUP Türkiye 2026 İklim Oyunu Hackathonu için geliştirilmiş, kısa anlatı ve strateji deneyimidir.</p><div className="credit-grid"><div><span>YARATICI REHBER</span><strong>Mira</strong><small>İklim bilimci</small></div><div><span>SİSTEM MÜHENDİSİ</span><strong>Aras</strong><small>Altyapı ve bütçe</small></div><div><span>ANLATICI</span><strong>EKO</strong><small>Simülasyon zekâsı</small></div></div><button className="primary-button" onClick={() => go('menu')}>MENÜYE DÖN</button></main>}
    {currentDialogue && <main className="dialogue-view"><div className="dialogue-art"><CityArtwork /><div key={currentDialogue.speaker} className={`portrait ${currentDialogue.speaker.toLocaleLowerCase("tr")}`}><img src={CHARACTERS[currentDialogue.speaker].image} alt={CHARACTERS[currentDialogue.speaker].alt} loading="eager" /></div></div><section className="dialogue-panel"><div className="speaker-line"><span className={`speaker-tag ${currentDialogue.speaker.toLocaleLowerCase("tr")}`}>{currentDialogue.speaker}</span><span className="dialogue-role">{CHARACTERS[currentDialogue.speaker].role}</span><span className="dialogue-hint">{currentDialogue.hint}</span></div><p key={`${screen}-${dialogueStep}`}>{currentDialogue.text}</p><button className="round-next" onClick={advanceDialogue} aria-label="Devam et"><ArrowRight size={20} /></button><div className="progress-dots">{(dialogue[screen] ?? []).map((_, i) => <i key={i} className={i <= dialogueStep ? 'active' : ''} />)}</div></section></main>}
    {screen === 'stress' && <StressTest hovered={hovered} setHovered={setHovered} result={baseline} onContinue={() => go('reversal')} />}
    {screen === 'plan' && <Strategy selected={selected} budgetUsed={budgetUsed} projected={projected} toggle={toggleDefense} onContinue={() => go('replay')} />}
    {screen === 'replay' && <SecondStorm selected={selected} projected={projected} onContinue={() => { setFinalResult(projected); go('results'); }} />}
    {screen === 'results' && finalResult && <CityMemory selected={selected} baseline={baseline} finalResult={finalResult} onRestart={start} />}
    {screen !== 'menu' && screen !== 'credits' && <button className="restart-mini" onClick={start}><RotateCcw size={13} /> Baştan başla</button>}
  </div>;
}

function CityArtwork({ animated = false }: { animated?: boolean }) { return <div className={`city-art ${animated ? 'art-animated' : ''}`}><div className="moon" /><div className="cloud cloud-a" /><div className="cloud cloud-b" /><div className="rain" /><svg viewBox="0 0 600 420" role="img" aria-label="Yağmur altındaki şehir"><path className="mountain" d="M0 275 90 150l70 74 88-136 118 167 70-78 164 98v145H0Z" /><path className="water" d="M0 345c90-29 170 22 270-5s180 14 330-18v98H0Z" /><g className="buildings"><path d="M80 272h70v93H80zM164 238h76v127h-76zM257 200h68v165h-68zM341 251h92v114h-92zM452 220h56v145h-56z" /><path className="tower" d="m270 200 20-41 20 41v165h-40z" /></g><g className="windows">{Array.from({ length: 22 }, (_, i) => <rect key={i} x={92 + (i % 5) * 76} y={260 + Math.floor(i / 5) * 24} width="9" height="13" rx="2" />)}</g><path className="road" d="M0 380h600" /></svg><div className="city-label">İSİMSİZ ŞEHİR / SEKTÖR 04</div></div> }

function StressTest({ result, hovered, setHovered, onContinue }: { result: SimulationResult; hovered: DistrictId | null; setHovered: (id: DistrictId | null) => void; onContinue: () => void }) { return <main className="game-view stress-view"><div className="view-heading"><div><div className="eyebrow danger">FAZ 01 / STRES TESTİ</div><h2>Sistemi zorla.</h2><p>88 mm/saat yağış. Savunma yok. Şehir nerede kırılacak?</p></div><div className="hazard-readout"><span>YAĞIŞ ŞİDDETİ</span><strong>88 <small>mm/h</small></strong><div className="meter"><i style={{ width: '88%' }} /></div></div></div><div className="map-layout"><div className="map-card"><div className="map-stamp">CANLI SİMÜLASYON <i /></div><CityScene result={result} /><div className="map-legend"><span><i className="legend-dot flood" /> taşkın</span><span><i className="legend-dot route" /> tahliye rotası</span><span>Bölge düğmelerine dokunarak incele</span></div></div><aside className="impact-panel"><div className="panel-label">HASAR RAPORU</div>{DISTRICTS.map((d, i) => <div className={`impact-row ${hovered === d.id ? 'row-focus' : ''}`} key={d.id}><div><b>{d.name}</b><small>{d.subtitle}</small></div><strong className={result.districts[i].damage > 100 ? 'red' : ''}>{result.districts[i].damage}<small> puan</small></strong></div>)}<div className="impact-total"><span>ORTALAMA HASAR</span><b>{result.totalDamage}<small> puan</small></b></div><button className="primary-button full" onClick={onContinue}>SONUCU KAYDET <ArrowRight size={16} /></button></aside></div></main> }






export default App;
