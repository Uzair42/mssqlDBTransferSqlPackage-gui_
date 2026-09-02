import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron';
import path from 'path';
import fs from 'fs';
import {
  checkSqlpackageStatus,
  downloadAndExtractSqlpackage,
} from './downloader';
import { exportDatabase, cancelExport, testConnection, fetchDatabases, fetchDatabaseSchema, fetchTableData, ExportConfig } from './runner';
import {
  backupDatabase,
  restoreDatabase,
  getFileListOnly,
  getServerDefaultPaths,
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
} from './transfer';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  // Remove default top menu bar in production release
  if (app.isPackaged) {
    Menu.setApplicationMenu(null);
  }

  mainWindow = new BrowserWindow({
    width: 1120,
    height: 800,
    minWidth: 940,
    minHeight: 700,
    title: 'MSSQL Database Migrator',
    backgroundColor: '#05120a',
    show: false, // Prevent white/blank screen flicker on application startup
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      devTools: !app.isPackaged, // Strictly disable DevTools in production release builds
    },
  });

  // Reveal window smoothly once DOM is rendered and styled
  mainWindow.once('ready-to-show', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
    }
  });

  mainWindow.webContents.on('console-message', (_event, _level, message, line, sourceId) => {
    console.log(`[Renderer Log] ${message} (${sourceId}:${line})`);
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error(`[Load Error ${errorCode}] ${errorDescription} on ${validatedURL}`);
    // Auto-retry in dev server mode if server was still binding
    const devServerUrl = process.env.VITE_DEV_SERVER_URL;
    if (devServerUrl && mainWindow && !mainWindow.isDestroyed()) {
      setTimeout(() => {
        mainWindow?.loadURL(devServerUrl);
      }, 1000);
    }
  });

  // Intercept DevTools and reload keyboard shortcuts in production release
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (app.isPackaged) {
      const key = input.key.toLowerCase();
      if (
        input.key === 'F12' ||
        (input.control && input.shift && key === 'i') ||
        (input.control && key === 'r') ||
        input.key === 'F5'
      ) {
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
    if (fs.existsSync(distHtmlPath)) {
      mainWindow.loadFile(distHtmlPath);
    } else {
      console.log('Dist HTML not found, falling back to http://localhost:5173');
      mainWindow.loadURL('http://localhost:5173');
    }
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ─── IPC: System Environment & Server Telemetry ──────────────────────
ipcMain.handle('system:get-environment-info', async () => {
  return getLocalMssqlEnvironment();
});

ipcMain.handle('db:get-server-version', async (_event, config: any) => {
  return await fetchServerVersionDetails(config);
});

// ─── IPC: sqlpackage engine ──────────────────────────────────────────
ipcMain.handle('sqlpackage:check-status', async () => {
  return checkSqlpackageStatus();
});

ipcMain.handle('sqlpackage:download', async () => {
  if (!mainWindow) throw new Error('Main window not available.');
  try {
    const executablePath = await downloadAndExtractSqlpackage((progress) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('sqlpackage:download-progress', progress);
      }
    });
    return { success: true, executablePath };
  } catch (err) {
    return { success: false, message: (err as Error).message };
  }
});

// ─── IPC: Connection Testing ─────────────────────────────────────────
ipcMain.handle('sqlpackage:test-connection', async (_event, config: ExportConfig) => {
  return await testConnection(config);
});

// ─── IPC: Fetch Online Databases ─────────────────────────────────────
ipcMain.handle('db:fetch-databases', async (_event, config: ExportConfig) => {
  return await fetchDatabases(config);
});

// ─── IPC: Fetch Database Schema & Table Preview ──────────────────────
ipcMain.handle('db:fetch-schema', async (_event, config: ExportConfig, databaseName?: string) => {
  return await fetchDatabaseSchema(config, databaseName);
});

ipcMain.handle('db:fetch-table-data', async (_event, config: ExportConfig, schemaName: string, tableName: string, databaseName?: string, limit?: number) => {
  return await fetchTableData(config, schemaName, tableName, databaseName, limit);
});

// ─── IPC: sqlpackage Export/Import ───────────────────────────────────
ipcMain.handle('sqlpackage:export', async (_event, config: ExportConfig) => {
  if (!mainWindow) throw new Error('Main window not available.');
  return await exportDatabase(config, mainWindow);
});

ipcMain.handle('sqlpackage:cancel', async () => {
  return cancelExport();
});

// ─── IPC: SQLCMD — Native Backup (.bak) ─────────────────────────────
ipcMain.handle('sqlcmd:backup', async (_event, config: BackupBakConfig) => {
  if (!mainWindow) throw new Error('Main window not available.');
  return await backupDatabase(config, mainWindow);
});

// ─── IPC: SQLCMD — Native Restore (.bak) ────────────────────────────
ipcMain.handle('sqlcmd:restore', async (_event, config: RestoreBakConfig) => {
  if (!mainWindow) throw new Error('Main window not available.');
  return await restoreDatabase(config, mainWindow);
});

// ─── IPC: SQLCMD — RESTORE FILELISTONLY ─────────────────────────────
ipcMain.handle('sqlcmd:filelist', async (_event, connConfig: SqlcmdConnectionConfig, bakFilePath: string) => {
  return await getFileListOnly(connConfig, bakFilePath);
});

// ─── IPC: SQLCMD — Get Server Default Paths ─────────────────────────
ipcMain.handle('sqlcmd:server-paths', async (_event, connConfig: SqlcmdConnectionConfig) => {
  return await getServerDefaultPaths(connConfig);
});

// ─── IPC: Native Save File Dialog ───────────────────────────────────
ipcMain.handle('dialog:save-file', async (_event, defaultFileName: string, defaultExt?: string) => {
  if (!mainWindow) return null;

  const ext = defaultExt || (defaultFileName.endsWith('.bak') ? 'bak' : 'bacpac');
  let filters: { name: string; extensions: string[] }[];

  if (ext === 'bak') {
    filters = [
      { name: 'SQL Server Backup', extensions: ['bak'] },
      { name: 'All Files', extensions: ['*'] },
    ];
  } else {
    filters = [
      { name: 'Data-tier Application Package', extensions: ['bacpac'] },
      { name: 'All Files', extensions: ['*'] },
    ];
  }

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
    title: title || 'Select Database Backup Archive (.bacpac or .bak)',
    filters: [
      { name: 'Database Backup Files (*.bacpac, *.bak)', extensions: ['bacpac', 'bak'] },
      { name: 'Data-tier Application Package (*.bacpac)', extensions: ['bacpac'] },
      { name: 'SQL Server Backup (*.bak)', extensions: ['bak'] },
      { name: 'All Files (*)', extensions: ['*'] },
    ],
    properties: ['openFile'],
  });

  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

// ─── IPC: Backup File Transfer (Wi-Fi & Bluetooth) ────────────────────
ipcMain.handle('transfer:start-wifi-server', async (_event, filePath: string, port?: number) => {
  return await startWiFiServer(filePath, port || 8080, mainWindow || undefined);
});

ipcMain.handle('transfer:stop-wifi-server', async () => {
  return await stopWiFiServer(mainWindow || undefined);
});

ipcMain.handle('transfer:get-wifi-status', async () => {
  return getWiFiServerStatus();
});

ipcMain.handle('transfer:get-network-ips', async () => {
  return getNetworkInterfaces();
});

ipcMain.handle('transfer:trigger-bluetooth', async (_event, filePath: string) => {
  return await triggerBluetoothSend(filePath);
});
