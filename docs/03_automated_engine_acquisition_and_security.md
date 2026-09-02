# Feature Guide 03: Automated Engine Acquisition & Security

## Overview
The application handles **Automated Engine Acquisition** (downloading official Microsoft binaries) while enforcing **Enterprise-Grade Process Security** (neutralizing shell injection risks and redacting passwords from logs).

---

## ⚠️ Problems & Challenges Solved

### 1. Manual `sqlpackage` Binary Installation Overhead
- **Problem**: Setting up `sqlpackage` manually requires navigating Microsoft documentation, identifying OS-specific download links, unzipping archives, configuring environment `PATH` variables, and granting Linux execution permissions (`chmod +x`).
- **Impact**: Onboarding friction and broken dependencies on developer machines.

### 2. Shell Injection Vulnerabilities & Password Special Character Failures
- **Problem**: Many GUI wrappers execute CLI tools via shell string concatenation (`child_process.exec("sqlpackage /sp:" + password)`).
- **Impact**:
  - Passwords containing special characters (`@`, `!`, `$`, `"`, `'`, `%`, `&`, `|`) trigger shell syntax errors or escape truncation.
  - Shell injection vectors allow malicious database names or passwords to execute arbitrary system commands.

### 3. Credential Leakage in Console Logs & Screenshots
- **Problem**: Command-line output or debug logs often output raw connection strings or execution parameters containing plain-text passwords.
- **Impact**: Credential exposure in log files, screenshots, or screen shares.

---

## 🛠️ How Our Software Solves Them

### 1. OS-Aware Automated Engine Downloader (`electron/downloader.ts`)
- On application launch, checks for the presence of local `sqlpackage` binaries.
- If missing, auto-detects host OS (`win32` vs `linux`) and fetches official Microsoft standalone archives (`aka.ms/sqlpackage-linux` or `aka.ms/sqlpackage-windows`).
- Extracts binaries locally into app storage and sets executable permissions (`0755`) automatically.

### 2. Non-Shell Child Process Execution (`electron/runner.ts`)
- Spawns subprocesses using Node's `child_process.spawn(executablePath, argsArray, { shell: false })`.
- Passwords and parameters are passed as isolated string array elements directly to the binary's process argument vector.
- Completely neutralizes shell injection attacks and special character escaping bugs.

### 3. In-Memory Real-Time Password Redaction
- Intercepts `stdout` and `stderr` streams line-by-line in memory before sending data to the React UI.
- Applies regex substitution patterns to replace password flags (e.g. `/SourcePassword:MyP@ssword!`) with `/SourcePassword:********`.

---

## 🔬 Security Architecture

```
[ Form Input: MyP@ss! ] ──> [ Argument Array: ["/sp:MyP@ss!"] ]
                                         │
                                         ▼
                     [ spawn(sqlpackage, args, { shell: false }) ]
                                         │
                        ┌────────────────┴────────────────┐
                        ▼                                 ▼
               Subprocess Executed               stdout Stream Parsed
             (No Shell Intermediary)            (Regex Redacts Passwords)
                                                          │
                                                          ▼
                                              [ Dark Console Log UI ]
                                              ("/sp:********")
```
