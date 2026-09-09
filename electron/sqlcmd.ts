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

  const dbName = (cfg.database || '').replace(/'/g, "''");
  const rawTargetFile = (cfg.backupPath || (cfg as any).targetFile || '').trim();

  if (!dbName) {
    const err = 'Database name is required for backup.';
    logEvent('error', err);
    return { success: false, message: err };
  }

  if (!rawTargetFile) {
    const err = 'Destination .bak file path is required for backup.';
    logEvent('error', err);
    return { success: false, message: err };
  }

  // Normalize relative paths to absolute paths
  const resolvedTargetFile = path.isAbsolute(rawTargetFile) ? rawTargetFile : path.resolve(process.cwd(), rawTargetFile);

  const dbConfig: DbConnectionConfig = {
    ...cfg,
    database: 'master',
  };

  logEvent('info', `Starting native BACKUP DATABASE...\nDatabase: [${cfg.database}]\nRequested Destination: ${resolvedTargetFile}\n`);

  // Detect SQL Server native backup and data directories dynamically
  let nativeBackupDir = getDefaultBackupDir();
  let nativeDataDir = getDefaultDataDir();

  try {
    const pathQuery = `
      SELECT 
        CAST(SERVERPROPERTY('InstanceDefaultBackupPath') AS NVARCHAR(512)) AS DefaultBackupPath,
        CAST(SERVERPROPERTY('InstanceDefaultDataPath') AS NVARCHAR(512)) AS DefaultDataPath;
    `;
    const pathResult = await executeSqlQuery<{ DefaultBackupPath?: string; DefaultDataPath?: string }>(dbConfig, pathQuery);
    if (pathResult.success && pathResult.rows && pathResult.rows.length > 0) {
      if (pathResult.rows[0].DefaultBackupPath) {
        nativeBackupDir = pathResult.rows[0].DefaultBackupPath;
      }
      if (pathResult.rows[0].DefaultDataPath) {
        nativeDataDir = pathResult.rows[0].DefaultDataPath;
      }
    }
  } catch (_) {}

  // 1. Try backing up directly to requested path (if already absolute and within server scope)
  const sanitizedDirectPath = resolvedTargetFile.replace(/'/g, "''");
  // Universal backup syntax without hardcoded COMPRESSION (which fails on Express edition)
  let directSql = `BACKUP DATABASE [${dbName}] TO DISK = N'${sanitizedDirectPath}' WITH FORMAT, INIT, NAME = N'${dbName}-Full Database Backup', STATS = 5;`;
  logEvent('info', `Executing T-SQL:\n${directSql}\n`);

  let res = await executeSqlStreaming(dbConfig, directSql, {
    onMessage: (msg: string) => logEvent('stdout', msg),
  });

  // 2. If direct backup failed (e.g. OS error 2, OS error 5, path not found or access denied by mssql service)
  if (!res.success) {
    const failureReason = res.message || 'Access restricted by SQL Server service account';
    logEvent('stderr', `Direct write to "${resolvedTargetFile}" was not permitted by SQL Server engine (${failureReason}).\nInitiating automatic server-side native backup...\n`);

    // Candidate server-writable directories (deduplicated)
    const candidateDirs = Array.from(new Set([nativeBackupDir, nativeDataDir, getDefaultBackupDir(), getDefaultDataDir()].filter(Boolean)));
    let backupSuccessful = false;
    let successfulServerPath = '';

    for (const dir of candidateDirs) {
      if (!dir) continue;
      const tempBakName = `${dbName}_${Date.now()}.bak`;
      const serverCandidatePath = path.join(dir, tempBakName);
      const sanitizedCandidate = serverCandidatePath.replace(/'/g, "''");

      const serverSql = `BACKUP DATABASE [${dbName}] TO DISK = N'${sanitizedCandidate}' WITH FORMAT, INIT, NAME = N'${dbName}-Native Backup', STATS = 5;`;
      logEvent('info', `Attempting server-side backup via: ${serverCandidatePath}\n`);

      const serverRes = await executeSqlStreaming(dbConfig, serverSql, {
        onMessage: (msg: string) => logEvent('stdout', msg),
      });

      if (serverRes.success) {
        backupSuccessful = true;
        successfulServerPath = serverCandidatePath;
        res = serverRes;
        break;
      }
    }

    if (backupSuccessful && successfulServerPath) {
      try {
        const destDir = path.dirname(resolvedTargetFile);
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }

        // Try unprivileged copy
        try {
          fs.copyFileSync(successfulServerPath, resolvedTargetFile);
          logEvent('info', `✓ Successfully saved .bak backup to target destination: ${resolvedTargetFile}\n`);
          return { success: true, message: `Backup completed successfully: ${resolvedTargetFile}` };
        } catch (copyErr: any) {
          // On Linux, if SQL Server created file with permissions restricted to mssql user, use elevated copy
          if (process.platform === 'linux') {
            try {
              const escapedSrc = successfulServerPath.replace(/'/g, "'\\''");
              const escapedDst = resolvedTargetFile.replace(/'/g, "'\\''");
              execSync(`pkexec cp "${escapedSrc}" "${escapedDst}" && chmod 666 "${escapedDst}"`, { timeout: 30000 });
              if (fs.existsSync(resolvedTargetFile)) {
                logEvent('info', `✓ Successfully saved elevated .bak backup to target destination: ${resolvedTargetFile}\n`);
                return { success: true, message: `Backup completed successfully: ${resolvedTargetFile}` };
              }
            } catch (_) {}
          }

          logEvent('info', `✓ Backup generated at SQL Server path: ${successfulServerPath}\n(Could not copy to ${resolvedTargetFile}: ${copyErr.message})\n`);
          return { success: true, message: `Backup created at server path: ${successfulServerPath}` };
        }
      } catch (err: any) {
        logEvent('info', `✓ Backup generated at SQL Server path: ${successfulServerPath}\n`);
        return { success: true, message: `Backup created at: ${successfulServerPath}` };
      }
    }
  }

  if (!res.success) {
    const errorMsg = res.message || 'Unknown backup execution error';
    logEvent('error', `Backup failed: ${errorMsg}`);
    return { success: false, message: `Backup failed: ${errorMsg}` };
  }

  logEvent('info', `✓ Backup completed successfully!\nFile saved to: ${resolvedTargetFile}`);
  return { success: true, message: `Backup completed: ${resolvedTargetFile}` };
}

// ---------------------------------------------------------------------------
// RESTORE DATABASE — Restore .bak with WITH MOVE
// ---------------------------------------------------------------------------

export async function restoreDatabase(
  rawCfg: RestoreBakConfig | any,
  window: BrowserWindow
): Promise<{ success: boolean; message: string }> {

  // Defensively extract connection configuration whether flat or nested
  const cfg = rawCfg?.connConfig ? { ...rawCfg.connConfig, ...rawCfg } : (rawCfg || {});
  const targetDb = (cfg.targetDatabase || cfg.database || '').trim();
  const rawBakPath = (cfg.bakFilePath || cfg.targetFile || '').trim();
  const fileMoves = cfg.fileMoves || [];

  const logEvent = (type: string, text: string) => {
    if (window && !window.isDestroyed()) {
      window.webContents.send('sqlpackage:log', {
        type,
        timestamp: new Date().toISOString(),
        content: redactLog(text, cfg.password),
      });
    }
  };

  if (!targetDb) {
    const err = 'Target database name is required for restore.';
    logEvent('error', err);
    return { success: false, message: err };
  }

  if (!rawBakPath) {
    const err = 'Source .bak file path is required for restore.';
    logEvent('error', err);
    return { success: false, message: err };
  }

  // Ensure .bak is accessible to MSSQL
  const { accessiblePath, copied, error: copyError } = ensureBakAccessible(rawBakPath);
  if (copyError) {
    logEvent('stderr', `Warning: ${copyError}`);
  }
  if (copied) {
    logEvent('info', `Copied .bak to MSSQL backup directory: ${accessiblePath}`);
  }

  const dbName = targetDb.replace(/'/g, "''");
  const bakPath = accessiblePath.replace(/'/g, "''");

  // Build WITH MOVE clauses if provided
  let moveClauses = '';
  if (Array.isArray(fileMoves) && fileMoves.length > 0) {
    const validMoves = fileMoves.filter((m: any) => m && m.logicalName && m.targetPath);
    if (validMoves.length > 0) {
      moveClauses = validMoves
        .map((m: any) => `MOVE N'${m.logicalName.replace(/'/g, "''")}' TO N'${m.targetPath.replace(/'/g, "''")}'`)
        .join(',\n     ');
    }
  }

  const withOptions = moveClauses
    ? `WITH ${moveClauses},\n     REPLACE, STATS = 5;`
    : `WITH REPLACE, STATS = 5;`;

  const sql = `RESTORE DATABASE [${dbName}] FROM DISK = N'${bakPath}'\n${withOptions}`;

  logEvent('info', `Starting native RESTORE DATABASE...\nTarget Database: ${targetDb}\nSource .bak: ${accessiblePath}\n`);
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

    // Handle Version Incompatibility Error 3169
    if (res.message && (res.message.includes('3169') || res.message.includes('incompatible with this server') || res.message.includes('backed up on a server running version'))) {
      errMsg += '\n\n════════════════════════════════════════════════════════════════\n' +
        '⚠️ MSSQL VERSION DOWNGRADE INCOMPATIBILITY DETECTED (Error 3169)\n' +
        '════════════════════════════════════════════════════════════════\n' +
        'Native .bak files CANNOT be restored from a newer SQL Server version into an older SQL Server version.\n\n' +
        'Solution: Switch to the "Export / Import .bacpac" tab in this app.\n' +
        '.bacpac export extracts the schema and data in a version-agnostic format that can be imported onto ANY SQL Server version (e.g. SQL Server 2012/2014/2016/2019/2022 on Windows or Linux).\n' +
        '════════════════════════════════════════════════════════════════';
    } else if (
      res.message &&
      (res.message.includes('Cannot open backup device') || res.message.includes('Operating system error 5'))
    ) {
      errMsg += '\n\nPermission denied. On Linux, ensure the .bak file is in /var/opt/mssql/backup/ and owned by mssql user:\nsudo chown mssql:mssql ' + accessiblePath;
    } else if (res.message && res.message.includes('Operating system error 3')) {
      errMsg += '\n\nPath not found. When restoring a Windows .bak onto Linux (or vice versa), ensure the physical file paths in WITH MOVE are set to the target OS format (e.g. /var/opt/mssql/data/ on Linux or C:\\Program Files\\... on Windows).';
    } else if (res.message && res.message.includes('exclusive access')) {
      errMsg += '\n\nThe database is currently in use. Close all connections to it first or alter it to single user mode.';
    }

    logEvent('error', errMsg);
    return { success: false, message: errMsg };
  }

  logEvent('info', `✓ Database [${targetDb}] restored successfully!`);
  return { success: true, message: `Database [${targetDb}] restored successfully from ${accessiblePath}` };
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

// ---------------------------------------------------------------------------
// Query Physical .mdf/.ldf Data & Log Files for Database
// ---------------------------------------------------------------------------

export async function getDatabasePhysicalFiles(
  cfg: SqlcmdConnectionConfig,
  databaseName?: string
): Promise<{
  success: boolean;
  files?: Array<{
    logicalName: string;
    physicalName: string;
    typeDesc: string;
    sizeMB: number;
    growthMB: number;
    stateDesc: string;
  }>;
  dataPath?: string;
  logPath?: string;
  message?: string;
}> {
  const targetDb = (databaseName || (cfg as any).database || 'master').replace(/'/g, "''");
  const sql = `
    SELECT 
      mf.name AS logicalName,
      mf.physical_name AS physicalName,
      mf.type_desc AS typeDesc,
      CAST((mf.size * 8.0 / 1024) AS DECIMAL(10,2)) AS sizeMB,
      CAST((CASE WHEN mf.is_percent_growth = 1 THEN (mf.size * 8.0 / 1024) * (mf.growth / 100.0) ELSE (mf.growth * 8.0 / 1024) END) AS DECIMAL(10,2)) AS growthMB,
      mf.state_desc AS stateDesc
    FROM sys.master_files mf
    JOIN sys.databases d ON mf.database_id = d.database_id
    WHERE d.name = N'${targetDb}'
    ORDER BY mf.type;
  `;

  const dbConfig: DbConnectionConfig = {
    ...cfg,
    database: 'master',
    connectTimeout: 5000,
    requestTimeout: 10000,
  };

  const res = await executeSqlQuery(dbConfig, sql);

  if (!res.success) {
    return {
      success: false,
      message: `Failed to inspect physical files for database [${targetDb}]: ${res.message}`,
    };
  }

  const files = (res.rows || []).map((r: any) => ({
    logicalName: r['logicalName'] || r['name'] || '',
    physicalName: r['physicalName'] || r['physical_name'] || '',
    typeDesc: r['typeDesc'] || r['type_desc'] || 'ROWS',
    sizeMB: Number(r['sizeMB'] || 0),
    growthMB: Number(r['growthMB'] || 0),
    stateDesc: r['stateDesc'] || r['state_desc'] || 'ONLINE',
  }));

  const paths = await getServerDefaultPaths(cfg);

  return {
    success: true,
    files,
    dataPath: paths.dataPath,
    logPath: paths.logPath,
  };
}

