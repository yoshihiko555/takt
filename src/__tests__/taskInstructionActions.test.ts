import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockRequeueTask,
  mockRunInstructMode,
  mockDispatchConversationAction,
  mockSelectPiece,
  mockConfirm,
  mockGetLabel,
  mockResolveLanguage,
  mockListRecentRuns,
  mockSelectRun,
  mockLoadRunSessionContext,
} = vi.hoisted(() => ({
  mockRequeueTask: vi.fn(),
  mockRunInstructMode: vi.fn(),
  mockDispatchConversationAction: vi.fn(),
  mockSelectPiece: vi.fn(),
  mockConfirm: vi.fn(),
  mockGetLabel: vi.fn(),
  mockResolveLanguage: vi.fn(() => 'en'),
  mockListRecentRuns: vi.fn(() => []),
  mockSelectRun: vi.fn(() => null),
  mockLoadRunSessionContext: vi.fn(),
}));

vi.mock('../infra/task/index.js', () => ({
  detectDefaultBranch: vi.fn(() => 'main'),
  TaskRunner: class {
    requeueTask(...args: unknown[]) {
      return mockRequeueTask(...args);
    }
  },
}));

vi.mock('../infra/config/index.js', () => ({
  loadGlobalConfig: vi.fn(() => ({ interactivePreviewMovements: 3, language: 'en' })),
  getPieceDescription: vi.fn(() => ({
    name: 'default',
    description: 'desc',
    pieceStructure: [],
    movementPreviews: [],
  })),
}));

vi.mock('../features/tasks/list/instructMode.js', () => ({
  runInstructMode: (...args: unknown[]) => mockRunInstructMode(...args),
}));

vi.mock('../features/tasks/add/index.js', () => ({
  saveTaskFile: vi.fn(),
}));

vi.mock('../features/pieceSelection/index.js', () => ({
  selectPiece: (...args: unknown[]) => mockSelectPiece(...args),
}));

vi.mock('../features/interactive/actionDispatcher.js', () => ({
  dispatchConversationAction: (...args: unknown[]) => mockDispatchConversationAction(...args),
}));

vi.mock('../shared/prompt/index.js', () => ({
  confirm: (...args: unknown[]) => mockConfirm(...args),
}));

vi.mock('../shared/i18n/index.js', () => ({
  getLabel: (...args: unknown[]) => mockGetLabel(...args),
}));

vi.mock('../features/interactive/index.js', () => ({
  resolveLanguage: (...args: unknown[]) => mockResolveLanguage(...args),
  listRecentRuns: (...args: unknown[]) => mockListRecentRuns(...args),
  selectRun: (...args: unknown[]) => mockSelectRun(...args),
  loadRunSessionContext: (...args: unknown[]) => mockLoadRunSessionContext(...args),
}));

vi.mock('../shared/ui/index.js', () => ({
  info: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock('../shared/utils/index.js', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

import { instructBranch } from '../features/tasks/list/taskActions.js';

describe('instructBranch requeue flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectPiece.mockResolvedValue('default');
    mockRunInstructMode.mockResolvedValue({ action: 'execute', task: '追加指示A' });
    mockDispatchConversationAction.mockImplementation(async (_result, handlers) => handlers.execute({ task: '追加指示A' }));
    mockConfirm.mockResolvedValue(true);
    mockGetLabel.mockReturnValue("Reference a previous run's results?");
    mockResolveLanguage.mockReturnValue('en');
    mockListRecentRuns.mockReturnValue([]);
    mockSelectRun.mockResolvedValue(null);
  });

  it('should requeue the same completed task instead of creating another task', async () => {
    const result = await instructBranch('/project', {
      kind: 'completed',
      name: 'done-task',
      createdAt: '2026-02-14T00:00:00.000Z',
      filePath: '/project/.takt/tasks.yaml',
      content: 'done',
      branch: 'takt/done-task',
      worktreePath: '/project/.takt/worktrees/done-task',
      data: { task: 'done', retry_note: '既存ノート' },
    });

    expect(result).toBe(true);
    expect(mockRequeueTask).toHaveBeenCalledWith(
      'done-task',
      ['completed', 'failed'],
      undefined,
      '既存ノート\n\n追加指示A',
    );
  });

  it('should set generated instruction as retry note when no existing note', async () => {
    await instructBranch('/project', {
      kind: 'completed',
      name: 'done-task',
      createdAt: '2026-02-14T00:00:00.000Z',
      filePath: '/project/.takt/tasks.yaml',
      content: 'done',
      branch: 'takt/done-task',
      worktreePath: '/project/.takt/worktrees/done-task',
      data: { task: 'done' },
    });

    expect(mockRequeueTask).toHaveBeenCalledWith(
      'done-task',
      ['completed', 'failed'],
      undefined,
      '追加指示A',
    );
  });

  it('should load selected run context and pass it to instruct mode', async () => {
    mockListRecentRuns.mockReturnValue([
      { slug: 'run-1', task: 'fix', piece: 'default', status: 'completed', startTime: '2026-02-18T00:00:00Z' },
    ]);
    mockSelectRun.mockResolvedValue('run-1');
    const runContext = { task: 'fix', piece: 'default', status: 'completed', movementLogs: [], reports: [] };
    mockLoadRunSessionContext.mockReturnValue(runContext);

    await instructBranch('/project', {
      kind: 'completed',
      name: 'done-task',
      createdAt: '2026-02-14T00:00:00.000Z',
      filePath: '/project/.takt/tasks.yaml',
      content: 'done',
      branch: 'takt/done-task',
      worktreePath: '/project/.takt/worktrees/done-task',
      data: { task: 'done' },
    });

    expect(mockConfirm).toHaveBeenCalledWith("Reference a previous run's results?", false);
    expect(mockSelectRun).toHaveBeenCalledWith('/project', 'en');
    expect(mockLoadRunSessionContext).toHaveBeenCalledWith('/project', 'run-1');
    expect(mockRunInstructMode).toHaveBeenCalledWith(
      '/project',
      expect.any(String),
      'takt/done-task',
      expect.anything(),
      runContext,
    );
  });
});
