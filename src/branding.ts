export const BRANDING = {
  title: 'ŞEHRİN YARINI',
  subtitle: 'Çözüm Sende!',
  internalName: 'FELAKET BENİM',
} as const;

export const BRAND_ASSETS = {
  logo: '/assets/branding/sehrin-yarini-logo.png',
  compactMark: '/assets/branding/sehrin-yarini-mark.svg',
  favicon: '/assets/branding/sehrin-yarini-favicon.svg',
  stars: {
    earned: '/assets/ui/star-gold.svg',
    empty: '/assets/ui/star-empty.svg',
  },
  lock: '/assets/ui/lock.svg',
  achievements: {
    first_step: '/assets/achievements/ilk-adim.svg',
    curious_explorer: '/assets/achievements/merakli-kasif.jpeg',
    adaptation_master: '/assets/achievements/uyum-ustasi.jpeg',
    water_guardian: '/assets/achievements/su-koruyucusu.jpeg',
    hospital_hero: '/assets/achievements/hastane-kahramani.jpeg',
    community_friend: '/assets/achievements/toplum-dostu.jpeg',
    three_star_legend: '/assets/achievements/uc-yildiz-efsanesi.jpeg',
    city_explorer: '/assets/achievements/sehir-kasifi.svg',
  },
  chapters: {
    hospital: '/assets/chapters/yamac-hastanesi.svg',
    heat: '/assets/chapters/serin-sehir.svg',
    drought: '/assets/chapters/son-damla.svg',
  },
} as const;

export type AchievementAssetId = keyof typeof BRAND_ASSETS.achievements;

export function getAchievementAsset(id: string): string {
  return BRAND_ASSETS.achievements[id as AchievementAssetId] ?? BRAND_ASSETS.compactMark;
}
