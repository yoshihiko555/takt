/**
 * Retry actions for failed tasks.
 *
 * Provides interactive retry functionality including
 * failure info display and movement selection.
 */

import type { TaskListItem } from '../../../infra/task/index.js';
import { TaskRunner } from '../../../infra/task/index.js';
import { loadPieceByIdentifier, loadGlobalConfig, getPieceDescription } from '../../../infra/config/index.js';
import { selectOption } from '../../../shared/prompt/index.js';
import { success, error as logError, info, header, blankLine, status } from '../../../shared/ui/index.js';
import { createLogger, getErrorMessage } from '../../../shared/utils/index.js';
import type { PieceConfig } from '../../../core/models/index.js';
import { runInstructMode } from './instructMode.js';
import type { PieceContext } from '../../interactive/interactive.js';
import { resolveLanguage, selectRun, loadRunSessionContext, listRecentRuns, type RunSessionContext } from '../../interactive/index.js';
import { getLabel } from '../../../shared/i18n/index.js';
import { confirm } from '../../../shared/prompt/index.js';

const log = createLogger('list-tasks');

function displayFailureInfo(task: TaskListItem): void {
  header(`Failed Task: ${task.name}`);
  info(`  Failed at: ${task.createdAt}`);

  if (task.failure) {
    blankLine();
    if (task.failure.movement) {
      status('Failed at', task.failure.movement, 'red');
    }
    status('Error', task.failure.error, 'red');
    if (task.failure.last_message) {
      status('Last message', task.failure.last_message);
    }
  }

  blankLine();
}

async function selectStartMovement(
  pieceConfig: PieceConfig,
  defaultMovement: string | null,
): Promise<string | null> {
  const movements = pieceConfig.movements.map((m) => m.name);

  const defaultIdx = defaultMovement
    ? movements.indexOf(defaultMovement)
    : 0;
  const effectiveDefault = defaultIdx >= 0 ? movements[defaultIdx] : movements[0];

  const options = movements.map((name) => ({
    label: name === effectiveDefault ? `${name} (default)` : name,
    value: name,
    description: name === pieceConfig.initialMovement ? 'Initial movement' : undefined,
  }));

  return await selectOption<string>('Start from movement:', options);
}

function appendRetryNote(existing: string | undefined, additional: string): string {
  const trimmedAdditional = additional.trim();
  if (trimmedAdditional === '') {
    throw new Error('Additional instruction is empty.');
  }
  if (!existing || existing.trim() === '') {
    return trimmedAdditional;
  }
  return `${existing}\n\n${trimmedAdditional}`;
}

function buildRetryBranchContext(task: TaskListItem): string {
  const lines = [
    '## 失敗情報',
    `- タスク名: ${task.name}`,
    `- 失敗日時: ${task.createdAt}`,
  ];
  if (task.failure?.movement) {
    lines.push(`- 失敗ムーブメント: ${task.failure.movement}`);
  }
  if (task.failure?.error) {
    lines.push(`- エラー: ${task.failure.error}`);
  }
  if (task.failure?.last_message) {
    lines.push(`- 最終メッセージ: ${task.failure.last_message}`);
  }
  if (task.data?.retry_note) {
    lines.push('', '## 既存の再投入メモ', task.data.retry_note);
  }
  return `${lines.join('\n')}\n`;
}

/**
 * Retry a failed task.
 *
 * @returns true if task was requeued, false if cancelled
 */
export async function retryFailedTask(
  task: TaskListItem,
  projectDir: string,
): Promise<boolean> {
  if (task.kind !== 'failed') {
    throw new Error(`retryFailedTask requires failed task. received: ${task.kind}`);
  }

  displayFailureInfo(task);

  const globalConfig = loadGlobalConfig();
  const pieceName = task.data?.piece ?? globalConfig.defaultPiece ?? 'default';
  const pieceConfig = loadPieceByIdentifier(pieceName, projectDir);

  if (!pieceConfig) {
    logError(`Piece "${pieceName}" not found. Cannot determine available movements.`);
    return false;
  }

  const selectedMovement = await selectStartMovement(pieceConfig, task.failure?.movement ?? null);
  if (selectedMovement === null) {
    return false;
  }

  const pieceDesc = getPieceDescription(pieceName, projectDir, globalConfig.interactivePreviewMovements);
  const pieceContext: PieceContext = {
    name: pieceDesc.name,
    description: pieceDesc.description,
    pieceStructure: pieceDesc.pieceStructure,
    movementPreviews: pieceDesc.movementPreviews,
  };

  const lang = resolveLanguage(globalConfig.language);
  let runSessionContext: RunSessionContext | undefined;
  const hasRuns = listRecentRuns(projectDir).length > 0;
  if (hasRuns) {
    const shouldReferenceRun = await confirm(
      getLabel('interactive.runSelector.confirm', lang),
      false,
    );
    if (shouldReferenceRun) {
      const selectedSlug = await selectRun(projectDir, lang);
      if (selectedSlug) {
        runSessionContext = loadRunSessionContext(projectDir, selectedSlug);
      }
    }
  }

  blankLine();
  const branchContext = buildRetryBranchContext(task);
  const branchName = task.branch ?? task.name;
  const instructResult = await runInstructMode(
    projectDir,
    branchContext,
    branchName,
    pieceContext,
    runSessionContext,
  );
  if (instructResult.action !== 'execute') {
    return false;
  }

  try {
    const runner = new TaskRunner(projectDir);
    const startMovement = selectedMovement !== pieceConfig.initialMovement
      ? selectedMovement
      : undefined;
    const retryNote = appendRetryNote(task.data?.retry_note, instructResult.task);

    runner.requeueTask(task.name, ['failed'], startMovement, retryNote);

    success(`Task requeued: ${task.name}`);
    if (startMovement) {
      info(`  Will start from: ${startMovement}`);
    }
    info('  Retry note: updated');
    info(`  File: ${task.filePath}`);

    log.info('Requeued failed task', {
      name: task.name,
      tasksFile: task.filePath,
      startMovement,
      retryNote,
    });

    return true;
  } catch (err) {
    const msg = getErrorMessage(err);
    logError(`Failed to requeue task: ${msg}`);
    log.error('Failed to requeue task', { name: task.name, error: msg });
    return false;
  }
}
