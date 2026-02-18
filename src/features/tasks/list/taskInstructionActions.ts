import { execFileSync } from 'node:child_process';
import {
  TaskRunner,
} from '../../../infra/task/index.js';
import { loadGlobalConfig, getPieceDescription } from '../../../infra/config/index.js';
import { info, success } from '../../../shared/ui/index.js';
import { createLogger, getErrorMessage } from '../../../shared/utils/index.js';
import type { TaskExecutionOptions } from '../execute/types.js';
import { runInstructMode } from './instructMode.js';
import { selectPiece } from '../../pieceSelection/index.js';
import { dispatchConversationAction } from '../../interactive/actionDispatcher.js';
import type { PieceContext } from '../../interactive/interactive.js';
import { resolveLanguage } from '../../interactive/index.js';
import { type BranchActionTarget, resolveTargetBranch } from './taskActionTarget.js';
import { detectDefaultBranch } from '../../../infra/task/index.js';
import { appendRetryNote, selectRunSessionContext } from './requeueHelpers.js';

const log = createLogger('list-tasks');

function getBranchContext(projectDir: string, branch: string): string {
  const defaultBranch = detectDefaultBranch(projectDir);
  const lines: string[] = [];

  try {
    const diffStat = execFileSync(
      'git', ['diff', '--stat', `${defaultBranch}...${branch}`],
      { cwd: projectDir, encoding: 'utf-8', stdio: 'pipe' },
    ).trim();
    if (diffStat) {
      lines.push('## 現在の変更内容（mainからの差分）');
      lines.push('```');
      lines.push(diffStat);
      lines.push('```');
    }
  } catch (err) {
    log.debug('Failed to collect branch diff stat for instruction context', {
      branch,
      defaultBranch,
      error: getErrorMessage(err),
    });
  }

  try {
    const commitLog = execFileSync(
      'git', ['log', '--oneline', `${defaultBranch}..${branch}`],
      { cwd: projectDir, encoding: 'utf-8', stdio: 'pipe' },
    ).trim();
    if (commitLog) {
      lines.push('');
      lines.push('## コミット履歴');
      lines.push('```');
      lines.push(commitLog);
      lines.push('```');
    }
  } catch (err) {
    log.debug('Failed to collect branch commit log for instruction context', {
      branch,
      defaultBranch,
      error: getErrorMessage(err),
    });
  }

  return lines.length > 0 ? `${lines.join('\n')}\n\n` : '';
}

export async function instructBranch(
  projectDir: string,
  target: BranchActionTarget,
  _options?: TaskExecutionOptions,
): Promise<boolean> {
  if (!('kind' in target)) {
    throw new Error('Instruct requeue requires a task target.');
  }

  const branch = resolveTargetBranch(target);

  const selectedPiece = await selectPiece(projectDir);
  if (!selectedPiece) {
    info('Cancelled');
    return false;
  }

  const globalConfig = loadGlobalConfig();
  const pieceDesc = getPieceDescription(selectedPiece, projectDir, globalConfig.interactivePreviewMovements);
  const pieceContext: PieceContext = {
    name: pieceDesc.name,
    description: pieceDesc.description,
    pieceStructure: pieceDesc.pieceStructure,
    movementPreviews: pieceDesc.movementPreviews,
  };

  const lang = resolveLanguage(globalConfig.language);
  const runSessionContext = await selectRunSessionContext(projectDir, lang);

  const branchContext = getBranchContext(projectDir, branch);
  const result = await runInstructMode(projectDir, branchContext, branch, pieceContext, runSessionContext);

  const requeueWithInstruction = async (instruction: string): Promise<boolean> => {
    const runner = new TaskRunner(projectDir);
    const retryNote = appendRetryNote(target.data?.retry_note, instruction);
    runner.requeueTask(target.name, ['completed', 'failed'], undefined, retryNote);
    success(`Task requeued with additional instructions: ${target.name}`);
    info(`  Branch: ${branch}`);
    log.info('Requeued task from instruct mode', {
      name: target.name,
      branch,
      piece: selectedPiece,
    });
    return true;
  };

  return dispatchConversationAction(result, {
    cancel: () => {
      info('Cancelled');
      return false;
    },
    execute: async ({ task }) => requeueWithInstruction(task),
    save_task: async ({ task }) => requeueWithInstruction(task),
  });
}
