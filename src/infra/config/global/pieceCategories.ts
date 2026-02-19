/**
 * Piece categories file management.
 *
 * User category file is treated as overlay on top of builtin categories.
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { getGlobalConfigDir } from '../paths.js';
import { loadConfig } from '../loadConfig.js';

const INITIAL_USER_CATEGORIES_CONTENT = 'piece_categories: {}\n';

function getDefaultPieceCategoriesPath(): string {
  return join(getGlobalConfigDir(), 'preferences', 'piece-categories.yaml');
}

/** Get the path to the user's piece categories file. */
export function getPieceCategoriesPath(cwd: string): string {
  const config = loadConfig(cwd);
  if (config.pieceCategoriesFile) {
    return config.pieceCategoriesFile;
  }
  return getDefaultPieceCategoriesPath();
}

/**
 * Reset user categories overlay file to initial content.
 */
export function resetPieceCategories(cwd: string): void {
  const userPath = getPieceCategoriesPath(cwd);
  const dir = dirname(userPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(userPath, INITIAL_USER_CATEGORIES_CONTENT, 'utf-8');
}
