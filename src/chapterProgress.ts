export type GameMode = 'relaxed' | 'adventure';

export interface ChapterScoringConfig {
  adventureDeadlineSeconds: number;
  threeStarMinimumBudget: number;
}

export const DEFAULT_CHAPTER_SCORING: ChapterScoringConfig = {
  adventureDeadlineSeconds: 240,
  threeStarMinimumBudget: 20,
};

export interface ChapterOutcomeInput {
  missionComplete: boolean;
  hospitalRoadPassable: boolean;
  citizensSafe: boolean;
  rescueCount: number;
  temporaryRoadClosure: boolean;
  elapsedSeconds: number;
  budgetRemaining: number;
  mode: GameMode;
  config?: ChapterScoringConfig;
}

export interface ChapterOutcome {
  success: boolean;
  stars: 0 | 1 | 2 | 3;
  reason: string;
  timeQualified: boolean;
}

export function evaluateChapterOutcome(input: ChapterOutcomeInput): ChapterOutcome {
  const config = input.config ?? DEFAULT_CHAPTER_SCORING;
  const timeQualified = input.mode === 'relaxed' || input.elapsedSeconds <= config.adventureDeadlineSeconds;
  const success = input.missionComplete && input.hospitalRoadPassable && input.citizensSafe && timeQualified;

  if (!success) {
    return {
      success: false,
      stars: 0,
      reason: input.mode === 'adventure' && !timeQualified
        ? 'Süre doldu; bu kez yetişemedik.'
        : 'Hastane erişimi veya vatandaş güvenliği korunamadı.',
      timeQualified,
    };
  }

  if (input.rescueCount > 0 || input.temporaryRoadClosure) {
    return { success: true, stars: 1, reason: 'Hastane kurtarıldı; ancak güvenlikte kritik bir aksama yaşandı.', timeQualified };
  }

  const threeStar = input.budgetRemaining >= config.threeStarMinimumBudget && timeQualified;
  return threeStar
    ? { success: true, stars: 3, reason: 'Hastane açık kaldı, vatandaşlar güvende ve kaynaklar verimli kullanıldı.', timeQualified }
    : { success: true, stars: 2, reason: 'Hastane kurtarıldı; daha verimli bir planla üç yıldıza ulaşılabilir.', timeQualified };
}

export interface ChapterRecord {
  bestStars: 0 | 1 | 2 | 3;
  completionCount: number;
  bestTimeSeconds?: number;
  bestBudgetRemaining: number;
  rescueCount: number;
  hospitalRoadPassable: boolean;
}

export function mergeChapterRecord(previous: ChapterRecord | undefined, outcome: ChapterOutcome, input: ChapterOutcomeInput): ChapterRecord {
  const nextBestStars = Math.max(previous?.bestStars ?? 0, outcome.stars) as 0 | 1 | 2 | 3;
  const bestTimeSeconds = outcome.success && input.mode === 'adventure'
    ? Math.min(previous?.bestTimeSeconds ?? Infinity, input.elapsedSeconds)
    : previous?.bestTimeSeconds;
  return {
    bestStars: nextBestStars,
    completionCount: (previous?.completionCount ?? 0) + (outcome.success ? 1 : 0),
    bestTimeSeconds: Number.isFinite(bestTimeSeconds) ? bestTimeSeconds : undefined,
    bestBudgetRemaining: Math.max(previous?.bestBudgetRemaining ?? 0, input.budgetRemaining),
    rescueCount: Math.min(previous?.rescueCount ?? Number.MAX_SAFE_INTEGER, input.rescueCount),
    hospitalRoadPassable: previous?.hospitalRoadPassable === true || input.hospitalRoadPassable,
  };
}

export type AchievementId =
  | 'first_step'
  | 'curious_explorer'
  | 'adaptation_master'
  | 'water_guardian'
  | 'hospital_hero'
  | 'community_friend'
  | 'three_star_legend'
  | 'city_explorer';

export interface AchievementDefinition {
  id: AchievementId;
  title: string;
  description: string;
  icon: string;
}

export const ACHIEVEMENTS: readonly AchievementDefinition[] = [
  { id: 'first_step', title: 'İLK ADIM', description: 'İlk anlamlı görev etkileşimini tamamla.', icon: '✦' },
  { id: 'curious_explorer', title: 'MERAKLI KAŞİF', description: 'Gerekli inceleme noktalarını ziyaret et.', icon: '⌕' },
  { id: 'adaptation_master', title: 'UYUM USTASI', description: 'İlk geçerli iklim uyum çözümünü inşa et.', icon: '✣' },
  { id: 'water_guardian', title: 'SU KORUYUCUSU', description: 'Su yönetimi savunmasıyla taşkın etkisini azalt.', icon: '≈' },
  { id: 'hospital_hero', title: 'HASTANE KAHRAMANI', description: 'Hastane erişimini başarıyla koru veya geri getir.', icon: '✚' },
  { id: 'community_friend', title: 'TOPLUM DOSTU', description: 'Vatandaşları güvende tutarak senaryoyu tamamla.', icon: '♥' },
  { id: 'three_star_legend', title: 'ÜÇ YILDIZ EFSANESİ', description: 'Bir bölümde üç yıldız kazan.', icon: '★' },
  { id: 'city_explorer', title: 'ŞEHİR KAŞİFİ', description: 'Şehrin dört mahallesini normal hareketle ziyaret et.', icon: '⌖' },
];

export interface AchievementRecord {
  unlockedAt: string;
}

export function getAchievementUnlocks(input: {
  firstInteraction: boolean;
  inspectedLocations: number;
  adaptationBuilt: boolean;
  floodReduced: boolean;
  hospitalHero: boolean;
  citizensSafe: boolean;
  stars: number;
  allDistrictsVisited?: boolean;
}): AchievementId[] {
  const unlocked: AchievementId[] = [];
  if (input.firstInteraction) unlocked.push('first_step');
  if (input.inspectedLocations >= 2) unlocked.push('curious_explorer');
  if (input.adaptationBuilt) unlocked.push('adaptation_master');
  if (input.floodReduced) unlocked.push('water_guardian');
  if (input.hospitalHero) unlocked.push('hospital_hero');
  if (input.citizensSafe) unlocked.push('community_friend');
  if (input.stars >= 3) unlocked.push('three_star_legend');
  if (input.allDistrictsVisited) unlocked.push('city_explorer');
  return unlocked;
}
