/**
 * takt ensemble list — list installed ensemble packages.
 */

import { getEnsembleDir } from '../../infra/config/paths.js';
import { listPackages } from '../../features/ensemble/list.js';
import { info } from '../../shared/ui/index.js';

export async function ensembleListCommand(): Promise<void> {
  const packages = listPackages(getEnsembleDir());

  if (packages.length === 0) {
    info('インストール済みパッケージはありません');
    return;
  }

  info('📦 インストール済みパッケージ:');
  for (const pkg of packages) {
    const desc = pkg.description ? `  ${pkg.description}` : '';
    info(`  ${pkg.scope}${desc}  (${pkg.ref} ${pkg.commit})`);
  }
}
