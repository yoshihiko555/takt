/**
 * Unit tests for takt-package.yaml schema validation.
 *
 * Target: src/features/ensemble/takt-pack-config.ts
 *
 * Schema rules under test:
 *   - description: optional
 *   - path: optional, defaults to "."
 *   - takt.min_version: must match /^\d+\.\d+\.\d+$/ (no "v" prefix, no pre-release)
 *   - path: must not start with "/" or "~"
 *   - path: must not contain ".." segments
 */

import { describe, it, expect } from 'vitest';
import {
  parseTaktPackConfig,
  validateTaktPackPath,
  validateMinVersion,
} from '../features/ensemble/takt-pack-config.js';

describe('takt-package.yaml schema: description field', () => {
  it('should accept schema without description field', () => {
    const config = parseTaktPackConfig('');
    expect(config.description).toBeUndefined();
  });
});

describe('takt-package.yaml schema: path field', () => {
  it('should default path to "." when not specified', () => {
    const config = parseTaktPackConfig('');
    expect(config.path).toBe('.');
  });

  it('should reject path starting with "/" (absolute path)', () => {
    expect(() => validateTaktPackPath('/foo')).toThrow();
  });

  it('should reject path starting with "~" (tilde-absolute path)', () => {
    expect(() => validateTaktPackPath('~/foo')).toThrow();
  });

  it('should reject path with ".." segment traversing outside repository', () => {
    expect(() => validateTaktPackPath('../outside')).toThrow();
  });

  it('should reject path with embedded ".." segments leading outside repository', () => {
    expect(() => validateTaktPackPath('sub/../../../outside')).toThrow();
  });

  it('should accept valid relative path "sub/dir"', () => {
    expect(() => validateTaktPackPath('sub/dir')).not.toThrow();
  });
});

describe('takt-package.yaml schema: takt.min_version field', () => {
  it('should accept min_version "0.5.0" (valid semver)', () => {
    expect(() => validateMinVersion('0.5.0')).not.toThrow();
  });

  it('should accept min_version "1.0.0" (valid semver)', () => {
    expect(() => validateMinVersion('1.0.0')).not.toThrow();
  });

  it('should reject min_version "1.0" (missing patch segment)', () => {
    expect(() => validateMinVersion('1.0')).toThrow();
  });

  it('should reject min_version "v1.0.0" (v prefix not allowed)', () => {
    expect(() => validateMinVersion('v1.0.0')).toThrow();
  });

  it('should reject min_version "1.0.0-alpha" (pre-release suffix not allowed)', () => {
    expect(() => validateMinVersion('1.0.0-alpha')).toThrow();
  });

  it('should reject min_version "1.0.0-beta.1" (pre-release suffix not allowed)', () => {
    expect(() => validateMinVersion('1.0.0-beta.1')).toThrow();
  });
});
