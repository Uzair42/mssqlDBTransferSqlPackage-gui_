# Feature Guide 04: Peer-to-Peer Wireless Backup Transfer

## Overview
The **Peer-to-Peer (P2P) Wireless Backup Transfer** feature enables fast, local network file sharing for `.bacpac` and `.bak` database backup files between computers on the same Wi-Fi or LAN network without uploading data to third-party cloud servers.

---

## ⚠️ Problems & Challenges Solved

### 1. Slow Physical USB Drives & Cloud Upload Limits
- **Problem**: Sharing multi-gigabyte database backup files between local developer workstations requires copying files to USB drives or waiting for slow cloud uploads (Google Drive/Dropbox).
- **Impact**: Lost developer time, security risks uploading confidential database backups to third-party cloud storage.

### 2. Browser "Insecure Download" Blocks Over Local HTTP
- **Problem**: Modern web browsers (Chrome, Edge, Firefox) block direct HTTP downloads on local networks (`http://192.168.x.x:PORT/file`) with strict security warnings ("Insecure download blocked").
- **Impact**: Recipients cannot download backup files, causing confusion and failed file transfers.

---

## 🛠️ How Our Software Solves Them

### 1. Integrated Micro HTTP Streaming Server
- Spins up a lightweight Node.js HTTP file streaming server on a random local port.
- Displays local network IP addresses (`192.168.x.x`) along with a QR code and a 4-digit single-use PIN security code.
- Streams files directly from disk to the network socket in chunks, ensuring low memory usage even for 50GB+ backup files.

### 2. Defensive HTTP Security Headers
- Serves HTTP responses with security headers:
  - `X-Content-Type-Options: nosniff`
  - `Cache-Control: no-store, no-cache`
  - `Content-Disposition: attachment; filename="..."`

### 3. Clear In-App Download Bypass Guidance
- Displays visual step-by-step instructions in the UI explaining how recipients can bypass browser HTTP blocks on trusted local networks:
  - Right-click the blocked download ➜ Select **Keep** ➜ Click **Keep Anyway**.

---

## 🔬 P2P Transfer Workflow

```
[ Host Machine ]                                [ Recipient Machine ]
   (Sender)                                         (Receiver)
      │                                                 │
  1. Click "Share Backup via Wi-Fi"                     │
  2. Select .bacpac / .bak file                         │
  3. App starts local HTTP Server (Port 8765)           │
      │                                                 │
      ├─── Shares URL: http://192.168.1.15:8765 ───────>  │
      │                                 4. Enters URL in Browser
      │                                 5. Enters 4-Digit PIN
      │<── Stream File Chunks (HTTP Attachment) ────────┤
```
