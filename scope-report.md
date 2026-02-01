# Change Scope Declaration

## Task
Add minimal log output mode for CI to suppress AI output while preserving step transitions

## Planned Changes
| Type | File |
|------|------|
| Modify | `src/models/types.ts` |
| Modify | `src/models/schemas.ts` |
| Modify | `src/config/globalConfig.ts` |
| Modify | `src/utils/ui.ts` |
| Modify | `src/commands/workflowExecution.ts` |
| Modify | `src/cli.ts` |

## Estimated Size
Medium (~150 lines across 6 files)

## Impact Scope
- Global configuration system (adds `minimalOutput` field)
- CLI interface (adds `--quiet` flag)
- UI output system (StreamDisplay class)
- Workflow execution (passes quiet flag to StreamDisplay)
