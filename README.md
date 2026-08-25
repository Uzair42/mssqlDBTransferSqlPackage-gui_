# MSSQL BACPAC Exporter (sqlpackage GUI)

A modern, cross-platform desktop application (Linux & Windows) providing an intuitive Graphical User Interface (GUI) over Microsoft's `sqlpackage` command-line engine. Designed to simplify database backups and version downgrades (e.g., migrating MSSQL 2022 Linux databases to MSSQL 2014 Windows instances) via `.bacpac` files.

---

## Key Features

- **Automated Engine Acquisition**: On startup, auto-detects the host operating system (`win32` vs `linux`) and downloads the official standalone `sqlpackage` binaries directly from Microsoft (`aka.ms/sqlpackage-linux` or `aka.ms/sqlpackage-windows`), extracting and configuring execution permissions automatically.
- **Secure Non-Shell Child Process Execution**: Spawns `sqlpackage` via argument arrays (`shell: false`). Passwords containing special characters (`@`, `!`, `$`, `"`, `'`, `%`, `&`, `|`) are passed directly without shell expansion bugs or syntax errors.
- **Password Redaction & Masking**: Intercepts real-time `stdout` and `stderr` streams in memory and redacts password occurrences (`/SourcePassword:********`) before broadcasting logs to the UI console.
- **Real-Time Stream Terminal**: Dark-themed console UI displaying `sqlpackage` progress line-by-line, featuring auto-scroll, log search filtering, clear log, and one-click copy.
- **Process Tree Cancellation**: Allows instant termination (`SIGTERM`/`SIGKILL`) if an export process hangs or needs to be aborted.
- **Trust Server Certificate Switch**: Toggle `/TrustServerCertificate:True` for local MSSQL development instances and Linux Docker containers.

---

## Architecture Layout

```
sqlpackage-gui/
├── package.json
├── vite.config.ts              # Bundles Electron main, preload, & Vite React renderer
├── tailwind.config.js          # Tailwind styling configuration & custom color palette
├── postcss.config.js
├── tsconfig.json
├── electron/
│   ├── main.ts                 # Main Electron process, window lifecycle, & IPC dispatchers
│   ├── preload.ts              # ContextBridge security layer exposing safe API functions
│   ├── downloader.ts           # OS detection, https redirect stream downloader, archive extractor
│   └── runner.ts               # Non-shell process spawn, credential redaction, log stream parsing
└── src/                        # React Renderer (UI Layer)
    ├── index.html
    ├── main.tsx
    ├── index.css               # Tailwind CSS directives & dark console scrollbars
    ├── types.ts                # TypeScript interface definitions
    ├── App.tsx                 # Central state manager & IPC event router
    └── components/
        ├── Header.tsx          # Header with system OS badge & engine readiness indicator
        ├── DependencyModal.tsx # Binary engine acquisition progress overlay
        ├── ConnectionForm.tsx  # Server, Auth, Database & Target File Selector Form
        ├── LogConsole.tsx      # Real-time streaming log terminal with filter & controls
        └── StatusBanner.tsx    # Success & error status alerts
```

---

## Linux Host Dependencies (Crucial)

Microsoft's `sqlpackage` standalone utility relies on the .NET Core runtime. On Linux host distributions, ensure the following native packages are installed before running `sqlpackage`:

### Ubuntu / Debian:
```bash
sudo apt-get update
sudo apt-get install -y libunwind8 libicu-dev ca-certificates libssl-dev
```

### Fedora / RHEL / CentOS:
```bash
sudo dnf install -y libunwind libicu ca-certificates openssl-libs
```

### Arch Linux:
```bash
sudo pacman -S libunwind icu ca-certificates openssl
```

---

## Development & Building Instructions

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### 1. Installation
Clone the repository and install all Node.js dependencies:
```bash
cd sqlpackage-gui
npm install
```

### 2. Development Mode
Launch the application in live-reloading development mode:
```bash
npm run dev
```

### 3. Building for Production

#### Build Linux Executable (`AppImage` / `deb`):
```bash
npm run build
```
The output binaries will be generated inside the `dist/` directory.

#### Build Windows Executable (`.exe` / Portable):
Run on a Windows host or via Electron Builder cross-compilation:
```bash
npm run build -- --win
```

---

## Security Safeguards

1. **Zero Shell Injection Risk**: The backend uses `child_process.spawn(executablePath, argsArray, { shell: false })`. Standard shell injection vectors (e.g. `; rm -rf`, `& dir`, etc.) are completely neutralized.
2. **In-Memory Credential Redaction**: All console stdout/stderr buffers are parsed line-by-line using standard string substitution regexes to ensure plain-text passwords never reach disk logs or frontend state.
3. **Escaping Path Spaces**: Paths containing spaces (e.g., `C:\Users\John Doe\My Documents\export.bacpac`) are safely parsed by Node's native array parameter passing.
