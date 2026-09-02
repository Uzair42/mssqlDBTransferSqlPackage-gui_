# MSSQL Database Migrator & ERD Visualizer (by mu42)

A modern, high-performance, cross-platform desktop application (Linux & Windows) providing an intuitive Graphical User Interface (GUI) over Microsoft's `sqlpackage` engine and native T-SQL backup/restore utilities. 

Designed to simplify database migrations, version downgrades (e.g., migrating modern MSSQL Linux databases to legacy SQL Server 2014 instances), live schema visualization, and high-resolution ERD diagram exporting.

> 📖 **Feature Documentation**: Explore detailed architecture guides, problems solved, and technical solutions in the [**Feature Documentation Index (`docs/README.md`)**](./docs/README.md).

---

## 🚀 Key Features

### 📊 Interactive ERD Diagram & Schema Visualizer
- **Pan & Zoom Canvas**: Smooth 30% to 250% zoom control via mouse scroll wheel or toolbar controls, coupled with click-and-drag backdrop canvas panning.
- **Draggable Table Cards**: Reposition any table node dynamically across the canvas with real-time SVG curve recalculation.
- **Auto-Layout Grid Engine**: One-click **Auto Layout** button that calculates a clean, non-overlapping grid layout for all database tables.
- **Dynamic Bezier Relationship Lines**: Directional SVG Bezier curves connect Foreign Key columns directly to Primary Key target columns with glow highlights on selection.
- **Full Screen Preview**: Maximize the ERD workspace into a dedicated full-window viewport for inspecting massive database schemas.

### 📸 High-Resolution Photo Capture & Multi-Format Exporters
- **📷 High-Res PNG Photo Capture**: Renders a crisp 2x DPI screenshot of the full ERD diagram (table cards, PK/FK badges, column types, and relation curves) saved directly as `[Database]_ERD_HighRes.png`.
- **🎨 Scalable Vector SVG Export**: Generates standalone, perfectly scalable `.svg` files ideal for graphic vector editors and direct embedding into documentation.
- **📝 Markdown Documentation Generator (`.md`)**: Automatically produces comprehensive database schema documentation containing:
  - **Mermaid ERD Syntax** (`erDiagram` block) ready to paste into GitHub / GitLab READMEs.
  - **Column Definition Tables**: Detailed breakdown of column ordinal positions, data types, nullability, primary keys, and foreign key relationships.
- **📋 Copy Mermaid Syntax**: One-click clipboard copy for pasting Mermaid ERD syntax directly into markdown documentation.
- **🖨️ PDF & Print Support**: Formatted print preview for saving crisp PDF database documentation.

### 💾 Dual Migration Engines (`.bacpac` & `.bak`)
- **`sqlpackage` Engine (`.bacpac`)**: Perfect for cloud migrations, cross-platform transfers, and schema/data exports.
- **Native T-SQL Engine (`.bak`)**: Direct T-SQL `BACKUP DATABASE` and `RESTORE DATABASE WITH MOVE` execution for maximum speed and raw database backups.
- **Logical File Relocation (`WITH MOVE`)**: Automatically reads logical file headers (`RESTORE FILELISTONLY`) to customize data (`.mdf`) and log (`.ldf`) physical destination paths.

### 📡 Peer-to-Peer Wireless File Transfer
- Share `.bacpac` and `.bak` backup files wirelessly between devices on the same Wi-Fi network via an integrated local HTTP server with single-use pin security.

### 🔐 Immediate Connection Validation & Security
- **Inline Connection Testing**: **"Test Connection & Fetch Databases"** button placed directly inside the server credentials section for instant validation.
- **Automated Engine Acquisition**: Auto-detects OS (`win32` vs `linux`) and downloads official `sqlpackage` binaries directly from Microsoft.
- **Zero Shell Injection**: Spawns processes via safe argument arrays (`shell: false`). Special characters in passwords are handled safely without shell parsing errors.
- **In-Memory Password Redaction**: Intercepts `stdout` and `stderr` streams to mask sensitive passwords (`/SourcePassword:********`) before displaying logs.

---

## 🏗️ Architecture Layout

```
sqlpackage-gui/
├── package.json
├── vite.config.ts              # Vite configuration for Electron main & React renderer
├── tailwind.config.js          # Tailwind CSS styling & custom color palette
├── electron/
│   ├── main.ts                 # Main process & IPC dispatchers
│   ├── preload.ts              # ContextBridge safe API layer
│   ├── downloader.ts           # Automatic sqlpackage engine binary downloader
│   └── runner.ts               # Non-shell process spawner, relationship query engine & log redaction
└── src/                        # React Renderer UI
    ├── types.ts                # TypeScript interface definitions
    ├── App.tsx                 # Core state manager & modal controller
    └── components/
        ├── ConnectionForm.tsx  # Server credentials, auth mode, inline test connection & database picker
        ├── SchemaViewerModal.tsx# ERD Diagram canvas, zoom/pan controls, high-res exports & schema table
        ├── LogConsole.tsx      # Real-time streaming dark log terminal
        ├── WifiShareModal.tsx  # P2P wireless backup file transfer
        └── icons/
            └── FeatureIcons.tsx# Custom SVG icons for ERD, export tools, and schema controls
```

---

## 🐧 Linux Host Dependencies

Microsoft's `sqlpackage` utility relies on .NET Core runtime dependencies. On Linux hosts, install the required packages:

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

## 🛠️ Development & Building

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### 1. Installation
```bash
git clone https://github.com/Uzair42/mssqlDBTransferSqlPackage-gui_.git
cd sqlpackage-gui
npm install
```

### 2. Development Mode
```bash
npm run dev
```

### 3. Building Executables

#### Build Linux AppImage / deb:
```bash
npm run build
```

#### Build Windows Portable Executable (`.exe`):
```bash
npm run build -- --win
```

---

## 👤 Author & Credits

Developed with ❤️ by **mu42** (Uzair) for database administrators, software engineers, and system architects needing seamless MSSQL migrations and visual schema exploration.
