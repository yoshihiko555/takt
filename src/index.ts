/**
 * TAKT - Task Agent Koordination Tool
 *
 * This module exports the public API for programmatic usage.
 */

// Models
export * from './core/models/index.js';

// Configuration
export * from './infra/config/index.js';

// Claude integration
export {
  ClaudeClient,
  ClaudeProcess,
  QueryExecutor,
  QueryRegistry,
  executeClaudeCli,
  executeClaudeQuery,
  generateQueryId,
  hasActiveProcess,
  isQueryActive,
  getActiveQueryCount,
  registerQuery,
  unregisterQuery,
  interruptQuery,
  interruptAllQueries,
  interruptCurrentProcess,
  sdkMessageToStreamEvent,
  createCanUseToolCallback,
  createAskUserQuestionHooks,
  buildSdkOptions,
  callClaude,
  callClaudeCustom,
  callClaudeAgent,
  callClaudeSkill,
  callAiJudge,
  detectRuleIndex,
  detectJudgeIndex,
  buildJudgePrompt,
  isRegexSafe,
} from './claude/index.js';
export type {
  StreamEvent,
  StreamCallback,
  PermissionRequest,
  PermissionHandler,
  AskUserQuestionInput,
  AskUserQuestionHandler,
  ClaudeResult,
  ClaudeResultWithQueryId,
  ClaudeCallOptions,
  ClaudeSpawnOptions,
  InitEventData,
  ToolUseEventData,
  ToolResultEventData,
  ToolOutputEventData,
  TextEventData,
  ThinkingEventData,
  ResultEventData,
  ErrorEventData,
} from './claude/index.js';

// Codex integration
export * from './codex/index.js';

// Agent execution
export * from './agents/index.js';

// Workflow engine
export {
  WorkflowEngine,
  COMPLETE_STEP,
  ABORT_STEP,
  ERROR_MESSAGES,
  determineNextStepByRules,
  extractBlockedPrompt,
  LoopDetector,
  createInitialState,
  addUserInput,
  getPreviousOutput,
  handleBlocked,
  ParallelLogger,
  InstructionBuilder,
  isReportObjectConfig,
  ReportInstructionBuilder,
  StatusJudgmentBuilder,
  buildExecutionMetadata,
  renderExecutionMetadata,
  RuleEvaluator,
  detectMatchedRule,
  evaluateAggregateConditions,
  AggregateEvaluator,
  needsStatusJudgmentPhase,
  runReportPhase,
  runStatusJudgmentPhase,
} from './core/workflow/index.js';
export type {
  WorkflowEvents,
  UserInputRequest,
  IterationLimitRequest,
  SessionUpdateCallback,
  IterationLimitCallback,
  WorkflowEngineOptions,
  LoopCheckResult,
  ProviderType,
  RuleMatch,
  RuleEvaluatorContext,
  ReportInstructionContext,
  StatusJudgmentContext,
  InstructionContext,
  ExecutionMetadata,
  BlockedHandlerResult,
} from './core/workflow/index.js';

// Utilities
export * from './shared/utils/index.js';
export * from './shared/ui/index.js';

// Resources (embedded prompts and templates)
export * from './resources/index.js';
