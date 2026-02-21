/**
 * takt ensemble remove — remove an installed ensemble package.
 */

import { rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { getEnsembleDir, getEnsemblePackageDir, getGlobalConfigDir, getGlobalPiecesDir, getProjectPiecesDir } from '../../infra/config/paths.js';
import { findScopeReferences, shouldRemoveOwnerDir } from '../../features/ensemble/remove.js';
import { confirm } from '../../shared/prompt/index.js';
import { info, success } from '../../shared/ui/index.js';

export async function ensembleRemoveCommand(scope: string): Promise<void> {
  if (!scope.startsWith('@')) {
    throw new Error(`Invalid scope: "${scope}". Expected @{owner}/{repo}`);
  }
  const withoutAt = scope.slice(1);
  const slashIdx = withoutAt.indexOf('/');
  if (slashIdx < 0) {
    throw new Error(`Invalid scope: "${scope}". Expected @{owner}/{repo}`);
  }
  const owner = withoutAt.slice(0, slashIdx);
  const repo = withoutAt.slice(slashIdx + 1);

  const ensembleDir = getEnsembleDir();
  const packageDir = getEnsemblePackageDir(owner, repo);

  if (!existsSync(packageDir)) {
    throw new Error(`Package not found: ${scope}`);
  }

  const refs = findScopeReferences(scope, {
    piecesDirs: [getGlobalPiecesDir(), getProjectPiecesDir(process.cwd())],
    categoriesFiles: [join(getGlobalConfigDir(), 'preferences', 'piece-categories.yaml')],
  });
  if (refs.length > 0) {
    info(`⚠ 以下のファイルが ${scope} を参照しています:`);
    for (const ref of refs) {
      info(`  ${ref.filePath}`);
    }
  }

  const confirmed = await confirm(`${scope} を削除しますか？`, false);
  if (!confirmed) {
    info('キャンセルしました');
    return;
  }

  rmSync(packageDir, { recursive: true, force: true });

  const ownerDir = join(ensembleDir, `@${owner}`);
  if (shouldRemoveOwnerDir(ownerDir, repo)) {
    rmSync(ownerDir, { recursive: true, force: true });
  }

  success(`${scope} を削除しました`);
}
