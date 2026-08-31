# Graph Report - sqlpackage-gui  (2026-08-27)

## Corpus Check
- Corpus is ~10,615 words - fits in a single context window. You may not need a graph.

## Summary
- 156 nodes · 225 edges · 11 communities
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.95)
- Token cost: 1,200 input · 800 output

## Community Hubs (Navigation)
- Build Tooling & DevDependencies
- Electron Backend & Execution Engine
- React UI Components & State
- TypeScript Compiler Configuration
- MSSQL Backup & Restore Engine
- Runtime Package Dependencies
- Package Manifest & Scripts

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 18 edges
2. `getExecutablePath()` - 7 edges
3. `downloadAndExtractSqlpackage()` - 6 edges
4. `exportDatabase()` - 6 edges
5. `electron` - 6 edges
6. `testConnection()` - 5 edges
7. `buildTediousConfig()` - 5 edges
8. `restoreDatabase()` - 5 edges
9. `ConnectionFormProps` - 5 edges
10. `redactLog()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `Automated Engine Acquisition` --conceptually_related_to--> `downloadAndExtractSqlpackage()`  [INFERRED]
  README.md → electron/downloader.ts
- `Secure Non-Shell Child Process Execution` --conceptually_related_to--> `exportDatabase()`  [INFERRED]
  README.md → electron/runner.ts
- `In-Memory Credential Redaction` --conceptually_related_to--> `redactLog()`  [INFERRED]
  README.md → electron/runner.ts
- `Process Tree Cancellation` --conceptually_related_to--> `cancelExport()`  [INFERRED]
  README.md → electron/runner.ts
- `exportDatabase()` --calls--> `getExecutablePath()`  [EXTRACTED]
  electron/runner.ts → electron/downloader.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Export Security & Execution Pipeline** — readme_secure_process_execution, readme_credential_redaction, electron_runner_exportdatabase, electron_runner_redactlog [INFERRED 0.85]

## Communities (11 total, 0 thin omitted)

### Community 0 - "Build Tooling & DevDependencies"
Cohesion: 0.06
Nodes (33): autoprefixer, electron, electron-builder, devDependencies, autoprefixer, electron, electron-builder, postcss (+25 more)

### Community 1 - "Electron Backend & Execution Engine"
Cohesion: 0.13
Nodes (22): checkSqlpackageStatus(), downloadAndExtractSqlpackage(), downloadFileWithRedirects(), getExecutablePath(), getSqlpackageDir(), ProgressCallback, SqlpackageStatus, buildSqlpackageArgs() (+14 more)

### Community 2 - "React UI Components & State"
Cohesion: 0.15
Nodes (20): #root Mount Point, App(), ConnectionForm(), ConnectionFormProps, DependencyModal(), DependencyModalProps, Header(), HeaderProps (+12 more)

### Community 3 - "TypeScript Compiler Configuration"
Cohesion: 0.08
Nodes (23): DOM, DOM.Iterable, ES2022, src, compilerOptions, allowImportingTsExtensions, baseUrl, isolatedModules (+15 more)

### Community 4 - "MSSQL Backup & Restore Engine"
Cohesion: 0.27
Nodes (13): BackupBakConfig, backupDatabase(), BakFileInfo, buildTediousConfig(), ensureBakAccessible(), getDefaultBackupDir(), getDefaultDataDir(), getFileListOnly() (+5 more)

### Community 5 - "Runtime Package Dependencies"
Cohesion: 0.15
Nodes (13): adm-zip, lucide-react, dependencies, adm-zip, lucide-react, react, react-dom, tar (+5 more)

### Community 6 - "Package Manifest & Scripts"
Cohesion: 0.22
Nodes (8): description, main, name, scripts, build, dev, preview, version

## Knowledge Gaps
- **58 isolated node(s):** `ProgressCallback`, `SqlpackageStatus`, `BakFileInfo`, `name`, `version` (+53 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `Build Tooling & DevDependencies` to `Package Manifest & Scripts`?**
  _High betweenness centrality (0.099) - this node is a cross-community bridge._
- **Why does `electron` connect `Electron Backend & Execution Engine` to `TypeScript Compiler Configuration`, `MSSQL Backup & Restore Engine`?**
  _High betweenness centrality (0.090) - this node is a cross-community bridge._
- **What connects `ProgressCallback`, `SqlpackageStatus`, `BakFileInfo` to the rest of the system?**
  _58 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Build Tooling & DevDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._
- **Should `Electron Backend & Execution Engine` be split into smaller, more focused modules?**
  _Cohesion score 0.13054187192118227 - nodes in this community are weakly interconnected._
- **Should `React UI Components & State` be split into smaller, more focused modules?**
  _Cohesion score 0.14532019704433496 - nodes in this community are weakly interconnected._
- **Should `TypeScript Compiler Configuration` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._