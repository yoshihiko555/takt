import type { GlobalConfig } from '../../core/models/index.js';
import type { ProjectLocalConfig } from './project/projectConfig.js';
import { loadGlobalConfig } from './global/globalConfig.js';
import { loadProjectConfig } from './project/projectConfig.js';

export interface LoadedConfig {
  global: GlobalConfig;
  project: ProjectLocalConfig;
}

export function loadConfig(projectDir: string): LoadedConfig {
  return {
    global: loadGlobalConfig(),
    project: loadProjectConfig(projectDir),
  };
}
