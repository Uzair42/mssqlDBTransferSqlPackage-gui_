import { app } from 'electron';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { execSync } from 'child_process';
import { URL } from 'url';
import AdmZip from 'adm-zip';
import * as tar from 'tar';

export interface ProgressCallback {
  (progress: { status: string; percent: number; message: string }): void;
}

export interface SqlpackageStatus {
  exists: boolean;
  executablePath: string;
  os: 'win32' | 'linux' | 'darwin' | string;
  source?: 'local_app' | 'system_path' | 'ssms_dacfx' | 'dotnet_tool' | 'opt';
  version?: string;
}

export function getSqlpackageDir(): string {
  return path.join(app.getPath('userData'), 'bin', 'sqlpackage');
}

/**
 * Resolves sqlpackage executable path across Windows and Linux.
 * Checks local app directory first, then system PATH, SSMS DacFx installations, and .NET global tools.
 */
export function getExecutablePath(): string {
  const isWin = process.platform === 'win32';
  const binDir = getSqlpackageDir();
  const localExe = path.join(binDir, isWin ? 'sqlpackage.exe' : 'sqlpackage');

  // 1. Check local app storage directory
  if (fs.existsSync(localExe)) {
    if (!isWin) {
      try { fs.chmodSync(localExe, '755'); } catch (_) {}
    }
    return localExe;
  }

  // 2. Windows-Specific Discovery
  if (isWin) {
    // Check standard SSMS & Visual Studio DacFx directories
    const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files';
    const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
    const userProfile = process.env['USERPROFILE'] || 'C:\\Users\\Default';

    const standardWindowsPaths = [
      path.join(programFiles, 'Microsoft SQL Server', '160', 'DAC', 'bin', 'sqlpackage.exe'), // SQL Server 2022
      path.join(programFiles, 'Microsoft SQL Server', '150', 'DAC', 'bin', 'sqlpackage.exe'), // SQL Server 2019
      path.join(programFiles, 'Microsoft SQL Server', '140', 'DAC', 'bin', 'sqlpackage.exe'), // SQL Server 2017
      path.join(programFilesX86, 'Microsoft SQL Server', '160', 'DAC', 'bin', 'sqlpackage.exe'),
      path.join(programFilesX86, 'Microsoft SQL Server', '150', 'DAC', 'bin', 'sqlpackage.exe'),
      path.join(userProfile, '.dotnet', 'tools', 'sqlpackage.exe'),
    ];

    for (const p of standardWindowsPaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }

    // Check system PATH via 'where.exe'
    try {
      const whereOut = execSync('where.exe sqlpackage.exe 2>nul', { encoding: 'utf8' }).trim();
      const firstLine = whereOut.split('\n')[0]?.trim();
      if (firstLine && fs.existsSync(firstLine)) {
        return firstLine;
      }
    } catch (_) {}
  } else {
    // 3. Linux-Specific Discovery
    const homeDir = process.env.HOME || '/root';
    const standardLinuxPaths = [
      '/opt/sqlpackage/sqlpackage',
      '/usr/local/bin/sqlpackage',
      '/usr/bin/sqlpackage',
      path.join(homeDir, '.dotnet', 'tools', 'sqlpackage'),
    ];

    for (const p of standardLinuxPaths) {
      if (fs.existsSync(p)) {
        try { fs.chmodSync(p, '755'); } catch (_) {}
        return p;
      }
    }

    // Check system PATH via 'which'
    try {
      const whichOut = execSync('which sqlpackage 2>/dev/null', { encoding: 'utf8' }).trim();
      if (whichOut && fs.existsSync(whichOut)) {
        try { fs.chmodSync(whichOut, '755'); } catch (_) {}
        return whichOut;
      }
    } catch (_) {}
  }

  return localExe;
}

export function checkSqlpackageStatus(): SqlpackageStatus {
  const executablePath = getExecutablePath();
  const exists = fs.existsSync(executablePath);
  let version = '';

  if (exists) {
    try {
      version = execSync(`"${executablePath}" /version`, { encoding: 'utf8', timeout: 4000 }).trim();
    } catch (_) {}
  }

  let source: SqlpackageStatus['source'] = 'local_app';
  if (exists) {
    if (executablePath.includes('DAC\\bin')) source = 'ssms_dacfx';
    else if (executablePath.includes('.dotnet')) source = 'dotnet_tool';
    else if (executablePath.startsWith('/opt/')) source = 'opt';
    else if (!executablePath.includes(app.getPath('userData'))) source = 'system_path';
  }

  return {
    exists,
    executablePath,
    os: process.platform,
    source,
    version,
  };
}

/**
 * Downloads a file following HTTP 301/302 redirects up to 10 hops.
 */
