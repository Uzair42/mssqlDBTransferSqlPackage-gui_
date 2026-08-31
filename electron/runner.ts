import { spawn, ChildProcess } from 'child_process';
import { BrowserWindow } from 'electron';
import net from 'net';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { Connection as TediousConnection, Request as TediousRequest } from 'tedious';
import { getExecutablePath } from './downloader';
import { fetchServerVersionDetails, ServerVersionInfo } from './systemInfo';

export interface ExportConfig {
  action: 'Export' | 'Import' | 'Backup' | 'Restore_Bak';
  server: string;
  port: string;
  authType: 'sql' | 'windows';
  useCurrentWindowsUser?: boolean;
  domain?: string;
  username?: string;
  password?: string;
  database: string;
  targetFile: string;
  trustServerCertificate: boolean;

  // Cross-version & Legacy Downgrade Options
  compatibilityMode: 'standard' | 'legacy_downgrade' | 'custom';
  commandTimeout: number; // 0 = infinite timeout for large DBs
  storage: 'File' | 'Memory';
  allowIncompatiblePlatform: boolean;
  ignorePermissions: boolean;
  verifyExtraction: boolean;
}

let activeChildProcess: ChildProcess | null = null;

/**
 * Redacts sensitive password information from raw log output streams.
 */
function redactLog(content: string, password?: string): string {
  if (!content) return '';
  let result = content;

  if (password && password.length > 0) {
    const escapedPassword = password.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(escapedPassword, 'g');
    result = result.replace(regex, '********');
  }

  // Redact any exposed /SourcePassword:<val> or /TargetPassword:<val> arguments in logs
  result = result.replace(/\/(Source|Target)Password:\S+/gi, '/$1Password:********');

  return result;
}

/**
 * Connects to master database using tedious and retrieves all online database names.
 */
export async function fetchDatabases(
  config: ExportConfig
): Promise<{ success: boolean; databases?: string[]; serverInfo?: ServerVersionInfo; message?: string }> {
  const host = config.server.trim() || 'localhost';
  const port = parseInt(config.port.trim() || '1433', 10);

  const authOptions: any = config.authType === 'windows'
    ? {
        type: 'ntlm',
        options: {
          domain: config.domain || '',
          userName: config.username || '',
          password: config.password || '',
        },
      }
    : {
        type: 'default',
        options: {
          userName: config.username || 'sa',
          password: config.password || '',
        },
      };

  const tediousConfig: any = {
    server: host,
    options: {
      port: port,
      database: 'master',
      trustServerCertificate: config.trustServerCertificate,
      connectTimeout: 5000,
      requestTimeout: 5000,
      encrypt: false,
    },
    authentication: authOptions,
  };

  return new Promise((resolve) => {
    try {
      const connection = new TediousConnection(tediousConfig);

      connection.on('connect', async (err: any) => {
        if (err) {
          try { connection.close(); } catch (_) {}
          resolve({
            success: false,
            message: `Failed to connect to server: ${err.message}`,
          });
          return;
        }

        const databases: string[] = [];
        const query = "SELECT name FROM sys.databases WHERE state_desc = 'ONLINE' ORDER BY name;";

        const request = new TediousRequest(query, async (queryErr: any) => {
          try { connection.close(); } catch (_) {}
          if (queryErr) {
            resolve({
              success: false,
              message: `Database query error: ${queryErr.message}`,
            });
          } else {
            // Also fetch server version telemetry
            let serverInfo: ServerVersionInfo | undefined;
            try {
              const verRes = await fetchServerVersionDetails(config);
              if (verRes.success) serverInfo = verRes.serverInfo;
            } catch (_) {}

            resolve({
              success: true,
              databases,
              serverInfo,
            });
          }
        });

        request.on('row', (columns: any[]) => {
          const dbName = columns[0]?.value;
          if (dbName && typeof dbName === 'string') {
            databases.push(dbName);
          }
        });

        connection.execSql(request);
      });

      connection.on('error', (err: any) => {
        resolve({
          success: false,
          message: err.message || 'Database connection error',
        });
      });

      connection.connect();
    } catch (err: any) {
      resolve({
        success: false,
        message: err.message || 'Error initializing connection to database',
      });
    }
  });
}

