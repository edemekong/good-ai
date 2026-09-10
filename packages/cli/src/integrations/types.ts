export interface ClientInstallResult {
  name: string;
  configPath: string;
  detected: boolean;
  registered: boolean;
  reason?: string;
}

export interface ClientAdapter {
  name: string;
  configPath(userHome: string, cwd: string): string;
  isDetected(userHome: string, cwd: string, configPath: string): boolean;
  install(configPath: string, command: string): ClientInstallResult;
}
