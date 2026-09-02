import http from 'http';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { exec } from 'child_process';
import { BrowserWindow } from 'electron';

export interface NetworkIPInfo {
  name: string;
  ip: string;
}

export interface WiFiServerInfo {
  active: boolean;
  filePath: string;
  fileName: string;
  fileSizeBytes: number;
  fileSizeFormatted: string;
  ips: NetworkIPInfo[];
  port: number;
  pin: string;
  url: string;
  transferredBytes: number;
  transferSpeedMBs: number;
  clientIp?: string;
  status: 'idle' | 'listening' | 'transferring' | 'completed' | 'error';
  errorMessage?: string;
}

let currentServer: http.Server | null = null;
let activeServerInfo: WiFiServerInfo | null = null;
let speedCheckTimer: NodeJS.Timeout | null = null;

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get active non-internal IPv4 network interfaces (Wi-Fi, Ethernet)
 */
export function getNetworkInterfaces(): NetworkIPInfo[] {
  const interfaces = os.networkInterfaces();
  const result: NetworkIPInfo[] = [];

  for (const name of Object.keys(interfaces)) {
    const netList = interfaces[name];
    if (netList) {
      for (const net of netList) {
        if (net.family === 'IPv4' && !net.internal) {
          result.push({
            name: name,
            ip: net.address,
          });
        }
      }
    }
  }

  if (result.length === 0) {
    result.push({ name: 'Localhost', ip: '127.0.0.1' });
  }

  return result;
}

/**
 * Start high-speed HTTP file server over Wi-Fi / Local Network
 */
