# MSSQL Database Migrator Feature Documentation Index

Welcome to the technical feature documentation for **MSSQL Database Migrator & ERD Visualizer (by mu42)**. This directory contains detailed architectural breakdown guides for each core capability offered by the application, focusing on the real-world problems solved and technical implementation details.

---

## 📚 Feature Documentation Guides

| # | Feature Guide | Primary Problem Solved | Key Technical Solution |
| :-: | :--- | :--- | :--- |
| 1 | [**01. Interactive ERD Diagram & Visualizer**](./01_interactive_erd_and_schema_visualizer.md) | High cost & complexity of visualizing database schemas, pixelated low-res diagram screenshots, and outdated documentation. | Interactive pan/zoom canvas, auto-grid layout, SVG Bezier relation curves, 2x DPI PNG capture, SVG export, and Markdown/Mermaid doc generator. |
| 2 | [**02. Dual Migration Engine (.bacpac & .bak)**](./02_dual_migration_engine_bacpac_and_bak.md) | Cross-version MSSQL migration failures (e.g. 2022 to 2014) and path mismatch errors during `RESTORE DATABASE`. | Dual `.bacpac` (sqlpackage schema/data export) & `.bak` (native T-SQL) mode with `RESTORE FILELISTONLY` logical file relocation (`WITH MOVE`). |
| 3 | [**03. Engine Acquisition & Process Security**](./03_automated_engine_acquisition_and_security.md) | Complex CLI setup, shell injection risks, password character parsing bugs (`@`, `!`, `$`), and plain-text credential leaks in logs. | OS-aware binary auto-downloader, non-shell `spawn(..., { shell: false })` execution, and in-memory regex credential redaction. |
| 4 | [**04. Wireless Peer-to-Peer Backup Transfer**](./04_p2p_wireless_backup_transfer.md) | Slow USB file transfers and browser "Insecure Download" blocks when sharing backup files over local Wi-Fi. | Embedded P2P HTTP file streaming server with PIN authentication, defensive HTTP headers, and browser download bypass guidance. |

---

## 👤 Author & Maintainer
Developed by **mu42** (Uzair) — Built for database administrators, software engineers, and DevOps architects.
