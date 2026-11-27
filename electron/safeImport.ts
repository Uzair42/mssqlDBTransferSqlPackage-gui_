import { spawn, ChildProcess } from 'child_process';
import { BrowserWindow } from 'electron';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { ExportConfig, buildSqlpackageArgs } from './runner';

let activeImportProcess: ChildProcess | null = null;

function redact(text: string, password?: string): string {
  let result = text;
  if (password) {
    const escaped = password.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    result = result.replace(new RegExp(escaped, 'g'), '********');
  }
  return result.replace(/\/(Source|Target)Password:\S+/gi, '/$1Password:********');
}

/** Runs BACPAC imports without the legacy pre-import DROP DATABASE behavior. */
export async function importBacpacSafely(
  config: ExportConfig,
  window: BrowserWindow
): Promise<{ success: boolean; message: string }> {
  if (activeImportProcess) {
    return { success: false, message: 'A BACPAC import is already running.' };
  }

  const database = (config.database || '').trim();
  const sourceFile = (config.targetFile || '').trim();
  if (!database || !sourceFile) {
    return { success: false, message: 'A target database and source BACPAC file are required.' };
  }
  if (/^(master|model|msdb|tempdb)$/i.test(database)) {
    return { success: false, message: 'Importing into a SQL Server system database is not allowed.' };
  }
  if (!fs.existsSync(sourceFile) || !fs.statSync(sourceFile).isFile()) {
    return { success: false, message: `The selected import file does not exist: ${sourceFile}` };
  }

  let effectiveConfig: ExportConfig = { ...config, action: 'Import' };
  let tempBacpacFile: string | null = null;
  if (sourceFile.toLowerCase().endsWith('.zip')) {
    const baseName = path.basename(sourceFile).replace(/\.zip$/i, '');
    const bacpacName = baseName.toLowerCase().endsWith('.bacpac') ? baseName : `${baseName}.bacpac`;
    tempBacpacFile = path.join(os.tmpdir(), `import_${Date.now()}_${bacpacName}`);
    try {
      fs.copyFileSync(sourceFile, tempBacpacFile, fs.constants.COPYFILE_EXCL);
      effectiveConfig = { ...effectiveConfig, targetFile: tempBacpacFile };
    } catch (error) {
      return { success: false, message: `Could not prepare the selected .zip as a BACPAC: ${(error as Error).message}` };
    }
  }

  const log = (type: 'info' | 'stdout' | 'stderr' | 'error', text: string) => {
    if (!window.isDestroyed()) {
      window.webContents.send('sqlpackage:log', {
        type,
        timestamp: new Date().toISOString(),
        content: redact(text, config.password),
      });
    }
  };

  const args = buildSqlpackageArgs(effectiveConfig);
  const displayArgs = args.map((arg) =>
    arg.startsWith('/SourcePassword:') || arg.startsWith('/TargetPassword:')
      ? arg.replace(/:.*/, ':********')
      : arg
  );
  log('info', `Starting safe BACPAC import into [${database}] on ${config.server}. Existing databases are not automatically dropped.\nArguments: sqlpackage ${displayArgs.join(' ')}\n`);

  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: { success: boolean; message: string }) => {
      if (settled) return;
      settled = true;
      activeImportProcess = null;
      if (tempBacpacFile) {
        try { fs.unlinkSync(tempBacpacFile); } catch (_) { /* best-effort cleanup */ }
      }
      resolve(result);
    };

    try {
      const executablePath = require('./downloader').getExecutablePath() as string;
      activeImportProcess = spawn(executablePath, args, { shell: false, windowsHide: true });
      activeImportProcess.stdout?.on('data', (data: Buffer) => log('stdout', data.toString('utf8')));
      activeImportProcess.stderr?.on('data', (data: Buffer) => log('stderr', data.toString('utf8')));
      activeImportProcess.once('error', (error: Error) => {
        log('error', `Failed to start BACPAC import: ${error.message}`);
        finish({ success: false, message: `Could not start BACPAC import: ${error.message}` });
      });
      activeImportProcess.once('close', (code, signal) => {
        if (signal) {
          log('info', 'BACPAC import process was cancelled.');
          finish({ success: false, message: 'BACPAC import was cancelled.' });
        } else if (code === 0) {
          log('info', `BACPAC import into [${database}] completed successfully.`);
          finish({ success: true, message: `BACPAC import into [${database}] completed successfully.` });
        } else {
          log('error', `BACPAC import failed with exit code ${code}.`);
          finish({ success: false, message: `BACPAC import failed with exit code ${code}. Check the operation log for details.` });
        }
      });
    } catch (error) {
      finish({ success: false, message: `Could not start BACPAC import: ${(error as Error).message}` });
    }
  });
}

export function cancelBacpacImport(): { success: boolean; message: string } {
  if (!activeImportProcess) return { success: false, message: 'No BACPAC import is running.' };
  try {
    activeImportProcess.kill('SIGTERM');
    return { success: true, message: 'Cancellation signal sent to BACPAC import.' };
  } catch (error) {
    return { success: false, message: `Could not cancel BACPAC import: ${(error as Error).message}` };
  }
}
