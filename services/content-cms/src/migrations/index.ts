import * as migration_20261101_074512_editor_initial from './20261101_074512_editor_initial';
import * as migration_20261105_063243_unified_content from './20261105_063243_unified_content';

export const migrations = [
  {
    up: migration_20261101_074512_editor_initial.up,
    down: migration_20261101_074512_editor_initial.down,
    name: '20261101_074512_editor_initial',
  },
  {
    up: migration_20261105_063243_unified_content.up,
    down: migration_20261105_063243_unified_content.down,
    name: '20261105_063243_unified_content'
  },
];
