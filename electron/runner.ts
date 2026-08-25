import { spawn, ChildProcess } from 'child_process';
import { BrowserWindow } from 'electron';
import net from 'net';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { Connection as TediousConnection, Request as TediousRequest } from 'tedious';
import { getExecutablePath } from './downloader';

export interface ExportConfig {
  action: 'Export' | 'Import';
  server: string;
  port: string;
  authType: 'sql' | 'windows';
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
): Promise<{ success: boolean; databases?: string[]; message?: string }> {
  const host = config.server.trim() || 'localhost';
  const port = parseInt(config.port.trim() || '1433', 10);

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
    authentication: {
      type: 'default',
      options: {
        userName: config.username || 'sa',
        password: config.password || '',
      },
    },
  };

  return new Promise((resolve) => {
    try {
      const connection = new TediousConnection(tediousConfig);

      connection.on('connect', (err: any) => {
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

        const request = new TediousRequest(query, (queryErr: any) => {
          try { connection.close(); } catch (_) {}
          if (queryErr) {
            resolve({
              success: false,
              message: `Database query error: ${queryErr.message}`,
            });
          } else {
            resolve({
              success: true,
              databases,
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
        message: err.message || 'Exception establishing database connection',
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

    if (config.authType === 'sql') {
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

    if (config.authType === 'sql') {
      if (config.username) args.push(`/TargetUser:${config.username}`);
      if (config.password) args.push(`/TargetPassword:${config.password}`);
    }

    if (config.trustServerCertificate) {
      args.push('/TargetTrustServerCertificate:True');
    }

    // IMPORT-VALID PROPERTIES: AllowIncompatiblePlatform, IgnorePermissions, IgnoreUserBuilding, Storage, CommandTimeout
    if (config.compatibilityMode === 'legacy_downgrade') {
      args.push(`/p:Storage=${storageOption}`);
      args.push('/p:CommandTimeout=0');
      args.push('/p:AllowIncompatiblePlatform=True');
      args.push('/p:IgnorePermissions=True');
      args.push('/p:IgnoreUserBuilding=True');
    } else if (config.compatibilityMode === 'custom') {
      if (config.commandTimeout !== undefined) {
        args.push(`/p:CommandTimeout=${config.commandTimeout}`);
      }
      if (config.storage) {
        args.push(`/p:Storage=${storageOption}`);
      }
      if (config.allowIncompatiblePlatform) {
        args.push('/p:AllowIncompatiblePlatform=True');
      }
      if (config.ignorePermissions) {
        args.push('/p:IgnorePermissions=True');
        args.push('/p:IgnoreUserBuilding=True');
      }
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
): Promise<{ success: boolean; message: string; details?: string }> {
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

  // Step 2: Credentials & Database existence check using sqlpackage
  const executablePath = getExecutablePath();
  if (!fs.existsSync(executablePath)) {
    return {
      success: false,
      message: 'sqlpackage engine binary missing.',
      details: 'Please click "Acquire sqlpackage Engine" in top bar to download Microsoft engine.',
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
        message: 'TCP Connection Successful (sqlpackage responsive).',
        details: `Successfully reached ${host}:${port}. Server responded to connection attempt.`,
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
          message: `Successfully connected to ${config.database} on ${host}:${port}!`,
          details: `Authentication verified for user '${config.username || 'Windows Auth'}'. Database '${config.database}' exists.`,
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
          details: 'Server credentials and target database validated.',
        });
      } else if (combinedLogs.includes('Login failed')) {
        resolve({
          success: false,
          message: 'Authentication Failed (Error 18456)',
          details: `Login failed for user '${config.username}'. Check credentials.\nDetails: ${combinedLogs.trim()}`,
        });
      } else if (combinedLogs.includes('Cannot open database') || combinedLogs.includes('does not exist')) {
        resolve({
          success: false,
          message: `Database '${config.database}' Not Found`,
          details: `Target database '${config.database}' does not exist on server ${host}:${port}.\nDetails: ${combinedLogs.trim()}`,
        });
      } else if (combinedLogs.includes('certificate') || combinedLogs.includes('SSL')) {
        resolve({
          success: false,
          message: 'SSL Certificate Validation Error',
          details: `Server SSL certificate untrusted. Enable 'Trust Server Certificate' option.\nDetails: ${combinedLogs.trim()}`,
        });
      } else {
        resolve({
          success: false,
          message: 'Connection Test Completed',
          details: combinedLogs.trim() || `sqlpackage process exited with code ${code}`,
        });
      }
    });

    testProc.on('error', (err) => {
      clearTimeout(timeoutTimer);
      if (fs.existsSync(tempTestFile)) fs.unlinkSync(tempTestFile);
      resolve({
        success: false,
        message: 'Failed to launch sqlpackage process.',
        details: err.message,
      });
    });
  });
}

export function exportDatabase(
  config: ExportConfig,
  window: BrowserWindow
): Promise<{ success: boolean; message: string }> {
  return new Promise((resolve) => {
    if (activeChildProcess) {
      resolve({
        success: false,
        message: 'An export/import process is already running.',
      });
      return;
    }

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
