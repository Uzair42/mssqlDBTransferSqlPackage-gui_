# Feature Guide 02: Dual Migration Engine (.bacpac & .bak)

## Overview
The application incorporates a **Dual Migration Engine** offering both Microsoft `sqlpackage` (`.bacpac`) exports/imports and native T-SQL (`.bak`) database backups/restores. This dual-engine design guarantees both cross-version schema compatibility and high-speed native transfers.

---

## ⚠️ Problems & Challenges Solved

### 1. Version Incompatibility Errors During Database Downgrades
- **Problem**: Restoring a native `.bak` backup taken on a newer SQL Server instance (e.g. SQL Server 2022) to an older instance (e.g. SQL Server 2014) is blocked by Microsoft SQL Server (`Msg 3169: Database cannot be restored because it was created by version...`).
- **Impact**: Database administrators are unable to migrate production databases to older client/server infrastructure using standard `.bak` files.

### 2. Physical File Path Mismatch Errors During `RESTORE DATABASE`
- **Problem**: Native `.bak` restores fail when target servers have different file directory structures (e.g. source paths `C:\Program Files\Microsoft SQL Server\...` vs target Linux paths `/var/opt/mssql/data/...`).
- **Impact**: Restore commands fail with operating system file creation errors (`Msg 5120` or `Msg 5133`).

### 3. Command-Line `sqlpackage` Syntax Complexity
- **Problem**: Using `sqlpackage` via terminal requires typing lengthy command strings with numerous flags (`/Action:Export`, `/ssn:localhost`, `/sdn:MyDB`, `/tf:export.bacpac`, `/UniversalAuth:False`, `/p:VerifyFullTextDocumentTypes=False`).
- **Impact**: High syntax error rates, lost time looking up command flags.

---

## 🛠️ How Our Software Solves Them

### 1. Schema & Data Decoupling via `.bacpac` (sqlpackage Engine)
- The `.bacpac` export extracts database DDL schema scripts and table data in compressed XML/JSON formats.
- When imported into an older SQL Server version via `sqlpackage`, it recreates the schema natively compatible with the target server, completely bypassing native engine version locks.

### 2. Automated Logical File Relocation (`RESTORE WITH MOVE`)
- When a user selects a `.bak` file for native T-SQL restore, the application automatically executes `RESTORE FILELISTONLY` in the background.
- It parses the logical data (`.mdf`) and log (`.ldf`) names and presents an editable **Logical File Layout (WITH MOVE)** UI grid.
- Automatically constructs `RESTORE DATABASE [...] FROM DISK = '...' WITH MOVE 'LogicalData' TO '/target/path/data.mdf', MOVE 'LogicalLog' TO '/target/path/log.ldf'`.

### 3. Graphical Parameter Builder & Real-Time Console
- Translates GUI form selections into structured command-line argument arrays.
- Streams live progress logs line-by-line in a dark terminal console with auto-scroll and log searching.

---

## 🔬 Technical Mechanics

```
                 [ User Selection ]
                        │
         ┌──────────────┴──────────────┐
         ▼                             ▼
   .bacpac Mode                   .bak Mode
 (sqlpackage Engine)           (Native T-SQL Engine)
         │                             │
 ┌───────┴───────┐             ┌───────┴───────┐
 ▼               ▼             ▼               ▼
Export        Import        BACKUP          RESTORE
.bacpac       .bacpac       DATABASE        DATABASE
(Schema+Data) (Cross-Ver)   (.bak File)     (WITH MOVE)
```