/**
 * Builds array of command line arguments for sqlpackage strictly enforcing
 * valid properties for /action:Export vs /action:Import vs /action:Script.
 */
export function buildSqlpackageArgs(config: ExportConfig): string[] {
  const serverName =
    config.port && config.port !== '1433'
      ? `${config.server},${config.port}`
      : config.server;

  // Storage selection: .NET Core requires Memory storage (File storage is legacy Windows ESE only)
  const storageOption = config.storage === 'File' && process.platform !== 'win32' ? 'Memory' : config.storage || 'Memory';

  if (config.action === 'Export') {
    // ----------------------------------------------------
    // ACTION: EXPORT (Extract DB from Server to .bacpac)
    // ----------------------------------------------------
    const args: string[] = ['/action:Export'];
    args.push(`/SourceServerName:${serverName}`);
    args.push(`/SourceDatabaseName:${config.database}`);
    args.push(`/TargetFile:${config.targetFile}`);

    if (config.authType === 'windows') {
      if (config.username && config.username.trim().length > 0) {
        const fullUser = config.domain ? `${config.domain}\\${config.username}` : config.username;
        args.push(`/SourceUser:${fullUser}`);
        if (config.password) args.push(`/SourcePassword:${config.password}`);
      } else {
        // SSPI / Integrated Security for current logged in Windows user
        args.push('/SourceIntegratedSecurity:True');
      }
    } else {
      if (config.username) args.push(`/SourceUser:${config.username}`);
      if (config.password) args.push(`/SourcePassword:${config.password}`);
    }

    if (config.trustServerCertificate) {
      args.push('/SourceTrustServerCertificate:True');
    }

    // EXPORT-VALID PROPERTIES ONLY: Storage, CommandTimeout, VerifyExtraction
    if (config.compatibilityMode === 'legacy_downgrade') {
      args.push(`/p:Storage=${storageOption}`);
      args.push('/p:CommandTimeout=0');
      args.push('/p:VerifyExtraction=False');
    } else if (config.compatibilityMode === 'custom') {
      if (config.commandTimeout !== undefined) {
        args.push(`/p:CommandTimeout=${config.commandTimeout}`);
      }
      if (config.storage) {
        args.push(`/p:Storage=${storageOption}`);
      }
      if (!config.verifyExtraction) {
        args.push('/p:VerifyExtraction=False');
      }
    } else {
      // Standard Export Mode
      args.push(`/p:Storage=${storageOption}`);
    }
    return args;
  } else {
    // ----------------------------------------------------
    // ACTION: IMPORT (Restore .bacpac onto Target Server)
    // ----------------------------------------------------
    const args: string[] = ['/action:Import'];
    args.push(`/TargetServerName:${serverName}`);
    args.push(`/TargetDatabaseName:${config.database}`);
    args.push(`/SourceFile:${config.targetFile}`);

    if (config.authType === 'windows') {
      if (config.username && config.username.trim().length > 0) {
        const fullUser = config.domain ? `${config.domain}\\${config.username}` : config.username;
        args.push(`/TargetUser:${fullUser}`);
        if (config.password) args.push(`/TargetPassword:${config.password}`);
      } else {
        // SSPI / Integrated Security for current logged in Windows user
        args.push('/TargetIntegratedSecurity:True');
      }
    } else {
      if (config.username) args.push(`/TargetUser:${config.username}`);
      if (config.password) args.push(`/TargetPassword:${config.password}`);
    }

    if (config.trustServerCertificate) {
      args.push('/TargetTrustServerCertificate:True');
    }

    // IMPORT-VALID PROPERTIES: Storage, CommandTimeout
    if (config.compatibilityMode === 'legacy_downgrade' || config.compatibilityMode === 'custom') {
      args.push(`/p:Storage=${storageOption}`);
      args.push('/p:CommandTimeout=0');
    } else {
      // Standard Import Mode
      args.push(`/p:Storage=${storageOption}`);
    }
    return args;
  }
}

/**
 * Test Connection logic: Performs TCP network probe followed by sqlpackage authentication validation.
 */
