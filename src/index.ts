/**
 * TAKT - TAKT Agent Koordination Topology
 *
 * This module exports the public API for programmatic usage.
 */

// Models
export type {
  Status,
  PieceRule,
  PieceMovement,
  PieceConfig,
  PieceState,
  Language,
  PartDefinition,
  PartResult,
} from './core/models/types.js';

// Configuration
export {
  loadPiece,
  loadPieceByIdentifier,
  listPieces,
  listPieceEntries,
  loadAllPieces,
  loadAllPiecesWithSources,
  getPieceDescription,
  getBuiltinPiece,
  isPiecePath,
} from './infra/config/loaders/index.js';
export type { PieceSource, PieceWithSource, PieceDirEntry } from './infra/config/loaders/index.js';
export {
  loadProjectConfig,
  saveProjectConfig,
  updateProjectConfig,
  getCurrentPiece,
  setCurrentPiece,
  isVerboseMode,
  type ProjectLocalConfig,
} from './infra/config/project/index.js';

// Piece engine
export {
  PieceEngine,
  COMPLETE_MOVEMENT,
  ABORT_MOVEMENT,
  ERROR_MESSAGES,
  determineNextMovementByRules,
  extractBlockedPrompt,
  LoopDetector,
  createInitialState,
  addUserInput,
  getPreviousOutput,
  handleBlocked,
  isOutputContractItem,
  executeAgent,
  generateReport,
  executePart,
  judgeStatus,
  evaluateCondition,
  decomposeTask,
} from './core/piece/index.js';
export type {
  PieceEvents,
  UserInputRequest,
  IterationLimitRequest,
  SessionUpdateCallback,
  IterationLimitCallback,
  PieceEngineOptions,
  LoopCheckResult,
  ProviderType,
  JudgeStatusResult,
  BlockedHandlerResult,
} from './core/piece/index.js';
