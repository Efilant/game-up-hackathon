import { describe, expect, it } from 'vitest';
import { CURRENT_SAVE_VERSION, migrateQuestSave } from './saveMigration';

describe('quest save migration', () => {
  it('upgrades an old save without losing progress', () => {
    const migrated = migrateQuestSave({ questStep: 4, activeDefenses: ['sünger'] });
    expect(migrated).toMatchObject({
      questStep: 4,
      activeDefenses: ['sünger'],
      saveVersion: CURRENT_SAVE_VERSION,
      gameMode: 'relaxed',
      rescueCount: 0,
      achievements: {},
    });
  });

  it('rejects malformed save payloads', () => {
    expect(migrateQuestSave(null)).toBeNull();
    expect(migrateQuestSave([])).toBeNull();
  });
});
