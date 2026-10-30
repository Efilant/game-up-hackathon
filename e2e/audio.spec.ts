import { test, expect } from '@playwright/test';

test('Gerçek ses sinyali, bağımsız kanallar ve sessize alma', async ({ page }) => {
  await page.addInitScript(() => {
    const audit = { analysers: [] as AnalyserNode[], contexts: [] as AudioContext[] };
    (window as any).__soundAudit = audit;
    const Native = window.AudioContext;
    window.AudioContext = class extends Native {
      constructor(...args: ConstructorParameters<typeof AudioContext>) { super(...args); audit.contexts.push(this); }
    };
    const connect = AudioNode.prototype.connect;
    AudioNode.prototype.connect = function(destination: any, ...args: any[]) {
      if (destination instanceof AudioDestinationNode) {
        const analyser = (this.context as AudioContext).createAnalyser();
        analyser.fftSize = 2048;
        connect.call(this, analyser);
        audit.analysers.push(analyser);
      }
      return (connect as any).call(this, destination, ...args);
    } as any;
  });
  await page.goto('/');
  expect(await page.evaluate(() => (window as any).__soundAudit.contexts.length)).toBe(0);
  await page.getByRole('button', { name: 'AYARLAR', exact: true }).click();
  const rms = () => page.evaluate(() => {
    const a = (window as any).__soundAudit.analysers.at(-1) as AnalyserNode;
    const values = new Float32Array(a.fftSize); a.getFloatTimeDomainData(values);
    return Math.sqrt(values.reduce((sum, n) => sum + n*n, 0) / values.length);
  });
  await page.getByRole('slider', { name: 'Efekt seviyesi' }).fill('0');
  await expect.poll(rms).toBeGreaterThan(0.0001); // Music genuinely renders.
  await page.getByRole('slider', { name: 'Müzik seviyesi' }).fill('0');
  await expect.poll(rms).toBeLessThan(0.000001);
  await page.getByRole('slider', { name: 'Efekt seviyesi' }).fill('70');
  await expect.poll(rms).toBeGreaterThan(0.0001); // Menu rain must live on SFX.
  await page.getByRole('button', { name: 'TÜMÜNÜ SUSTUR' }).click();
  await expect.poll(rms).toBeLessThan(0.000001);
  await page.getByRole('button', { name: 'SESSİZİ KALDIR' }).click();
  await expect.poll(rms).toBeGreaterThan(0.0001);
});

test('Ses API yokken oyun başlatılabilir',async({page})=>{
  const errors: string[]=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{(window as any).AudioContext=undefined;(window as any).webkitAudioContext=undefined});
  await page.goto('/');
  await page.getByRole('button',{name:'BAŞLAT ↗',exact:true}).click();
  await expect(page.getByRole('button',{name:'Devam et'})).toBeVisible();
  expect(errors).toEqual([]);
});
