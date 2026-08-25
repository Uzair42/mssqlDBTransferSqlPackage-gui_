import { app } from 'electron';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
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
}

export function getSqlpackageDir(): string {
  return path.join(app.getPath('userData'), 'bin', 'sqlpackage');
}

export function getExecutablePath(): string {
  const binDir = getSqlpackageDir();
  const isWin = process.platform === 'win32';
  return path.join(binDir, isWin ? 'sqlpackage.exe' : 'sqlpackage');
}

export function checkSqlpackageStatus(): SqlpackageStatus {
  const executablePath = getExecutablePath();
  const exists = fs.existsSync(executablePath);
  return {
    exists,
    executablePath,
    os: process.platform,
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
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) Electron/SQLPackageGUI',
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
            // Sanitize location header if ansi escape sequences are present
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
  const executablePath = getExecutablePath();

  if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
  }

  const isWin = process.platform === 'win32';
  const downloadUrl = isWin
    ? 'https://aka.ms/sqlpackage-windows'
    : 'https://aka.ms/sqlpackage-linux';

  const archivePath = path.join(app.getPath('userData'), 'bin', 'sqlpackage_download_archive');

  onProgress({
    status: 'starting',
    percent: 0,
    message: `Initializing download from ${downloadUrl}...`,
  });

  try {
    // 1. Download following all redirects
    await downloadFileWithRedirects(downloadUrl, archivePath, onProgress);

    // 2. Extract (Try AdmZip first as Microsoft packages Linux as ZIP now, fallback to Tar if needed)
    onProgress({
      status: 'extracting',
      percent: 95,
      message: 'Decompressing and configuring binary package...',
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
    if (process.platform !== 'win32') {
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
      message: 'sqlpackage standalone engine ready for export operations.',
    });

    return executablePath;
  } catch (error) {
    // Clean up temporary download file on error
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