function downloadFileWithRedirects(
  urlStr: string,
  destPath: string,
  onProgress: ProgressCallback,
  redirectCount = 0
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (redirectCount > 10) {
      return reject(new Error('Too many HTTP redirects when downloading sqlpackage.'));
    }

    try {
      const parsedUrl = new URL(urlStr);
      const client = parsedUrl.protocol === 'https:' ? https : http;

      const requestOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path: `${parsedUrl.pathname}${parsedUrl.search}`,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Electron/SQLPackageGUI',
        },
      };

      client
        .get(requestOptions, (response) => {
          // Handle 301/302/307/308 redirects
          if (
            response.statusCode &&
            response.statusCode >= 300 &&
            response.statusCode < 400 &&
            response.headers.location
          ) {
            let redirectUrl = response.headers.location.trim();
            redirectUrl = redirectUrl.replace(/^.*https:\/\//, 'https://');

            if (!redirectUrl.startsWith('http://') && !redirectUrl.startsWith('https://')) {
              redirectUrl = new URL(redirectUrl, urlStr).toString();
            }

            return resolve(
              downloadFileWithRedirects(redirectUrl, destPath, onProgress, redirectCount + 1)
            );
          }

          if (response.statusCode !== 200) {
            return reject(
              new Error(`Failed to download sqlpackage. HTTP status code: ${response.statusCode}`)
            );
          }

          const totalBytes = parseInt(response.headers['content-length'] || '0', 10);
          let downloadedBytes = 0;

          const fileStream = fs.createWriteStream(destPath);

          response.on('data', (chunk) => {
            downloadedBytes += chunk.length;
            if (totalBytes > 0) {
              const percent = Math.min(95, Math.round((downloadedBytes / totalBytes) * 100));
              onProgress({
                status: 'downloading',
                percent,
                message: `Downloading sqlpackage binaries (${(downloadedBytes / (1024 * 1024)).toFixed(1)} MB / ${(totalBytes / (1024 * 1024)).toFixed(1)} MB)`,
              });
            } else {
              onProgress({
                status: 'downloading',
                percent: 50,
                message: `Downloading sqlpackage binaries (${(downloadedBytes / (1024 * 1024)).toFixed(1)} MB downloaded)...`,
              });
            }
          });

          response.pipe(fileStream);

          fileStream.on('finish', () => {
            fileStream.close(() => resolve(destPath));
          });

          fileStream.on('error', (err) => {
            fs.unlink(destPath, () => {});
            reject(err);
          });
        })
        .on('error', (err) => {
          fs.unlink(destPath, () => {});
          reject(err);
        });
    } catch (err) {
      reject(err);
    }
  });
}

export async function downloadAndExtractSqlpackage(onProgress: ProgressCallback): Promise<string> {
  const binDir = getSqlpackageDir();
  const isWin = process.platform === 'win32';
  const targetExecutable = path.join(binDir, isWin ? 'sqlpackage.exe' : 'sqlpackage');

  if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
  }

  const downloadUrl = isWin
    ? 'https://aka.ms/sqlpackage-windows'
    : 'https://aka.ms/sqlpackage-linux';

  const archivePath = path.join(app.getPath('userData'), 'bin', isWin ? 'sqlpackage_windows.zip' : 'sqlpackage_linux.zip');

  onProgress({
    status: 'starting',
    percent: 0,
    message: `Connecting to Microsoft Official Repository (${isWin ? 'Windows' : 'Linux'})...`,
  });

  try {
    // 1. Download following all redirects
    await downloadFileWithRedirects(downloadUrl, archivePath, onProgress);

    // 2. Extract
    onProgress({
      status: 'extracting',
      percent: 95,
      message: `Configuring standalone sqlpackage engine for ${isWin ? 'Windows' : 'Linux'}...`,
    });

    let extracted = false;

    // Attempt ZIP extraction via AdmZip
    try {
      const zip = new AdmZip(archivePath);
      zip.extractAllTo(binDir, true);
      extracted = true;
    } catch (zipErr) {
      // Fallback to tar extraction if archive was .tar.gz
      try {
        await tar.x({
          file: archivePath,
          cwd: binDir,
        });
        extracted = true;
      } catch (tarErr) {
        throw new Error(
          `Failed to decompress archive: Zip error (${(zipErr as Error).message}), Tar error (${(tarErr as Error).message})`
        );
      }
    }

    if (!extracted) {
      throw new Error('Decompression failed.');
    }

    // Grant execution permissions on Linux for all binaries in binDir
    if (!isWin) {
      if (fs.existsSync(binDir)) {
        const files = fs.readdirSync(binDir);
        for (const file of files) {
          const filePath = path.join(binDir, file);
          try {
            const stat = fs.statSync(filePath);
            if (stat.isFile()) {
              fs.chmodSync(filePath, '755');
            }
          } catch (_) {}
        }
      }
    }

    // 3. Clean up archive file
    if (fs.existsSync(archivePath)) {
      fs.unlinkSync(archivePath);
    }

    onProgress({
      status: 'completed',
      percent: 100,
      message: `sqlpackage CLI engine configured successfully for ${isWin ? 'Windows' : 'Linux'}!`,
    });

    return targetExecutable;
  } catch (error) {
    if (fs.existsSync(archivePath)) {
      fs.unlinkSync(archivePath);
    }

    onProgress({
      status: 'error',
      percent: 0,
      message: `Failed to acquire sqlpackage: ${(error as Error).message}`,
    });
    throw error;
  }
}
