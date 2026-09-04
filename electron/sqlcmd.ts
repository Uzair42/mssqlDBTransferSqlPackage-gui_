import { BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { executeSqlQuery, executeSqlStreaming, DbConnectionConfig } from './dbDriver';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SqlcmdConnectionConfig {
  server: string;
  port: string;
  authType: 'sql' | 'windows';
  useCurrentWindowsUser?: boolean;
  domain?: string;
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
 * If permission denied (EACCES), uses pkexec to prompt user for root/sudo password in GUI.
 * Returns the path where MSSQL can read the .bak.
 */
export function ensureBakAccessible(bakFilePath: string): { accessiblePath: string; copied: boolean; error?: string } {
  if (process.platform === 'win32') {
    // On Windows, MSSQL can generally read directly from any drive / UNC path
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

  // 1. Try standard unprivileged Node.js copy
  try {
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    fs.copyFileSync(bakFilePath, targetPath);
    try { fs.chmodSync(targetPath, '666'); } catch (_) {}
    return { accessiblePath: targetPath, copied: true };
  } catch (err: any) {
    // 2. Unprivileged copy failed (EACCES). Use pkexec to prompt user for OS root/sudo password!
    try {
      const escapedSrc = bakFilePath.replace(/'/g, "'\\''");
      const escapedDst = targetPath.replace(/'/g, "'\\''");
      const escapedDir = backupDir.replace(/'/g, "'\\''");

      const cmd = `pkexec sh -c 'mkdir -p "${escapedDir}" && cp "${escapedSrc}" "${escapedDst}" && (chown mssql:mssql "${escapedDst}" || true) && chmod 666 "${escapedDst}"'`;
      execSync(cmd, { encoding: 'utf8', timeout: 30000 });

      if (fs.existsSync(targetPath)) {
        return { accessiblePath: targetPath, copied: true };
      }
    } catch (elevatedErr: any) {
      return {
        accessiblePath: bakFilePath,
        copied: false,
        error: `Could not copy .bak to ${backupDir} even with pkexec elevation: ${elevatedErr.message}.`,
      };
    }

    return { accessiblePath: targetPath, copied: true };
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

  const sql = `RESTORE FILELISTONLY FROM DISK = N'${accessiblePath.replace(/'/g, "''")}';`;

  const dbConfig: DbConnectionConfig = {
    ...cfg,
    database: 'master',
  };

  const res = await executeSqlQuery(dbConfig, sql);

  if (!res.success) {
    let msg = `FILELISTONLY error: ${res.message || 'Unknown error'}`;
    if (copyError) msg += `\n${copyError}`;
    if (
      res.message &&
      (res.message.includes('Cannot open backup device') || res.message.includes('Operating system error 5'))
    ) {
      msg += '\n\nPermission denied. On Linux, run: sudo cp "' + bakFilePath + '" /var/opt/mssql/backup/ && sudo chown mssql:mssql /var/opt/mssql/backup/' + path.basename(bakFilePath);
    }
    return { success: false, message: msg };
  }

  const files: BakFileInfo[] = (res.rows || []).map((row: any) => ({
    logicalName: row['LogicalName'] || '',
    physicalName: row['PhysicalName'] || '',
    type: row['Type'] || '',
    size: row['Size'] ? Number(row['Size']) : 0,
  }));

  return { success: true, files };
}

// ---------------------------------------------------------------------------
// BACKUP DATABASE — Create native .bak backup
// ---------------------------------------------------------------------------

export async function backupDatabase(
  cfg: BackupBakConfig,
  window: BrowserWindow
): Promise<{ success: boolean; message: string }> {

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

  const sql = `BACKUP DATABASE [${dbName}] TO DISK = N'${backupPath}' WITH FORMAT, INIT, NAME = N'${dbName}-Full Database Backup', COMPRESSION, STATS = 5;`;

  logEvent('info', `Executing T-SQL:\n${sql}\n`);

  const dbConfig: DbConnectionConfig = {
    ...cfg,
    database: 'master',
  };

  const res = await executeSqlStreaming(dbConfig, sql, {
    onMessage: (msg: string) => {
      logEvent('stdout', msg);
    },
  });

  if (!res.success) {
    logEvent('error', `Backup failed: ${res.message}`);
    return { success: false, message: `Backup failed: ${res.message}` };
  }

  logEvent('info', `✓ Backup completed successfully!\nFile saved to: ${cfg.backupPath}`);
  return { success: true, message: `Backup completed: ${cfg.backupPath}` };
}

// ---------------------------------------------------------------------------
// RESTORE DATABASE — Restore .bak with WITH MOVE
// ---------------------------------------------------------------------------

export async function restoreDatabase(
  cfg: RestoreBakConfig,
  window: BrowserWindow
): Promise<{ success: boolean; message: string }> {

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

  const dbConfig: DbConnectionConfig = {
    ...cfg,
    database: 'master',
  };

  const res = await executeSqlStreaming(dbConfig, sql, {
    onMessage: (msg: string) => {
      logEvent('stdout', msg);
    },
  });

  if (!res.success) {
    let errMsg = `Restore failed: ${res.message}`;
    if (
      res.message &&
      (res.message.includes('Cannot open backup device') || res.message.includes('Operating system error 5'))
    ) {
      errMsg += '\n\nPermission denied. On Linux, ensure the .bak file is in /var/opt/mssql/backup/ and owned by mssql user:\nsudo chown mssql:mssql ' + accessiblePath;
    }
    if (res.message && res.message.includes('exclusive access')) {
      errMsg += '\n\nThe database is currently in use. Close all connections to it first.';
    }
    logEvent('error', errMsg);
    return { success: false, message: errMsg };
  }

  logEvent('info', `✓ Database [${cfg.targetDatabase}] restored successfully!`);
  return { success: true, message: `Database [${cfg.targetDatabase}] restored successfully from ${cfg.bakFilePath}` };
}

// ---------------------------------------------------------------------------
// Detect Server Default Data Path via T-SQL
// ---------------------------------------------------------------------------

export async function getServerDefaultPaths(
  cfg: SqlcmdConnectionConfig
): Promise<{ success: boolean; dataPath?: string; logPath?: string; message?: string }> {

  const sql = `SELECT SERVERPROPERTY('InstanceDefaultDataPath') AS DataPath, SERVERPROPERTY('InstanceDefaultLogPath') AS LogPath;`;

  const dbConfig: DbConnectionConfig = {
    ...cfg,
    database: 'master',
  };

  const res = await executeSqlQuery(dbConfig, sql);

  if (!res.success || !res.rows || res.rows.length === 0) {
    const dataDir = getDefaultDataDir();
    return { success: true, dataPath: dataDir, logPath: dataDir };
  }

  const row = res.rows[0];
  const dataPath = row['DataPath'] || '';
  const logPath = row['LogPath'] || '';
  const defaultDir = getDefaultDataDir();

  return {
    success: true,
    dataPath: dataPath || defaultDir,
    logPath: logPath || dataPath || defaultDir,
  };
}
