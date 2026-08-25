import { BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';
import { Connection as TediousConnection, Request as TediousRequest } from 'tedious';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SqlcmdConnectionConfig {
  server: string;
  port: string;
  authType: 'sql' | 'windows';
  username?: string;
  password?: string;
  trustServerCertificate: boolean;
}

export interface BakFileInfo {
  logicalName: string;
  physicalName: string;
  type: string;   // 'D' = Data, 'L' = Log
  size: number;
}

export interface RestoreBakConfig extends SqlcmdConnectionConfig {
  bakFilePath: string;          // Absolute path to .bak on local disk
  targetDatabase: string;       // Name of DB to create/overwrite
  fileMoves: {                  // WITH MOVE mappings
    logicalName: string;
    targetPath: string;
  }[];
}

export interface BackupBakConfig extends SqlcmdConnectionConfig {
  database: string;
  backupPath: string;           // Where to write .bak
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Redacts password from log output.
 */
function redactLog(content: string, password?: string): string {
  if (!content) return '';
  let result = content;
  if (password && password.length > 0) {
    const escaped = password.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    result = result.replace(new RegExp(escaped, 'g'), '********');
  }
  return result;
}

/**
 * Creates a tedious connection config object.
 */
function buildTediousConfig(cfg: SqlcmdConnectionConfig): any {
  const host = cfg.server.trim() || 'localhost';
  const port = parseInt(cfg.port.trim() || '1433', 10);

  return {
    server: host,
    options: {
      port,
      database: 'master',
      trustServerCertificate: cfg.trustServerCertificate,
      connectTimeout: 10000,
      requestTimeout: 0,   // Infinite — backup/restore can take a long time
      encrypt: false,
    },
    authentication: {
      type: 'default',
      options: {
        userName: cfg.username || 'sa',
        password: cfg.password || '',
      },
    },
  };
}

/**
 * Returns the default MSSQL data directory for the current OS.
 */
export function getDefaultDataDir(): string {
  if (process.platform === 'win32') {
    return 'C:\\Program Files\\Microsoft SQL Server\\MSSQL16.MSSQLSERVER\\MSSQL\\DATA\\';
  }
  return '/var/opt/mssql/data/';
}

/**
 * Returns the default MSSQL backup directory for the current OS.
 */
export function getDefaultBackupDir(): string {
  if (process.platform === 'win32') {
    return 'C:\\Program Files\\Microsoft SQL Server\\MSSQL16.MSSQLSERVER\\MSSQL\\Backup\\';
  }
  return '/var/opt/mssql/backup/';
}

/**
 * On Linux, copies .bak file into /var/opt/mssql/backup/ so MSSQL can access it.
 * Returns the path where MSSQL can read the .bak.
 */
export function ensureBakAccessible(bakFilePath: string): { accessiblePath: string; copied: boolean; error?: string } {
  if (process.platform === 'win32') {
    // On Windows, MSSQL can generally read from any location
    return { accessiblePath: bakFilePath, copied: false };
  }

  // On Linux, MSSQL runs as 'mssql' user and can only read from its own dirs
  const backupDir = getDefaultBackupDir();
  const fileName = path.basename(bakFilePath);
  const targetPath = path.join(backupDir, fileName);

  // If the file is already in the backup dir, no copy needed
  if (path.resolve(bakFilePath) === path.resolve(targetPath)) {
    return { accessiblePath: targetPath, copied: false };
  }

  // If already in an mssql-accessible directory
  if (bakFilePath.startsWith('/var/opt/mssql/')) {
    return { accessiblePath: bakFilePath, copied: false };
  }

  try {
    // Ensure backup dir exists
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    fs.copyFileSync(bakFilePath, targetPath);
    // Try to set permissions so mssql user can read it
    try { fs.chmodSync(targetPath, '644'); } catch (_) {}
    return { accessiblePath: targetPath, copied: true };
  } catch (err: any) {
    return {
      accessiblePath: bakFilePath,
      copied: false,
      error: `Could not copy .bak to ${backupDir}: ${err.message}. You may need to manually copy it with sudo.`,
    };
  }
}

// ---------------------------------------------------------------------------
// RESTORE FILELISTONLY — Read logical file names from .bak
// ---------------------------------------------------------------------------

export async function getFileListOnly(
  cfg: SqlcmdConnectionConfig,
  bakFilePath: string
): Promise<{ success: boolean; files?: BakFileInfo[]; message?: string }> {

  // Ensure the .bak is accessible to MSSQL
  const { accessiblePath, error: copyError } = ensureBakAccessible(bakFilePath);

  const tediousConfig = buildTediousConfig(cfg);

  return new Promise((resolve) => {
    try {
      const connection = new TediousConnection(tediousConfig);

      connection.on('connect', (err: any) => {
        if (err) {
          try { connection.close(); } catch (_) {}
          resolve({ success: false, message: `Connection failed: ${err.message}` });
          return;
        }

        const files: BakFileInfo[] = [];
        const sql = `RESTORE FILELISTONLY FROM DISK = N'${accessiblePath.replace(/'/g, "''")}';`;

        const request = new TediousRequest(sql, (queryErr: any) => {
          try { connection.close(); } catch (_) {}
          if (queryErr) {
            let msg = `FILELISTONLY error: ${queryErr.message}`;
            if (copyError) msg += `\n${copyError}`;
            if (queryErr.message.includes('Cannot open backup device') || queryErr.message.includes('Operating system error 5')) {
              msg += '\n\nPermission denied. On Linux, run: sudo cp "' + bakFilePath + '" /var/opt/mssql/backup/ && sudo chown mssql:mssql /var/opt/mssql/backup/' + path.basename(bakFilePath);
            }
            resolve({ success: false, message: msg });
          } else {
            resolve({ success: true, files });
          }
        });

        request.on('row', (columns: any[]) => {
          const row: any = {};
          columns.forEach((col: any) => {
            row[col.metadata.colName] = col.value;
          });
          files.push({
            logicalName: row['LogicalName'] || '',
            physicalName: row['PhysicalName'] || '',
            type: row['Type'] || '',
            size: row['Size'] ? Number(row['Size']) : 0,
          });
        });

        connection.execSql(request);
      });

      connection.on('error', (err: any) => {
        resolve({ success: false, message: err.message || 'Connection error' });
      });

      connection.connect();
    } catch (err: any) {
      resolve({ success: false, message: err.message });
    }
  });
}

// ---------------------------------------------------------------------------
// BACKUP DATABASE — Create native .bak backup
// ---------------------------------------------------------------------------

export async function backupDatabase(
  cfg: BackupBakConfig,
  window: BrowserWindow
): Promise<{ success: boolean; message: string }> {

  const tediousConfig = buildTediousConfig(cfg);
  const logEvent = (type: string, text: string) => {
    if (window && !window.isDestroyed()) {
      window.webContents.send('sqlpackage:log', {
        type,
        timestamp: new Date().toISOString(),
        content: redactLog(text, cfg.password),
      });
    }
  };

  const dbName = cfg.database.replace(/'/g, "''");
  const backupPath = cfg.backupPath.replace(/'/g, "''");

  logEvent('info', `Starting native BACKUP DATABASE...\nDatabase: ${cfg.database}\nDestination: ${cfg.backupPath}\n`);

  return new Promise((resolve) => {
    try {
      const connection = new TediousConnection(tediousConfig);

      connection.on('connect', (err: any) => {
        if (err) {
          try { connection.close(); } catch (_) {}
          logEvent('error', `Connection failed: ${err.message}`);
          resolve({ success: false, message: `Connection failed: ${err.message}` });
          return;
        }

        const sql = `BACKUP DATABASE [${dbName}] TO DISK = N'${backupPath}' WITH FORMAT, INIT, NAME = N'${dbName}-Full Database Backup', COMPRESSION, STATS = 5;`;

        logEvent('info', `Executing T-SQL:\n${sql}\n`);

        const request = new TediousRequest(sql, (queryErr: any) => {
          try { connection.close(); } catch (_) {}
          if (queryErr) {
            logEvent('error', `Backup failed: ${queryErr.message}`);
            resolve({ success: false, message: `Backup failed: ${queryErr.message}` });
          } else {
            logEvent('info', `✓ Backup completed successfully!\nFile saved to: ${cfg.backupPath}`);
            resolve({ success: true, message: `Backup completed: ${cfg.backupPath}` });
          }
        });

        // Capture informational messages (progress %)
        request.on('message' as any, (msg: any) => {
          if (msg && msg.message) {
            logEvent('stdout', msg.message);
          }
        });

        connection.execSql(request);
      });

      connection.on('infoMessage', (info: any) => {
        if (info && info.message) {
          logEvent('stdout', info.message);
        }
      });

      connection.on('error', (err: any) => {
        logEvent('error', err.message || 'Connection error');
        resolve({ success: false, message: err.message });
      });

      connection.connect();
    } catch (err: any) {
      logEvent('error', `Exception: ${err.message}`);
      resolve({ success: false, message: err.message });
    }
  });
}

// ---------------------------------------------------------------------------
// RESTORE DATABASE — Restore .bak with WITH MOVE
// ---------------------------------------------------------------------------

export async function restoreDatabase(
  cfg: RestoreBakConfig,
  window: BrowserWindow
): Promise<{ success: boolean; message: string }> {

  const tediousConfig = buildTediousConfig(cfg);
  const logEvent = (type: string, text: string) => {
    if (window && !window.isDestroyed()) {
      window.webContents.send('sqlpackage:log', {
        type,
        timestamp: new Date().toISOString(),
        content: redactLog(text, cfg.password),
      });
    }
  };

  // Ensure .bak is accessible
  const { accessiblePath, copied, error: copyError } = ensureBakAccessible(cfg.bakFilePath);
  if (copyError) {
    logEvent('stderr', `Warning: ${copyError}`);
  }
  if (copied) {
    logEvent('info', `Copied .bak to MSSQL backup directory: ${accessiblePath}`);
  }

  const dbName = cfg.targetDatabase.replace(/'/g, "''");
  const bakPath = accessiblePath.replace(/'/g, "''");

  // Build WITH MOVE clauses
  const moveClauses = cfg.fileMoves
    .map((m) => `MOVE N'${m.logicalName.replace(/'/g, "''")}' TO N'${m.targetPath.replace(/'/g, "''")}'`)
    .join(',\n     ');

  const sql = `RESTORE DATABASE [${dbName}] FROM DISK = N'${bakPath}'\nWITH ${moveClauses},\n     REPLACE, STATS = 5;`;

  logEvent('info', `Starting native RESTORE DATABASE...\nTarget Database: ${cfg.targetDatabase}\nSource .bak: ${accessiblePath}\n`);
  logEvent('info', `Executing T-SQL:\n${sql}\n`);

  return new Promise((resolve) => {
    try {
      const connection = new TediousConnection(tediousConfig);

      connection.on('connect', (err: any) => {
        if (err) {
          try { connection.close(); } catch (_) {}
          logEvent('error', `Connection failed: ${err.message}`);
          resolve({ success: false, message: `Connection failed: ${err.message}` });
          return;
        }

        const request = new TediousRequest(sql, (queryErr: any) => {
          try { connection.close(); } catch (_) {}
          if (queryErr) {
            let errMsg = `Restore failed: ${queryErr.message}`;
            if (queryErr.message.includes('Cannot open backup device') || queryErr.message.includes('Operating system error 5')) {
              errMsg += '\n\nPermission denied. On Linux, ensure the .bak file is in /var/opt/mssql/backup/ and owned by mssql user:\nsudo chown mssql:mssql ' + accessiblePath;
            }
            if (queryErr.message.includes('exclusive access')) {
              errMsg += '\n\nThe database is currently in use. Close all connections to it first.';
            }
            logEvent('error', errMsg);
            resolve({ success: false, message: errMsg });
          } else {
            logEvent('info', `✓ Database [${cfg.targetDatabase}] restored successfully!`);
            resolve({ success: true, message: `Database [${cfg.targetDatabase}] restored successfully from ${cfg.bakFilePath}` });
          }
        });

        connection.execSql(request);
      });

      connection.on('infoMessage', (info: any) => {
        if (info && info.message) {
          logEvent('stdout', info.message);
        }
      });

      connection.on('error', (err: any) => {
        logEvent('error', err.message || 'Connection error');
        resolve({ success: false, message: err.message });
      });

      connection.connect();
    } catch (err: any) {
      logEvent('error', `Exception: ${err.message}`);
      resolve({ success: false, message: err.message });
    }
  });
}

// ---------------------------------------------------------------------------
// Detect Server Default Data Path via T-SQL
// ---------------------------------------------------------------------------

export async function getServerDefaultPaths(
  cfg: SqlcmdConnectionConfig
): Promise<{ success: boolean; dataPath?: string; logPath?: string; message?: string }> {

  const tediousConfig = buildTediousConfig(cfg);

  return new Promise((resolve) => {
    try {
      const connection = new TediousConnection(tediousConfig);

      connection.on('connect', (err: any) => {
        if (err) {
          try { connection.close(); } catch (_) {}
          // Fallback to OS defaults
          const dataDir = getDefaultDataDir();
          resolve({ success: true, dataPath: dataDir, logPath: dataDir });
          return;
        }

        let dataPath = '';
        let logPath = '';
        const sql = `SELECT SERVERPROPERTY('InstanceDefaultDataPath') AS DataPath, SERVERPROPERTY('InstanceDefaultLogPath') AS LogPath;`;

        const request = new TediousRequest(sql, (queryErr: any) => {
          try { connection.close(); } catch (_) {}
          if (queryErr || (!dataPath && !logPath)) {
            const dataDir = getDefaultDataDir();
            resolve({ success: true, dataPath: dataDir, logPath: dataDir });
          } else {
            resolve({ success: true, dataPath: dataPath || getDefaultDataDir(), logPath: logPath || dataPath || getDefaultDataDir() });
          }
        });

        request.on('row', (columns: any[]) => {
          columns.forEach((col: any) => {
            if (col.metadata.colName === 'DataPath' && col.value) dataPath = col.value;
            if (col.metadata.colName === 'LogPath' && col.value) logPath = col.value;
          });
        });

        connection.execSql(request);
      });

      connection.on('error', () => {
        const dataDir = getDefaultDataDir();
        resolve({ success: true, dataPath: dataDir, logPath: dataDir });
      });

      connection.connect();
    } catch (_) {
      const dataDir = getDefaultDataDir();
      resolve({ success: true, dataPath: dataDir, logPath: dataDir });
    }
  });
}
