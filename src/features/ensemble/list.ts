/**
 * Ensemble package listing.
 *
 * Scans the ensemble directory for installed packages and reads their
 * metadata (description, ref, truncated commit SHA) for display.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parseTaktPackConfig } from './takt-pack-config.js';
import { parseLockFile } from './lock-file.js';
import { createLogger, getErrorMessage } from '../../shared/utils/index.js';

const log = createLogger('ensemble-list');

export interface PackageInfo {
  /** e.g. "@nrslib/takt-fullstack" */
  scope: string;
  description?: string;
  ref: string;
  /** First 7 characters of the commit SHA. */
  commit: string;
}

/**
 * Read package metadata from a package directory.
 *
 * @param packageDir - absolute path to the package directory
 * @param scope      - e.g. "@nrslib/takt-fullstack"
 */
export function readPackageInfo(packageDir: string, scope: string): PackageInfo {
  const packConfigPath = join(packageDir, 'takt-package.yaml');
  const lockPath = join(packageDir, '.takt-pack-lock.yaml');

  const configYaml = existsSync(packConfigPath)
    ? readFileSync(packConfigPath, 'utf-8')
    : '';
  const config = parseTaktPackConfig(configYaml);

  const lockYaml = existsSync(lockPath)
    ? readFileSync(lockPath, 'utf-8')
    : '';
  const lock = parseLockFile(lockYaml);

  return {
    scope,
    description: config.description,
    ref: lock.ref,
    commit: lock.commit.slice(0, 7),
  };
}

/**
 * List all installed packages under the ensemble directory.
 *
 * Directory structure:
 *   ensembleDir/
 *     @{owner}/
 *       {repo}/
 *         takt-package.yaml
 *         .takt-pack-lock.yaml
 *
 * @param ensembleDir - absolute path to the ensemble root (~/.takt/ensemble)
 */
export function listPackages(ensembleDir: string): PackageInfo[] {
  if (!existsSync(ensembleDir)) return [];

  const packages: PackageInfo[] = [];

  for (const ownerEntry of readdirSync(ensembleDir)) {
    if (!ownerEntry.startsWith('@')) continue;
    const ownerDir = join(ensembleDir, ownerEntry);
    try { if (!statSync(ownerDir).isDirectory()) continue; } catch (e) { log.debug(`stat failed for ${ownerDir}: ${getErrorMessage(e)}`); continue; }

    for (const repoEntry of readdirSync(ownerDir)) {
      const packageDir = join(ownerDir, repoEntry);
      try { if (!statSync(packageDir).isDirectory()) continue; } catch (e) { log.debug(`stat failed for ${packageDir}: ${getErrorMessage(e)}`); continue; }
      const scope = `${ownerEntry}/${repoEntry}`;
      packages.push(readPackageInfo(packageDir, scope));
    }
  }

  return packages;
}
