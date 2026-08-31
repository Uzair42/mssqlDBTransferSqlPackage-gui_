import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // System environment & server telemetry
  getEnvironmentInfo: () => ipcRenderer.invoke('system:get-environment-info'),
  fetchServerVersion: (config: any) => ipcRenderer.invoke('db:get-server-version', config),

  // sqlpackage engine
  checkSqlpackageStatus: () => ipcRenderer.invoke('sqlpackage:check-status'),
  downloadSqlpackage: () => ipcRenderer.invoke('sqlpackage:download'),
  testConnection: (config: any) => ipcRenderer.invoke('sqlpackage:test-connection', config),
  fetchDatabases: (config: any) => ipcRenderer.invoke('db:fetch-databases', config),
  exportDatabase: (config: any) => ipcRenderer.invoke('sqlpackage:export', config),
  cancelExport: () => ipcRenderer.invoke('sqlpackage:cancel'),

  // SQLCMD native backup/restore
  sqlcmdBackup: (config: any) => ipcRenderer.invoke('sqlcmd:backup', config),
  sqlcmdRestore: (config: any) => ipcRenderer.invoke('sqlcmd:restore', config),
  sqlcmdFileList: (connConfig: any, bakFilePath: string) => ipcRenderer.invoke('sqlcmd:filelist', connConfig, bakFilePath),
  sqlcmdServerPaths: (connConfig: any) => ipcRenderer.invoke('sqlcmd:server-paths', connConfig),

  // Dialogs
  selectSavePath: (defaultName: string, defaultExt?: string) => ipcRenderer.invoke('dialog:save-file', defaultName, defaultExt),
  selectOpenPath: (title?: string) => ipcRenderer.invoke('dialog:open-file', title),

  // Log listeners
  onSqlpackageLog: (callback: (log: { type: string; timestamp: string; content: string }) => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on('sqlpackage:log', listener);
    return () => ipcRenderer.removeListener('sqlpackage:log', listener);
  },

  onDownloadProgress: (callback: (progress: { status: string; percent: number; message: string }) => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on('sqlpackage:download-progress', listener);
    return () => ipcRenderer.removeListener('sqlpackage:download-progress', listener);
  }
});
