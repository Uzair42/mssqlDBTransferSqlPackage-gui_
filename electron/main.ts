import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import {
  checkSqlpackageStatus,
  downloadAndExtractSqlpackage,
} from './downloader';
import { exportDatabase, cancelExport, testConnection, fetchDatabases, ExportConfig } from './runner';
import {
  backupDatabase,
  restoreDatabase,
  getFileListOnly,
  getServerDefaultPaths,
  BackupBakConfig,
  RestoreBakConfig,
  SqlcmdConnectionConfig,
} from './sqlcmd';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1120,
    height: 800,
    minWidth: 940,
    minHeight: 700,
    title: 'MSSQL Database Migrator',
    backgroundColor: '#05120a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  mainWindow.webContents.on('console-message', (_event, _level, message, line, sourceId) => {
    console.log(`[Renderer Log] ${message} (${sourceId}:${line})`);
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error(`[Load Error ${errorCode}] ${errorDescription} on ${validatedURL}`);
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
    title: title || 'Select .bak Backup File',
    filters: [
      { name: 'SQL Server Backup', extensions: ['bak'] },
      { name: 'All Files', extensions: ['*'] },
    ],
    properties: ['openFile'],
  });

  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});