export async function startWiFiServer(
  filePath: string,
  customPort: number = 8080,
  mainWindow?: BrowserWindow
): Promise<{ success: boolean; info?: WiFiServerInfo; message?: string }> {
  if (currentServer) {
    await stopWiFiServer();
  }

  if (!fs.existsSync(filePath)) {
    return { success: false, message: `Backup file does not exist at path: ${filePath}` };
  }

  const fileStats = fs.statSync(filePath);
  const fileName = path.basename(filePath);
  const ips = getNetworkInterfaces();
  const pin = Math.floor(1000 + Math.random() * 9000).toString(); // Random 4-digit PIN
  const primaryIp = ips[0]?.ip || '127.0.0.1';
  const targetPort = customPort;
  const serverUrl = `http://${primaryIp}:${targetPort}`;

  activeServerInfo = {
    active: true,
    filePath,
    fileName,
    fileSizeBytes: fileStats.size,
    fileSizeFormatted: formatBytes(fileStats.size),
    ips,
    port: targetPort,
    pin,
    url: serverUrl,
    transferredBytes: 0,
    transferSpeedMBs: 0,
    status: 'listening',
  };

  return new Promise((resolve) => {
    currentServer = http.createServer((req, res) => {
      const reqUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
      const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'Unknown';

      // ─── 1. API: Stream File Download ───────────────────────────
      if (reqUrl.pathname === '/download') {
        const providedPin = reqUrl.searchParams.get('pin');

        if (providedPin !== pin) {
          res.writeHead(403, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <body style="background:#05120a; color:#f87171; font-family:sans-serif; text-align:center; padding-top:50px;">
                <h2>🚫 Invalid Security PIN</h2>
                <p style="color:#a7f3d0">Please check the 4-digit PIN on the sender computer screen.</p>
              </body>
            </html>
          `);
          return;
        }

        res.writeHead(200, {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
          'Content-Length': fileStats.size,
          'X-Content-Type-Options': 'nosniff',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        });

        const fileStream = fs.createReadStream(filePath);
        let transferred = 0;
        let lastTransferred = 0;
        let lastTime = Date.now();

        if (activeServerInfo) {
          activeServerInfo.status = 'transferring';
          activeServerInfo.clientIp = clientIp;
          sendUpdate(mainWindow);
        }

        speedCheckTimer = setInterval(() => {
          const now = Date.now();
          const timeDiffSec = (now - lastTime) / 1000;
          const bytesDiff = transferred - lastTransferred;
          if (timeDiffSec > 0 && activeServerInfo) {
            activeServerInfo.transferSpeedMBs = parseFloat((bytesDiff / (1024 * 1024) / timeDiffSec).toFixed(2));
            activeServerInfo.transferredBytes = transferred;
            sendUpdate(mainWindow);
          }
          lastTransferred = transferred;
          lastTime = now;
        }, 800);

        fileStream.on('data', (chunk) => {
          transferred += chunk.length;
        });

        fileStream.on('end', () => {
          if (speedCheckTimer) clearInterval(speedCheckTimer);
          if (activeServerInfo) {
            activeServerInfo.transferredBytes = fileStats.size;
            activeServerInfo.transferSpeedMBs = 0;
            activeServerInfo.status = 'completed';
            sendUpdate(mainWindow);
          }
        });

        fileStream.on('error', (err) => {
          if (speedCheckTimer) clearInterval(speedCheckTimer);
          if (activeServerInfo) {
            activeServerInfo.status = 'error';
            activeServerInfo.errorMessage = err.message;
            sendUpdate(mainWindow);
          }
          res.end();
        });

        fileStream.pipe(res);
        return;
      }

      // ─── 2. Web UI Page for Receiver Devices ───────────────────
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>MSSQL Database Backup Transfer</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              background: #05120a;
              color: #e6f4ea;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              padding: 20px;
            }
            .card {
              background: #0b2214;
              border: 1px solid #10b98144;
              border-radius: 16px;
              padding: 28px;
              max-width: 440px;
              width: 100%;
              box-shadow: 0 20px 40px rgba(0,0,0,0.6);
            }
            .badge {
              display: inline-block;
              background: rgba(16, 185, 129, 0.15);
              color: #34d399;
              border: 1px solid rgba(16, 185, 129, 0.3);
              font-size: 11px;
              font-weight: 700;
              text-transform: uppercase;
              padding: 4px 10px;
              border-radius: 20px;
              margin-bottom: 12px;
            }
            h1 { font-size: 20px; font-weight: 700; color: #fff; margin-bottom: 6px; }
            p { font-size: 13px; color: #9fe7c7; margin-bottom: 20px; line-height: 1.4; }
            .file-box {
              background: #05120a;
              border: 1px solid #10b98133;
              padding: 14px;
              border-radius: 12px;
              margin-bottom: 20px;
              word-break: break-all;
            }
            .file-name { font-weight: 600; color: #34d399; font-size: 14px; margin-bottom: 4px; }
            .file-size { font-size: 12px; color: #6ee7b7; font-family: monospace; }
            label { display: block; font-size: 12px; font-weight: 600; color: #a7f3d0; margin-bottom: 6px; }
            input[type="text"] {
              width: 100%;
              background: #05120a;
              border: 1px solid #10b98166;
              color: #fff;
              font-size: 18px;
              letter-spacing: 4px;
              text-align: center;
              font-weight: 700;
              padding: 10px;
              border-radius: 10px;
              outline: none;
              margin-bottom: 16px;
            }
            input[type="text"]:focus { border-color: #34d399; box-shadow: 0 0 10px rgba(52,211,153,0.3); }
            button {
              width: 100%;
              background: #059669;
              color: #fff;
              font-size: 14px;
              font-weight: 700;
              padding: 12px;
              border: none;
              border-radius: 10px;
              cursor: pointer;
              transition: background 0.2s;
            }
            button:hover { background: #10b981; }
          </style>
        </head>
        <body>
          <div class="card">
            <span class="badge">Wi-Fi Direct File Transfer</span>
            <h1>MSSQL Backup Ready</h1>
            <p>Enter the 4-digit security PIN shown on the sender app screen to start high-speed download.</p>
            
            <div class="file-box">
              <div class="file-name">📦 ${fileName}</div>
              <div class="file-size">Size: ${formatBytes(fileStats.size)}</div>
            </div>

            <form action="/download" method="GET">
              <label for="pin">SECURITY PIN</label>
              <input type="text" id="pin" name="pin" maxlength="4" placeholder="1234" required autofocus />
              <button type="submit">⚡ Download Backup File</button>
            </form>

            <div style="margin-top:20px; padding:12px; background:rgba(234,179,8,0.1); border:1px solid rgba(234,179,8,0.3); border-radius:10px; font-size:11px; color:#fde047; text-align:left; line-height:1.4;">
              <strong>💡 Note on Browser Security:</strong> Modern web browsers (Chrome/Edge) may display an <em>"Insecure download"</em> or <em>"File downloaded over HTTP"</em> banner because local Wi-Fi direct transfers run over HTTP without SSL certificates. If prompted, simply click <strong>"Keep"</strong> or <strong>"Allow Unverified File"</strong>.
            </div>
          </div>
        </body>
        </html>
      `);
    });

    currentServer.listen(targetPort, () => {
      sendUpdate(mainWindow);
      resolve({ success: true, info: activeServerInfo! });
    });

    currentServer.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE' && customPort < 8100) {
        // Retry with next port
        startWiFiServer(filePath, customPort + 1, mainWindow).then(resolve);
      } else {
        if (activeServerInfo) {
          activeServerInfo.status = 'error';
          activeServerInfo.errorMessage = err.message;
        }
        resolve({ success: false, message: `Server error: ${err.message}` });
      }
    });
  });
}

