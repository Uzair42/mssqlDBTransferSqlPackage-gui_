import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron';
import path from 'path';
import fs from 'fs';
import {
  checkSqlpackageStatus,
  downloadAndExtractSqlpackage,
} from './downloader';
import { exportDatabase, cancelExport, testConnection, fetchDatabases, fetchDatabaseSchema, fetchTableData, ExportConfig } from './runner';
import { cancelBacpacImport, importBacpacSafely } from './safeImport';
import {
  backupDatabase,
  restoreDatabase,
  getFileListOnly,
  getServerDefaultPaths,
  getDatabasePhysicalFiles,
  BackupBakConfig,
  RestoreBakConfig,
  SqlcmdConnectionConfig,
} from './sqlcmd';
import { getLocalMssqlEnvironment, fetchServerVersionDetails } from './systemInfo';
import {
  startWiFiServer,
  stopWiFiServer,
  getWiFiServerStatus,
  getNetworkInterfaces,
  triggerBluetoothSend,
  downloadBackupFromRemote,
} from './transfer';

let mainWindow: BrowserWindow | null = null;

function getAppIconPath(): string | undefined {
  const iconCandidates = process.platform === 'win32'
    ? [
        path.join(__dirname, '../build/icon.ico'),
        path.join(__dirname, '../public/assets/icon.ico'),
        path.join(process.resourcesPath, 'build/icon.ico'),
        path.join(process.resourcesPath, 'public/assets/icon.ico'),
        path.join(__dirname, '../build/icon.png'),
        path.join(__dirname, '../public/assets/icon.png'),
      ]
    : [
        path.join(__dirname, '../build/icons/512x512.png'),
        path.join(__dirname, '../build/icon.png'),
        path.join(__dirname, '../public/assets/icon.png'),
        path.join(process.resourcesPath, 'build/icons/512x512.png'),
        path.join(process.resourcesPath, 'public/assets/icon.png'),
      ];

  for (const candidate of iconCandidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return undefined;
}

function createWindow() {
  if (app.isPackaged) Menu.setApplicationMenu(null);
  const appIcon = getAppIconPath();

  mainWindow = new BrowserWindow({
    width: 1120,
    height: 800,
    minWidth: 940,
    minHeight: 700,
    title: 'MSSQL Database Migrator',
    icon: appIcon,
    backgroundColor: '#05120a',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      devTools: !app.isPackaged,
    },
  });

  mainWindow.once('ready-to-show', () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.show();
  });
  mainWindow.webContents.on('console-message', (_event, _level, message, line, sourceId) => {
    console.log(`[Renderer Log] ${message} (${sourceId}:${line})`);
  });
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error(`[Load Error ${errorCode}] ${errorDescription} on ${validatedURL}`);
    const devServerUrl = process.env.VITE_DEV_SERVER_URL;
    if (devServerUrl && mainWindow && !mainWindow.isDestroyed()) {
      setTimeout(() => mainWindow?.loadURL(devServerUrl), 1000);
    }
  });
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (app.isPackaged) {
      const key = input.key.toLowerCase();
      if (input.key === 'F12' || (input.control && input.shift && key === 'i') || (input.control && key === 'r') || input.key === 'F5') {
        event.preventDefault();
      }
    }
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    console.log(`Loading Dev Server URL: ${devServerUrl}`);
    mainWindow.loadURL(devServerUrl);
  } else {
    const distHtmlPath = path.join(__dirname, '../dist/index.html');
    console.log(`Loading Static Dist File: ${distHtmlPath}`);
    if (fs.existsSync(distHtmlPath)) mainWindow.loadFile(distHtmlPath);
    else {
      console.log('Dist HTML not found, falling back to http://localhost:5173');
      mainWindow.loadURL('http://localhost:5173');
    }
  }

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

async function confirmDestructiveOperation(
  title: string,
  message: string,
  detail: string
): Promise<boolean> {
  if (!mainWindow || mainWindow.isDestroyed()) return false;
  const result = await dialog.showMessageBox(mainWindow, {
    type: 'warning',
    title,
    message,
    detail,
    buttons: ['Cancel', 'Continue'],
    defaultId: 0,
    cancelId: 0,
    noLink: true,
  });
  return result.response === 1;
}

// ─── IPC: System Environment & Server Telemetry ──────────────────────
ipcMain.handle('system:get-environment-info', async () => getLocalMssqlEnvironment());
ipcMain.handle('db:get-server-version', async (_event, config: any) => fetchServerVersionDetails(config));

// ─── IPC: sqlpackage engine ──────────────────────────────────────────
ipcMain.handle('sqlpackage:check-status', async () => checkSqlpackageStatus());
ipcMain.handle('sqlpackage:download', async () => {
  if (!mainWindow) throw new Error('Main window not available.');
  try {
    const executablePath = await downloadAndExtractSqlpackage((progress) => {
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('sqlpackage:download-progress', progress);
    });
    return { success: true, executablePath };
  } catch (err) {
    return { success: false, message: (err as Error).message };
  }
});

// ─── IPC: Connection Testing ─────────────────────────────────────────
ipcMain.handle('sqlpackage:test-connection', async (_event, config: ExportConfig) => testConnection(config));
ipcMain.handle('db:fetch-databases', async (_event, config: ExportConfig) => fetchDatabases(config));
ipcMain.handle('db:fetch-schema', async (_event, config: ExportConfig, databaseName?: string) => fetchDatabaseSchema(config, databaseName));
ipcMain.handle('db:fetch-table-data', async (_event, config: ExportConfig, schemaName: string, tableName: string, databaseName?: string, limit?: number) => fetchTableData(config, schemaName, tableName, databaseName, limit));