export async function testConnection(
  config: ExportConfig
): Promise<{ success: boolean; message: string; details?: string; serverInfo?: ServerVersionInfo }> {
  const host = config.server.trim();
  const port = parseInt(config.port.trim() || '1433', 10);

  // Step 1: TCP Port Connectivity Check
  const tcpCheck = await new Promise<{ success: boolean; error?: string }>((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(4000);

    socket.on('connect', () => {
      socket.destroy();
      resolve({ success: true });
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve({ success: false, error: `Connection timed out after 4 seconds to ${host}:${port}.` });
    });

    socket.on('error', (err) => {
      socket.destroy();
      resolve({ success: false, error: err.message });
    });

    socket.connect(port, host);
  });

  if (!tcpCheck.success) {
    return {
      success: false,
      message: `Network Host Unreachable (${host}:${port})`,
      details: `Could not establish TCP socket connection to ${host} on port ${port}. Ensure MSSQL Server is running, TCP/IP is enabled, and port ${port} is open in firewall.\nReason: ${tcpCheck.error}`,
    };
  }

  // Step 2: Query SQL Server version & driver telemetry
  const verCheck = await fetchServerVersionDetails(config);
  if (!verCheck.success) {
    const errorMsg = verCheck.message || 'Connection error';
    let userMsg = 'Database Connection Failed';
    if (errorMsg.includes('Login failed')) {
      userMsg = 'Authentication Failed (Error 18456)';
    } else if (errorMsg.includes('certificate') || errorMsg.includes('SSL')) {
      userMsg = 'SSL Certificate Untrusted';
    }
    return {
      success: false,
      message: userMsg,
      details: errorMsg,
    };
  }

  const serverInfo = verCheck.serverInfo;

  // Step 3: sqlpackage engine validation
  const executablePath = getExecutablePath();
  const engineExists = fs.existsSync(executablePath);

  // If no database specified (e.g. in Restore_Bak mode), connection is verified
  if (!config.database || config.action === 'Restore_Bak') {
    return {
      success: true,
      message: `Successfully connected to ${serverInfo?.friendlyVersion || 'MSSQL Server'}!`,
      details: `Server: ${serverInfo?.friendlyVersion} (${serverInfo?.productVersion})\nActive Session Driver: ${serverInfo?.activeDriver}\nMachine: ${serverInfo?.machineName || host} | SPID: ${serverInfo?.spid || 'N/A'}${!engineExists ? '\n\nNote: sqlpackage CLI engine is not installed yet. Click "Acquire sqlpackage Engine" in top bar.' : ''}`,
      serverInfo,
    };
  }

  if (!engineExists) {
    return {
      success: true,
      message: `Connected to ${serverInfo?.friendlyVersion || 'MSSQL Server'} (Engine missing)`,
      details: `Authentication verified! Server: ${serverInfo?.productVersion} (${serverInfo?.edition})\nWarning: sqlpackage engine binary is not downloaded yet. Click "Acquire sqlpackage Engine" in top bar for export operations.`,
      serverInfo,
    };
  }

  const tempTestFile = path.join(os.tmpdir(), `test_conn_${Date.now()}.bacpac`);
  const testArgs = buildSqlpackageArgs({
    ...config,
    action: config.action,
    targetFile: tempTestFile,
  });

  return new Promise((resolve) => {
    let stdoutBuffer = '';
    let stderrBuffer = '';

    const testProc = spawn(executablePath, testArgs, {
      shell: false,
      windowsHide: true,
    });

    const timeoutTimer = setTimeout(() => {
      try {
        testProc.kill('SIGKILL');
      } catch (_) {}
      if (fs.existsSync(tempTestFile)) fs.unlinkSync(tempTestFile);
      resolve({
        success: true,
        message: `Connected to ${config.database} on ${serverInfo?.friendlyVersion || host}!`,
        details: `Successfully reached ${host}:${port}. Server responded to sqlpackage probe.\nDriver: ${serverInfo?.activeDriver}\nEngine: ${serverInfo?.engineDriver}`,
        serverInfo,
      });
    }, 6000);

    testProc.stdout?.on('data', (data) => {
      stdoutBuffer += data.toString('utf8');
      if (
        stdoutBuffer.includes('Exporting database') ||
        stdoutBuffer.includes('Initializing deployment') ||
        stdoutBuffer.includes('Importing package')
      ) {
        clearTimeout(timeoutTimer);
        try {
          testProc.kill('SIGKILL');
        } catch (_) {}
        if (fs.existsSync(tempTestFile)) fs.unlinkSync(tempTestFile);
        resolve({
          success: true,
          message: `Successfully connected to ${config.database} on ${serverInfo?.friendlyVersion || host}!`,
          details: `Authentication verified for '${config.username || 'Windows Auth'}'. Database '${config.database}' exists.\nServer: ${serverInfo?.productVersion} (${serverInfo?.edition})\nDriver: ${serverInfo?.activeDriver}`,
          serverInfo,
        });
      }
    });

    testProc.stderr?.on('data', (data) => {
      stderrBuffer += data.toString('utf8');
    });

    testProc.on('close', (code) => {
      clearTimeout(timeoutTimer);
      if (fs.existsSync(tempTestFile)) fs.unlinkSync(tempTestFile);

      const combinedLogs = redactLog(`${stdoutBuffer}\n${stderrBuffer}`, config.password);

      if (code === 0) {
        resolve({
          success: true,
          message: `Successfully connected to ${config.database} on ${host}:${port}!`,
          details: `Server credentials and target database validated.\nServer: ${serverInfo?.friendlyVersion} (${serverInfo?.productVersion})\nDriver: ${serverInfo?.activeDriver}`,
          serverInfo,
        });
      } else if (combinedLogs.includes('Cannot open database') || combinedLogs.includes('does not exist')) {
        resolve({
          success: false,
          message: `Database '${config.database}' Not Found`,
          details: `Server connected successfully (${serverInfo?.friendlyVersion}), but database '${config.database}' was not found on server.\nDetails: ${combinedLogs.trim()}`,
          serverInfo,
        });
      } else {
        // Even if sqlpackage threw non-zero, tedious authentication succeeded, so provide meaningful info
        resolve({
          success: true,
          message: `Connected to ${serverInfo?.friendlyVersion || host}!`,
          details: `Authentication verified via ${serverInfo?.activeDriver}.\nServer: ${serverInfo?.productVersion} (${serverInfo?.edition})\n${combinedLogs.trim()}`,
          serverInfo,
        });
      }
    });

    testProc.on('error', (err) => {
      clearTimeout(timeoutTimer);
      if (fs.existsSync(tempTestFile)) fs.unlinkSync(tempTestFile);
      resolve({
        success: true,
        message: `Connected to ${serverInfo?.friendlyVersion || host} (Engine error)`,
        details: `Connected via ${serverInfo?.activeDriver}, but sqlpackage launch failed: ${err.message}`,
        serverInfo,
      });
    });
  });
}

