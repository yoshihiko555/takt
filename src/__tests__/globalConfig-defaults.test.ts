/**
 * Tests for loadGlobalConfig default values when config.yaml is missing
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { vi } from 'vitest';

// Mock the home directory to use a temp directory
const testHomeDir = join(tmpdir(), `takt-gc-test-${Date.now()}`);

vi.mock('node:os', async () => {
  const actual = await vi.importActual('node:os');
  return {
    ...actual,
    homedir: () => testHomeDir,
  };
});

// Import after mocks are set up
const { loadGlobalConfig, saveGlobalConfig } = await import('../config/globalConfig.js');
const { getGlobalConfigPath } = await import('../config/paths.js');

describe('loadGlobalConfig', () => {
  beforeEach(() => {
    mkdirSync(testHomeDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testHomeDir)) {
      rmSync(testHomeDir, { recursive: true });
    }
  });

  it('should return default values when config.yaml does not exist', () => {
    const config = loadGlobalConfig();

    expect(config.language).toBe('en');
    expect(config.trustedDirectories).toEqual([]);
    expect(config.defaultWorkflow).toBe('default');
    expect(config.logLevel).toBe('info');
    expect(config.provider).toBe('claude');
    expect(config.model).toBeUndefined();
    expect(config.debug).toBeUndefined();
    expect(config.pipeline).toBeUndefined();
  });

  it('should return a fresh copy each time (no shared reference)', () => {
    const config1 = loadGlobalConfig();
    const config2 = loadGlobalConfig();

    config1.trustedDirectories.push('/tmp/test');
    expect(config2.trustedDirectories).toEqual([]);
  });

  it('should load from config.yaml when it exists', () => {
    const taktDir = join(testHomeDir, '.takt');
    mkdirSync(taktDir, { recursive: true });
    writeFileSync(
      getGlobalConfigPath(),
      'language: ja\nprovider: codex\nlog_level: debug\n',
      'utf-8',
    );

    const config = loadGlobalConfig();

    expect(config.language).toBe('ja');
    expect(config.provider).toBe('codex');
    expect(config.logLevel).toBe('debug');
  });

  it('should load pipeline config from config.yaml', () => {
    const taktDir = join(testHomeDir, '.takt');
    mkdirSync(taktDir, { recursive: true });
    writeFileSync(
      getGlobalConfigPath(),
      [
        'language: en',
        'pipeline:',
        '  default_branch_prefix: "feat/"',
        '  commit_message_template: "fix: {title} (#{issue})"',
      ].join('\n'),
      'utf-8',
    );

    const config = loadGlobalConfig();

    expect(config.pipeline).toBeDefined();
    expect(config.pipeline!.defaultBranchPrefix).toBe('feat/');
    expect(config.pipeline!.commitMessageTemplate).toBe('fix: {title} (#{issue})');
    expect(config.pipeline!.prBodyTemplate).toBeUndefined();
  });

  it('should save and reload pipeline config', () => {
    const taktDir = join(testHomeDir, '.takt');
    mkdirSync(taktDir, { recursive: true });
    // Create minimal config first
    writeFileSync(getGlobalConfigPath(), 'language: en\n', 'utf-8');

    const config = loadGlobalConfig();
    config.pipeline = {
      defaultBranchPrefix: 'takt/',
      commitMessageTemplate: 'feat: {title} (#{issue})',
    };
    saveGlobalConfig(config);

    const reloaded = loadGlobalConfig();
    expect(reloaded.pipeline).toBeDefined();
    expect(reloaded.pipeline!.defaultBranchPrefix).toBe('takt/');
    expect(reloaded.pipeline!.commitMessageTemplate).toBe('feat: {title} (#{issue})');
  });
});