// ─── IPC: sqlpackage Export/Import ───────────────────────────────────
ipcMain.handle('sqlpackage:export', async (_event, config: ExportConfig) => {
  if (!mainWindow) return { success: false, message: 'Main window not available.' };
  if (config.action === 'Import') {
    const target = (config.database || '').trim();
    const confirmed = await confirmDestructiveOperation(
      'Confirm BACPAC Import',
      `Import into database [${target || '(name missing)'}] on ${config.server || 'the selected SQL Server'}?`,
      'Import can create or modify the target database. Existing databases are never automatically dropped by this operation. Cancel if the server or database name is not exactly what you intended.'
    );
    if (!confirmed) return { success: false, message: 'BACPAC import cancelled; no import was started.' };
    return importBacpacSafely(config, mainWindow);
  }
  return exportDatabase(config, mainWindow);
});
ipcMain.handle('sqlpackage:cancel', async () => {
  const importResult = cancelBacpacImport();
  const exportResult = cancelExport();
  return importResult.success ? importResult : exportResult;
});

// ─── IPC: SQLCMD — Native Backup (.bak) ─────────────────────────────
ipcMain.handle('sqlcmd:backup', async (_event, config: BackupBakConfig) => {
  if (!mainWindow) return { success: false, message: 'Main window not available.' };
  const destination = config.backupPath || (config as any).targetFile || '(destination missing)';
  const confirmed = await confirmDestructiveOperation(
    'Confirm SQL Server Backup',
    `Create a backup of [${config.database}] on ${config.server}?`,
    `The backup command uses media initialization and can replace contents at the destination.\nDestination: ${destination}\nCancel if this file contains a backup that must be preserved.`
  );
  if (!confirmed) return { success: false, message: 'Backup cancelled; no backup was started.' };
  return backupDatabase(config, mainWindow);
});

// ─── IPC: SQLCMD — Native Restore (.bak) ────────────────────────────
ipcMain.handle('sqlcmd:restore', async (_event, config: RestoreBakConfig) => {
  if (!mainWindow) return { success: false, message: 'Main window not available.' };
  const target = (config.targetDatabase || (config as any).database || '').trim();
  const confirmed = await confirmDestructiveOperation(
    'Confirm .bak Restore (May Replace Data)',
    `Restore backup into database [${target || '(name missing)'}] on ${config.server || 'the selected SQL Server'}?`,
    'This restore uses WITH REPLACE and may replace the target database and its data files. Verify the server, target database, backup file, and every file-move path before continuing. Cancel to leave the database untouched.'
  );
  if (!confirmed) return { success: false, message: 'Restore cancelled; no restore was started.' };
  return restoreDatabase(config, mainWindow);
});
ipcMain.handle('sqlcmd:filelist', async (_event, connConfig: SqlcmdConnectionConfig, bakFilePath: string) => getFileListOnly(connConfig, bakFilePath));
ipcMain.handle('sqlcmd:server-paths', async (_event, connConfig: SqlcmdConnectionConfig) => getServerDefaultPaths(connConfig));

// ─── IPC: Native Save File Dialog ───────────────────────────────────
ipcMain.handle('dialog:save-file', async (_event, defaultFileName: string, defaultExt?: string) => {
  if (!mainWindow) return null;
  const ext = defaultExt || (defaultFileName.endsWith('.bak') ? 'bak' : 'bacpac');
  const filters = ext === 'bak'
    ? [{ name: 'SQL Server Backup', extensions: ['bak'] }, { name: 'All Files', extensions: ['*'] }]
    : [{ name: 'Data-tier Application Package', extensions: ['bacpac'] }, { name: 'All Files', extensions: ['*'] }];
  const result = await dialog.showSaveDialog(mainWindow, {
    title: ext === 'bak' ? 'Select Destination Backup File (.bak)' : 'Select Destination BACPAC File',
    defaultPath: defaultFileName,
    filters,
  });
  if (result.canceled || !result.filePath) return null;
  return result.filePath;
});

// ─── IPC: Native Open File Dialog ───────────────────────────────────
ipcMain.handle('dialog:open-file', async (_event, title?: string) => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: title || 'Select Database Backup Archive (.bacpac, .bak, or .zip)',
    filters: [
      { name: 'Database Backup Files (*.bacpac, *.bak, *.zip)', extensions: ['bacpac', 'bak', 'zip'] },
      { name: 'Data-tier Application Package (*.bacpac, *.zip)', extensions: ['bacpac', 'zip'] },
      { name: 'SQL Server Backup (*.bak)', extensions: ['bak'] },
      { name: 'All Files (*)', extensions: ['*'] },
    ],
    properties: ['openFile'],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

// ─── IPC: Backup File Transfer (Wi-Fi & Bluetooth) ────────────────────
ipcMain.handle('transfer:start-wifi-server', async (_event, filePath: string, port?: number) => startWiFiServer(filePath, port || 8080, mainWindow || undefined));
ipcMain.handle('transfer:stop-wifi-server', async () => stopWiFiServer(mainWindow || undefined));
ipcMain.handle('transfer:get-wifi-status', async () => getWiFiServerStatus());
ipcMain.handle('transfer:get-network-ips', async () => getNetworkInterfaces());
ipcMain.handle('transfer:trigger-bluetooth', async (_event, filePath: string) => triggerBluetoothSend(filePath));
ipcMain.handle('db:get-database-files', async (_event, config: SqlcmdConnectionConfig, databaseName?: string) => getDatabasePhysicalFiles(config, databaseName));
ipcMain.handle('transfer:download-from-remote', async (_event, remoteAddress: string, pin: string, targetDirectory?: string) => downloadBackupFromRemote(remoteAddress, pin, targetDirectory));