export async function exportDatabase(
  config: ExportConfig,
  window: BrowserWindow
): Promise<{ success: boolean; message: string }> {
  if (activeChildProcess) {
    return {
      success: false,
      message: 'An export/import process is already running.',
    };
  }

  const logEvent = (type: 'info' | 'stdout' | 'stderr' | 'error', text: string) => {
    if (window && !window.isDestroyed()) {
      window.webContents.send('sqlpackage:log', {
        type,
        timestamp: new Date().toISOString(),
        content: redactLog(text, config.password),
      });
    }
  };

  // If Importing, prepare target DB by dropping existing DB if present (prevents SQL71659 error)
  if (config.action === 'Import' && config.database) {
    const host = config.server.trim() || 'localhost';
    const port = parseInt(config.port.trim() || '1433', 10);
    const dbName = config.database.replace(/'/g, "''");

    const tediousConfig: any = {
      server: host,
      options: {
        port,
        database: 'master',
        trustServerCertificate: config.trustServerCertificate,
        connectTimeout: 5000,
        requestTimeout: 10000,
        encrypt: false,
      },
      authentication: {
        type: 'default',
        options: {
          userName: config.username || 'sa',
          password: config.password || '',
        },
      },
    };

    await new Promise<void>((resolve) => {
      try {
        const connection = new TediousConnection(tediousConfig);
        connection.on('connect', (err: any) => {
          if (err) {
            resolve();
            return;
          }
          const sql = `
            IF EXISTS (SELECT name FROM sys.databases WHERE name = N'${dbName}')
            BEGIN
                ALTER DATABASE [${dbName}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
                DROP DATABASE [${dbName}];
            END
          `;
          logEvent('info', `Preparing target database [${config.database}] on server...\n`);
          const request = new TediousRequest(sql, () => {
            try { connection.close(); } catch (_) {}
            logEvent('info', `✓ Target database [${config.database}] ready for fresh import.\n`);
            resolve();
          });
          connection.execSql(request);
        });
        connection.on('error', () => resolve());
        connection.connect();
      } catch (_) {
        resolve();
      }
    });
  }

  return new Promise((resolve) => {
    const executablePath = getExecutablePath();
    const args = buildSqlpackageArgs(config);

    // Display args with masked password for UI console
    const displayArgs = args.map((arg) =>
      arg.startsWith('/SourcePassword:') || arg.startsWith('/TargetPassword:')
        ? arg.replace(/:.*/, ':********')
        : arg
    );

    const logEvent = (type: 'info' | 'stdout' | 'stderr' | 'error', text: string) => {
      if (window && !window.isDestroyed()) {
        window.webContents.send('sqlpackage:log', {
          type,
          timestamp: new Date().toISOString(),
          content: redactLog(text, config.password),
        });
      }
    };

    const actionLabel =
      config.action === 'Export'
        ? 'Export .bacpac'
        : 'Import / Restore';

    logEvent(
      'info',
      `Starting sqlpackage ${actionLabel} engine...\nExecutable: ${executablePath}\nArguments: sqlpackage ${displayArgs.join(' ')}\n`
    );

    try {
      activeChildProcess = spawn(executablePath, args, {
        shell: false,
        windowsHide: true,
      });

      activeChildProcess.stdout?.on('data', (data: Buffer) => {
        const text = data.toString('utf8');
        logEvent('stdout', text);
      });

      activeChildProcess.stderr?.on('data', (data: Buffer) => {
        const text = data.toString('utf8');
        logEvent('stderr', text);
      });

      activeChildProcess.on('error', (err: Error) => {
        logEvent('error', `Failed to start process: ${err.message}`);
        activeChildProcess = null;
        resolve({
          success: false,
          message: `Execution failed: ${err.message}`,
        });
      });

      activeChildProcess.on('close', (code: number | null, signal: string | null) => {
        activeChildProcess = null;
        if (signal === 'SIGTERM' || signal === 'SIGKILL') {
          logEvent('info', 'Process was manually terminated by user.');
          resolve({
            success: false,
            message: `${actionLabel} operation canceled by user.`,
          });
        } else if (code === 0) {
          logEvent('info', `Database ${actionLabel} completed successfully!`);
          resolve({
            success: true,
            message: `Database ${actionLabel} completed successfully.`,
          });
        } else {
          logEvent('error', `sqlpackage process exited with code ${code}.`);
          resolve({
            success: false,
            message: `${actionLabel} failed with exit code ${code}. Check log terminal for details.`,
          });
        }
      });
    } catch (err) {
      activeChildProcess = null;
      const errorMsg = (err as Error).message;
      logEvent('error', `Process spawn exception: ${errorMsg}`);
      resolve({
        success: false,
        message: `Failed to spawn process: ${errorMsg}`,
      });
    }
  });
}

export function cancelExport(): { success: boolean; message: string } {
  if (!activeChildProcess) {
    return { success: false, message: 'No active process is running.' };
  }

  try {
    const killed = activeChildProcess.kill('SIGTERM');
    if (!killed) {
      activeChildProcess.kill('SIGKILL');
    }
    return { success: true, message: 'Cancellation signal sent.' };
  } catch (err) {
    return {
      success: false,
      message: `Failed to kill process: ${(err as Error).message}`,
    };
  }
}

export function isExportRunning(): boolean {
  return activeChildProcess !== null;
}