/**
 * Stop active Wi-Fi server
 */
export async function stopWiFiServer(mainWindow?: BrowserWindow): Promise<boolean> {
  if (speedCheckTimer) clearInterval(speedCheckTimer);
  if (currentServer) {
    currentServer.close();
    currentServer = null;
  }
  if (activeServerInfo) {
    activeServerInfo.active = false;
    activeServerInfo.status = 'idle';
    sendUpdate(mainWindow);
    activeServerInfo = null;
  }
  return true;
}

/**
 * Get active Wi-Fi server status
 */
export function getWiFiServerStatus(): WiFiServerInfo | null {
  return activeServerInfo;
}

/**
 * Helper to emit updates to renderer process
 */
function sendUpdate(mainWindow?: BrowserWindow) {
  if (mainWindow && !mainWindow.isDestroyed() && activeServerInfo) {
    mainWindow.webContents.send('transfer:status-update', activeServerInfo);
  }
}

/**
 * Trigger native OS Bluetooth File Transfer wizard
 */
export function triggerBluetoothSend(filePath: string): Promise<{ success: boolean; message: string }> {
  return new Promise((resolve) => {
    if (!fs.existsSync(filePath)) {
      resolve({ success: false, message: `Backup file not found at: ${filePath}` });
      return;
    }

    const platform = os.platform();

    if (platform === 'win32') {
      // Windows Built-in Bluetooth File Transfer Wizard (fsquirt.exe)
      exec('fsquirt.exe', (err) => {
        if (err) {
          exec('start fsquirt.exe', (err2) => {
            if (err2) {
              resolve({ success: false, message: `Could not launch Windows Bluetooth Wizard (fsquirt.exe): ${err2.message}` });
            } else {
              resolve({ success: true, message: 'Windows Bluetooth Transfer Wizard launched.' });
            }
          });
        } else {
          resolve({ success: true, message: 'Windows Bluetooth Transfer Wizard launched.' });
        }
      });
    } else if (platform === 'linux') {
      // Linux bluetooth file transfer utilities
      const escapedPath = `"${filePath.replace(/"/g, '\\"')}"`;
      exec(`bluetooth-sendto ${escapedPath}`, (err) => {
        if (err) {
          exec(`blueman-send-files ${escapedPath}`, (err2) => {
            if (err2) {
              exec('gnome-control-center bluetooth', (err3) => {
                if (err3) {
                  resolve({
                    success: false,
                    message: `Bluetooth utility not found. Ensure bluetooth-sendto or blueman is installed. Path: ${filePath}`,
                  });
                } else {
                  resolve({ success: true, message: 'Opened Bluetooth Settings panel.' });
                }
              });
            } else {
              resolve({ success: true, message: 'Launched Blueman File Transfer.' });
            }
          });
        } else {
          resolve({ success: true, message: 'Launched GNOME Bluetooth Send utility.' });
        }
      });
    } else if (platform === 'darwin') {
      // macOS Bluetooth File Exchange
      exec(`open -a "Bluetooth File Exchange" "${filePath}"`, (err) => {
        if (err) {
          resolve({ success: false, message: `Could not launch macOS Bluetooth File Exchange: ${err.message}` });
        } else {
          resolve({ success: true, message: 'Launched macOS Bluetooth File Exchange.' });
        }
      });
    } else {
      resolve({ success: false, message: `Unsupported platform for automated Bluetooth transfer: ${platform}` });
    }
  });
}
