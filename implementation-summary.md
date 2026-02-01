# Implementation Summary: Minimal Log Output Mode for CI

## Completed Changes

### 1. Type Definitions (`src/models/types.ts`)
- ✅ Added `minimalOutput?: boolean` field to `GlobalConfig` interface
- Purpose: Minimal output mode for CI to suppress AI output and prevent sensitive information leaks

### 2. Schema Validation (`src/models/schemas.ts`)
- ✅ Added `minimal_output: z.boolean().optional().default(false)` to `GlobalConfigSchema`
- Ensures proper validation and default value handling

### 3. Global Config Management (`src/config/globalConfig.ts`)
- ✅ Updated `loadGlobalConfig()` to parse and return `minimalOutput` field
- ✅ Updated `saveGlobalConfig()` to persist `minimalOutput` field as `minimal_output` in YAML
- Follows existing snake_case pattern in config files

### 4. StreamDisplay Class (`src/utils/ui.ts`)
- ✅ Added `quiet` parameter to constructor (default: false)
- ✅ Modified `showInit()` - suppressed in quiet mode
- ✅ Modified `showToolUse()` - suppressed in quiet mode
- ✅ Modified `showToolOutput()` - suppressed in quiet mode
- ✅ Modified `showThinking()` - suppressed in quiet mode
- ✅ Modified `showText()` - suppressed in quiet mode
- ✅ Modified `showToolResult()` - shows errors, suppresses success messages in quiet mode

**Behavior in quiet mode:**
- AI text output: ❌ Hidden
- AI thinking: ❌ Hidden
- Tool usage: ❌ Hidden
- Tool output: ❌ Hidden
- Tool success: ❌ Hidden
- Tool errors: ✅ **Shown** (critical for debugging)
- Step transitions: ✅ **Shown** (via `info()` calls, not part of StreamDisplay)

### 5. CLI Interface (`src/cli.ts`)
- ✅ Added `-q, --quiet` flag to global options
- ✅ Added `quietMode` global variable
- ✅ Updated preAction hook to set `quietMode` from CLI flag or config
- ✅ Added `isQuietMode()` export function for use in commands
- Priority: CLI flag takes precedence over config

### 6. Workflow Execution (`src/commands/workflowExecution.ts`)
- ✅ Updated step start handler to check `minimalOutput` from config
- ✅ Pass `quietMode` to `StreamDisplay` constructor
- Ensures quiet mode is applied to all step executions

## Implementation Details

### Configuration Priority
1. CLI flag `--quiet` (highest priority)
2. Config file `minimal_output: true`
3. Default: false (normal output)

### YAML Configuration Example
```yaml
# ~/.takt/config.yaml
minimal_output: true  # Enable minimal output mode
log_level: info
language: ja
```

### CLI Usage Examples
```bash
# Enable quiet mode via flag
takt --quiet "Fix bug in authentication"

# Enable quiet mode via flag with pipeline
takt --pipeline --quiet --task "Update dependencies"

# Enable quiet mode via config (persistent)
# Edit ~/.takt/config.yaml and add: minimal_output: true
```

## What Gets Logged in Quiet Mode

### ✅ Still Visible:
- Step transitions: `[1/30] plan (Planner)`
- Workflow status: Success/failure messages
- Error messages: Tool execution failures
- Status updates: `info()`, `success()`, `error()` calls

### ❌ Hidden:
- AI text responses
- AI thinking (reasoning)
- Tool invocation details
- Tool output streaming
- Tool success previews

## Verification

Build status: ✅ Success
```bash
npm run build
# > takt@0.3.7 build
# > tsc
```

## Files Modified (6 files)

| File | Lines Changed | Type |
|------|--------------|------|
| `src/models/types.ts` | +2 | Type definition |
| `src/models/schemas.ts` | +2 | Schema validation |
| `src/config/globalConfig.ts` | +4 | Config load/save |
| `src/utils/ui.ts` | +35 | Display logic |
| `src/cli.ts` | +10 | CLI flag + initialization |
| `src/commands/workflowExecution.ts` | +4 | Integration |

Total: ~57 lines added/modified across 6 files

## Testing Recommendations

1. **Manual Testing:**
   ```bash
   # Test with CLI flag
   takt --quiet "test task"

   # Test with config
   echo "minimal_output: true" >> ~/.takt/config.yaml
   takt "test task"

   # Verify errors still show
   takt --quiet "task that causes error"
   ```

2. **Verify behavior:**
   - AI output is suppressed ✓
   - Step transitions are visible ✓
   - Errors are still shown ✓
   - NDJSON logs still contain full data ✓

## Edge Cases Handled

1. ✅ Spinner cleanup: Spinner is stopped even in quiet mode to prevent artifacts
2. ✅ Error visibility: Errors are always shown for debugging
3. ✅ Buffer management: Text/thinking buffers are not printed in quiet mode
4. ✅ Config precedence: CLI flag overrides config file
5. ✅ NDJSON logs: Full logs are still written regardless of quiet mode (for post-execution analysis)
