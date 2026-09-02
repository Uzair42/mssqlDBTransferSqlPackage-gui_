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
  fetchDatabaseSchema: (config: any, databaseName?: string) => ipcRenderer.invoke('db:fetch-schema', config, databaseName),
  fetchTableData: (config: any, schemaName: string, tableName: string, databaseName?: string, limit?: number) => ipcRenderer.invoke('db:fetch-table-data', config, schemaName, tableName, databaseName, limit),
  exportDatabase: (config: any) => ipcRenderer.invoke('sqlpackage:export', config),
  cancelExport: () => ipcRenderer.invoke('sqlpackage:cancel'),

  // Unified runner helper for App.tsx
  runSqlpackage: (config: any, fileMoves: any[] = []) => {
    if (config.action === 'Backup') {
      return ipcRenderer.invoke('sqlcmd:backup', config);
    } else if (config.action === 'Restore_Bak') {
      return ipcRenderer.invoke('sqlcmd:restore', { connConfig: config, bakFilePath: config.targetFile, fileMoves });
    } else {
      return ipcRenderer.invoke('sqlpackage:export', config);
    }
  },
  cancelSqlpackage: () => ipcRenderer.invoke('sqlpackage:cancel'),
  fetchBakFileList: (connConfig: any, bakFilePath: string) => ipcRenderer.invoke('sqlcmd:filelist', connConfig, bakFilePath),

  // SQLCMD native backup/restore
  sqlcmdBackup: (config: any) => ipcRenderer.invoke('sqlcmd:backup', config),
  sqlcmdRestore: (config: any) => ipcRenderer.invoke('sqlcmd:restore', config),
  sqlcmdFileList: (connConfig: any, bakFilePath: string) => ipcRenderer.invoke('sqlcmd:filelist', connConfig, bakFilePath),
  sqlcmdServerPaths: (connConfig: any) => ipcRenderer.invoke('sqlcmd:server-paths', connConfig),

  // Dialogs
  selectSavePath: (defaultName: string, defaultExt?: string) => ipcRenderer.invoke('dialog:save-file', defaultName, defaultExt),
  selectOpenPath: (title?: string) => ipcRenderer.invoke('dialog:open-file', title),

  // File Transfer (Wi-Fi & Bluetooth)
  startWiFiServer: (filePath: string, port?: number) => ipcRenderer.invoke('transfer:start-wifi-server', filePath, port),
  stopWiFiServer: () => ipcRenderer.invoke('transfer:stop-wifi-server'),
  getWiFiStatus: () => ipcRenderer.invoke('transfer:get-wifi-status'),
  getNetworkIPs: () => ipcRenderer.invoke('transfer:get-network-ips'),
  triggerBluetooth: (filePath: string) => ipcRenderer.invoke('transfer:trigger-bluetooth', filePath),

  // Log listeners
  onSqlpackageLog: (callback: (log: { type: string; timestamp: string; content: string }) => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on('sqlpackage:log', listener);
    return () => ipcRenderer.removeListener('sqlpackage:log', listener);
  },

  onLog: (callback: (log: { type: string; timestamp: string; content: string }) => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on('sqlpackage:log', listener);
    return () => ipcRenderer.removeListener('sqlpackage:log', listener);
  },

  onDownloadProgress: (callback: (progress: { status: string; percent: number; message: string }) => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on('sqlpackage:download-progress', listener);
    return () => ipcRenderer.removeListener('sqlpackage:download-progress', listener);
  },

  onTransferStatusUpdate: (callback: (status: any) => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on('transfer:status-update', listener);
    return () => ipcRenderer.removeListener('transfer:status-update', listener);
  }
});
