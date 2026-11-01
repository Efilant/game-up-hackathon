export const CURRENT_SAVE_VERSION = 4;

export interface MigratedQuestSave {
  saveVersion: number;
  [key: string]: unknown;
}

/** Keeps old v1/v2 saves playable while giving new fields safe defaults. */
export function migrateQuestSave(raw: unknown): MigratedQuestSave | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const source = raw as Record<string, unknown>;
  const version = typeof source.saveVersion === 'number' ? source.saveVersion : 1;
  return {
    ...source,
    saveVersion: CURRENT_SAVE_VERSION,
    gameMode: source.gameMode === 'adventure' ? 'adventure' : 'relaxed',
    stormElapsedSeconds: typeof source.stormElapsedSeconds === 'number' ? source.stormElapsedSeconds : 0,
    rescueCount: typeof source.rescueCount === 'number' ? source.rescueCount : 0,
    inspectedLocations: typeof source.inspectedLocations === 'number' ? source.inspectedLocations : 0,
    hadRoadClosure: typeof source.hadRoadClosure === 'boolean' ? source.hadRoadClosure : false,
    achievements: source.achievements && typeof source.achievements === 'object' ? source.achievements : {},
    chapterRecord: source.chapterRecord && typeof source.chapterRecord === 'object' ? source.chapterRecord : null,
    chapterOutcome: source.chapterOutcome && typeof source.chapterOutcome === 'object' ? source.chapterOutcome : null,
    discoveredSolutions: Array.isArray(source.discoveredSolutions) ? source.discoveredSolutions : [],
    investigatedSolutions: Array.isArray(source.investigatedSolutions) ? source.investigatedSolutions : [],
    pendingPlan: Array.isArray(source.pendingPlan) ? source.pendingPlan : [],
    planConfirmed: source.planConfirmed === true,
    migratedFromVersion: version,
  };
}
