/**
 * Tests for addTask command
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { tmpdir } from 'node:os';

// Mock dependencies before importing the module under test
vi.mock('../prompt/index.js', () => ({
  promptInput: vi.fn(),
  promptMultilineInput: vi.fn(),
  confirm: vi.fn(),
  selectOption: vi.fn(),
}));

vi.mock('../task/summarize.js', () => ({
  summarizeTaskName: vi.fn(),
}));

vi.mock('../utils/ui.js', () => ({
  success: vi.fn(),
  info: vi.fn(),
}));

vi.mock('../utils/debug.js', () => ({
  createLogger: () => ({
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock('../config/workflowLoader.js', () => ({
  listWorkflows: vi.fn(),
}));

vi.mock('../config/paths.js', () => ({
  getCurrentWorkflow: vi.fn(() => 'default'),
}));

import { promptMultilineInput, confirm, selectOption } from '../prompt/index.js';
import { summarizeTaskName } from '../task/summarize.js';
import { listWorkflows } from '../config/workflowLoader.js';
import { addTask } from '../commands/addTask.js';

const mockPromptMultilineInput = vi.mocked(promptMultilineInput);
const mockConfirm = vi.mocked(confirm);
const mockSelectOption = vi.mocked(selectOption);
const mockSummarizeTaskName = vi.mocked(summarizeTaskName);
const mockListWorkflows = vi.mocked(listWorkflows);

let testDir: string;

beforeEach(() => {
  vi.clearAllMocks();

  // Create temporary test directory
  testDir = fs.mkdtempSync(path.join(tmpdir(), 'takt-test-'));

  // Default mock setup
  mockListWorkflows.mockReturnValue([]);
  mockConfirm.mockResolvedValue(false);
});

afterEach(() => {
  // Cleanup test directory
  if (testDir && fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true });
  }
});

describe('addTask', () => {
  it('should create task file with AI-generated slug for argument mode', async () => {
    // Given: Task content provided as argument
    mockSummarizeTaskName.mockResolvedValue('add-auth');
    mockConfirm.mockResolvedValue(false);

    // When
    await addTask(testDir, ['認証機能を追加する']);

    // Then
    const tasksDir = path.join(testDir, '.takt', 'tasks');
    const taskFile = path.join(tasksDir, 'add-auth.yaml');
    expect(fs.existsSync(taskFile)).toBe(true);

    const content = fs.readFileSync(taskFile, 'utf-8');
    expect(content).toContain('task: 認証機能を追加する');
  });

  it('should use AI-summarized slug for Japanese task content', async () => {
    // Given: Japanese task
    mockSummarizeTaskName.mockResolvedValue('fix-login-bug');
    mockConfirm.mockResolvedValue(false);

    // When
    await addTask(testDir, ['ログインバグを修正する']);

    // Then
    expect(mockSummarizeTaskName).toHaveBeenCalledWith('ログインバグを修正する', { cwd: testDir });

    const taskFile = path.join(testDir, '.takt', 'tasks', 'fix-login-bug.yaml');
    expect(fs.existsSync(taskFile)).toBe(true);
  });

  it('should handle multiline task content using first line for filename', async () => {
    // Given: Multiline task content in interactive mode
    mockPromptMultilineInput.mockResolvedValue('First line task\nSecond line details');
    mockSummarizeTaskName.mockResolvedValue('first-line-task');
    mockConfirm.mockResolvedValue(false);

    // When
    await addTask(testDir, []);

    // Then
    expect(mockSummarizeTaskName).toHaveBeenCalledWith('First line task', { cwd: testDir });
  });

  it('should use fallback filename when AI returns empty', async () => {
    // Given: AI returns empty slug (which defaults to 'task' in summarizeTaskName)
    mockSummarizeTaskName.mockResolvedValue('task');
    mockConfirm.mockResolvedValue(false);

    // When
    await addTask(testDir, ['test']);

    // Then
    const taskFile = path.join(testDir, '.takt', 'tasks', 'task.yaml');
    expect(fs.existsSync(taskFile)).toBe(true);
  });

  it('should append counter for duplicate filenames', async () => {
    // Given: First task creates 'my-task.yaml'
    mockSummarizeTaskName.mockResolvedValue('my-task');
    mockConfirm.mockResolvedValue(false);

    // When: Create first task
    await addTask(testDir, ['First task']);

    // And: Create second task with same slug
    await addTask(testDir, ['Second task']);

    // Then: Second file should have counter
    const tasksDir = path.join(testDir, '.takt', 'tasks');
    expect(fs.existsSync(path.join(tasksDir, 'my-task.yaml'))).toBe(true);
    expect(fs.existsSync(path.join(tasksDir, 'my-task-1.yaml'))).toBe(true);
  });

  it('should include worktree option in task file when confirmed', async () => {
    // Given: User confirms worktree creation
    mockSummarizeTaskName.mockResolvedValue('with-worktree');
    mockConfirm.mockResolvedValue(true);

    // When
    await addTask(testDir, ['Task with worktree']);

    // Then
    const taskFile = path.join(testDir, '.takt', 'tasks', 'with-worktree.yaml');
    const content = fs.readFileSync(taskFile, 'utf-8');
    expect(content).toContain('worktree: true');
  });

  it('should cancel when interactive mode returns null', async () => {
    // Given: User cancels multiline input
    mockPromptMultilineInput.mockResolvedValue(null);

    // When
    await addTask(testDir, []);

    // Then
    const tasksDir = path.join(testDir, '.takt', 'tasks');
    const files = fs.existsSync(tasksDir) ? fs.readdirSync(tasksDir) : [];
    expect(files.length).toBe(0);
    expect(mockSummarizeTaskName).not.toHaveBeenCalled();
  });

  it('should include workflow selection in task file', async () => {
    // Given: Multiple workflows available
    mockListWorkflows.mockReturnValue(['default', 'review']);
    mockSummarizeTaskName.mockResolvedValue('with-workflow');
    mockConfirm.mockResolvedValue(false);
    mockSelectOption.mockResolvedValue('review');

    // When
    await addTask(testDir, ['Task with workflow']);

    // Then
    const taskFile = path.join(testDir, '.takt', 'tasks', 'with-workflow.yaml');
    const content = fs.readFileSync(taskFile, 'utf-8');
    expect(content).toContain('workflow: review');
  });
});
