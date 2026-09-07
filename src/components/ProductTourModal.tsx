import React, { useState } from 'react';
import {
  BacpacIcon,
  BakBackupIcon,
  WindowsSecurityIcon,
  DowngradeTuningIcon,
  RamMemoryIcon,
  ShieldCheckIcon,
  LightningIcon,
  CompassGuideIcon,
  CheckCircleIcon,
  CloseIcon,
  PlayIcon,
  DatabaseScannerIcon,
} from './icons/FeatureIcons';

interface ProductTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartWalkthrough: () => void;
}

export type TourTabType = 'overview' | 'schema_erd' | 'transfer_network' | 'bacpac_vs_bak' | 'windows_auth' | 'downgrade' | 'visual_guide';

export const ProductTourModal: React.FC<ProductTourModalProps> = ({
  isOpen,
  onClose,
  onStartWalkthrough,
}) => {
  const [activeTab, setActiveTab] = useState<TourTabType>('overview');
  const [dontShowAgain, setDontShowAgain] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem('sqlpackage_gui_has_seen_tour', 'true');
    }
    onClose();
  };

  const handleStartTour = () => {
    if (dontShowAgain) {
      localStorage.setItem('sqlpackage_gui_has_seen_tour', 'true');
    }
    onStartWalkthrough();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-theme-surface border border-theme-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Banner Graphic Header */}
        <div className="relative w-full h-28 bg-theme-card border-b border-theme-border overflow-hidden">
          <img
            src="/assets/app_banner.png"
            alt="MSSQL Database Migrator Banner"
            className="w-full h-full object-cover opacity-90"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-theme-surface via-transparent to-black/40 flex items-end justify-between p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-theme-bg/80 border border-theme-border rounded-xl text-theme-text shadow-md">
                <CompassGuideIcon className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-aladin text-2xl text-theme-text font-bold flex items-center space-x-2 drop-shadow-md">
                  <span>MSSQL Database Migrator Guide</span>
                  <span className="text-[10px] uppercase font-mono font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-user-gradient text-white shadow-sm">
                    by mu42
                  </span>
                </h2>
                <p className="font-annie text-base text-theme-muted tracking-wide drop-shadow">
                  Complete guide to high-contrast database migrations, schema exploration & transfer workflows • Developed by mu42
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-1.5 text-theme-muted hover:text-theme-text rounded-lg bg-theme-bg/80 border border-theme-border transition"
            >
              <CloseIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-7 bg-theme-bg border-b border-theme-border px-3 pt-2 gap-1 text-xs font-aladin">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-1 text-center text-xs font-semibold rounded-t-lg transition border-b-2 flex items-center justify-center space-x-1 ${
              activeTab === 'overview'
                ? 'border-theme-text text-theme-text bg-theme-card'
                : 'border-transparent text-theme-muted hover:text-theme-text'
            }`}
          >
            <CompassGuideIcon className="w-3.5 h-3.5" />
            <span>1. Overview</span>
          </button>
          <button
            onClick={() => setActiveTab('schema_erd')}
            className={`py-2 px-1 text-center text-xs font-semibold rounded-t-lg transition border-b-2 flex items-center justify-center space-x-1 ${
              activeTab === 'schema_erd'
                ? 'border-theme-text text-theme-text bg-theme-card'
                : 'border-transparent text-theme-muted hover:text-theme-text'
            }`}
          >
            <DatabaseScannerIcon className="w-3.5 h-3.5 text-theme-accentPrimary" />
            <span>2. Schema & ERD</span>
          </button>
          <button
            onClick={() => setActiveTab('transfer_network')}
            className={`py-2 px-1 text-center text-xs font-semibold rounded-t-lg transition border-b-2 flex items-center justify-center space-x-1 ${
              activeTab === 'transfer_network'
                ? 'border-theme-text text-theme-text bg-theme-card'
                : 'border-transparent text-theme-muted hover:text-theme-text'
            }`}
          >
            <img src="/assets/app_logo.svg" alt="Transfer" className="w-3.5 h-3.5 object-contain" />
            <span>3. Transfer</span>
          </button>
          <button
            onClick={() => setActiveTab('bacpac_vs_bak')}
            className={`py-2 px-1 text-center text-xs font-semibold rounded-t-lg transition border-b-2 flex items-center justify-center space-x-1 ${
              activeTab === 'bacpac_vs_bak'
                ? 'border-theme-text text-theme-text bg-theme-card'
                : 'border-transparent text-theme-muted hover:text-theme-text'
            }`}
          >
            <BacpacIcon className="w-3.5 h-3.5" />
            <span>4. .bacpac vs .bak</span>
          </button>
          <button
            onClick={() => setActiveTab('windows_auth')}
            className={`py-2 px-1 text-center text-xs font-semibold rounded-t-lg transition border-b-2 flex items-center justify-center space-x-1 ${
              activeTab === 'windows_auth'
                ? 'border-theme-text text-theme-text bg-theme-card'
                : 'border-transparent text-theme-muted hover:text-theme-text'
            }`}
          >
            <WindowsSecurityIcon className="w-3.5 h-3.5" />
            <span>5. Windows Auth</span>
          </button>
          <button
            onClick={() => setActiveTab('downgrade')}
            className={`py-2 px-1 text-center text-xs font-semibold rounded-t-lg transition border-b-2 flex items-center justify-center space-x-1 ${
              activeTab === 'downgrade'
                ? 'border-theme-text text-theme-text bg-theme-card'
                : 'border-transparent text-theme-muted hover:text-theme-text'
            }`}
          >
            <DowngradeTuningIcon className="w-3.5 h-3.5" />
            <span>6. Downgrade Engine</span>
          </button>
          <button
            onClick={() => setActiveTab('visual_guide')}
            className={`py-2 px-1 text-center text-xs font-semibold rounded-t-lg transition border-b-2 flex items-center justify-center space-x-1 ${
              activeTab === 'visual_guide'
                ? 'border-theme-text text-theme-text bg-theme-card'
                : 'border-transparent text-theme-muted hover:text-theme-text'
            }`}
          >
            <ShieldCheckIcon className="w-3.5 h-3.5" />
            <span>7. Infographic</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs leading-relaxed text-theme-text flex-1">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 bg-theme-card border border-theme-border rounded-xl space-y-2">
                <h3 className="font-aladin text-xl text-theme-text flex items-center space-x-2">
                  <BacpacIcon className="w-5 h-5 text-theme-text" />
                  <span>Dual-Engine Database Operations</span>
                </h3>
                <p className="font-ballet text-base text-theme-muted">
                  This utility bridges the gap between Microsoft's command-line <code>sqlpackage</code> and native SQL backup engines into a single, intuitive high-contrast interface.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 bg-theme-card border border-theme-border rounded-xl space-y-1.5">
                  <div className="flex items-center space-x-2 font-aladin text-lg text-theme-text">
                    <LightningIcon className="w-4 h-4 text-theme-text" />
                    <span>Auto Engine Acquisition</span>
                  </div>
                  <p className="font-ballet text-sm text-theme-muted">
                    Detects your OS (Linux/Windows) and automatically downloads official Microsoft standalone binaries in the background.
                  </p>
                </div>

                <div className="p-3.5 bg-theme-card border border-theme-border rounded-xl space-y-1.5">
                  <div className="flex items-center space-x-2 font-aladin text-lg text-theme-text">
                    <ShieldCheckIcon className="w-4 h-4 text-theme-text" />
                    <span>Zero Shell Injection Risk</span>
                  </div>
                  <p className="font-ballet text-sm text-theme-muted">
                    Executes non-shell argument arrays with complete in-memory password masking for bulletproof security.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SCHEMA EXPLORER & ERD */}
          {activeTab === 'schema_erd' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 bg-theme-card border border-theme-border rounded-xl space-y-2">
                <h3 className="font-aladin text-xl text-theme-text flex items-center space-x-2">
                  <DatabaseScannerIcon className="w-5 h-5 text-theme-accentPrimary" />
                  <span>Interactive SQL Schema Explorer & ERD Visualizer</span>
                </h3>
                <p className="font-ballet text-base text-theme-muted">
                  Explore full relational architectures, rearrange diagrams via drag-and-drop, and export high-res visual assets without external management tools:
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 bg-theme-card border border-theme-border rounded-xl space-y-1.5">
                  <div className="font-aladin text-base text-theme-text flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-theme-accentPrimary"></span>
                    <span>🖐️ Drag & Drop ERD Positioning</span>
                  </div>
                  <p className="font-ballet text-xs text-theme-muted">
                    Freely drag any table card to reposition it on the infinite canvas. Bézier relational connector lines bend and follow movement dynamically.
                  </p>
                </div>

                <div className="p-3.5 bg-theme-card border border-theme-border rounded-xl space-y-1.5">
                  <div className="font-aladin text-base text-theme-text flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                    <span>📸 High-Res PNG Photo Export</span>
                  </div>
                  <p className="font-ballet text-xs text-theme-muted">
                    1-click download of a crystal-clear, high-resolution PNG image rendered via HTML5 canvas for presentations, pull requests, and client reports.
                  </p>
                </div>

                <div className="p-3.5 bg-theme-card border border-theme-border rounded-xl space-y-1.5">
                  <div className="font-aladin text-base text-theme-text flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                    <span>📐 Vector SVG & Mermaid Markdown</span>
                  </div>
                  <p className="font-ballet text-xs text-theme-muted">
                    Export scalable vector SVG diagrams or complete Markdown (<code>.md</code>) documentation with embedded <code>erDiagram</code> syntax for GitHub & Notion.
                  </p>
                </div>

                <div className="p-3.5 bg-theme-card border border-theme-border rounded-xl space-y-1.5">
                  <div className="font-aladin text-base text-theme-text flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                    <span>🔍 Live Table Inspection & Data Rows</span>
                  </div>
                  <p className="font-ballet text-xs text-theme-muted">
                    Inspect Primary/Foreign keys, data types, nullability, row counts, and preview the top 50 sample records directly in a high-contrast data grid.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TRANSFER BACKUP */}
          {activeTab === 'transfer_network' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 bg-theme-card border border-theme-border rounded-xl space-y-2">
                <h3 className="font-aladin text-xl text-theme-text flex items-center space-x-2">
                  <img src="/assets/app_logo.svg" alt="Transfer" className="w-5 h-5 object-contain" />
                  <span>Wi-Fi & Bluetooth Backup File Transfer</span>
                </h3>
                <p className="font-ballet text-base text-theme-muted">
                  Avoid email size limits and WhatsApp file renaming when sharing database backups across your local devices:
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 bg-theme-card border border-theme-border rounded-xl space-y-2">
                  <div className="font-aladin text-lg text-theme-text flex items-center space-x-2">
                    <LightningIcon className="w-4 h-4 text-emerald-400" />
                    <span>Local Wi-Fi Server (P2P Streaming)</span>
                  </div>
                  <p className="font-ballet text-xs text-theme-muted leading-relaxed">
                    Spawns a local HTTP download server on your local IP address. Anyone on your local network (laptop, PC, phone) can download multi-gigabyte <code>.bacpac</code> or <code>.bak</code> files via their browser in seconds.
                  </p>
                </div>

                <div className="p-3.5 bg-theme-card border border-theme-border rounded-xl space-y-2">
                  <div className="font-aladin text-lg text-theme-text flex items-center space-x-2">
                    <ShieldCheckIcon className="w-4 h-4 text-cyan-400" />
                    <span>Bluetooth File Push</span>
                  </div>
                  <p className="font-ballet text-xs text-theme-muted leading-relaxed">
                    Triggers native OS Bluetooth OBEX transfer to send backup packages directly to paired computers and Android devices without an internet connection.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: BACPAC VS BAK */}
          {activeTab === 'bacpac_vs_bak' && (
            <div className="space-y-3.5 animate-in fade-in">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-theme-card border border-theme-border rounded-xl space-y-2">
                  <div className="flex items-center space-x-2 font-aladin text-xl text-theme-text">
                    <BacpacIcon className="w-4 h-4 text-theme-text" />
                    <span>.bacpac (Schema + Data)</span>
                  </div>
                  <ul className="space-y-1.5 font-ballet text-sm text-theme-muted list-disc list-inside">
                    <li><strong>Best For:</strong> Version downgrades (e.g. MSSQL 2022 to 2014) & cross-platform migration.</li>
                    <li><strong>Mechanism:</strong> Microsoft <code>sqlpackage</code> DacFx extract & publish.</li>
                    <li><strong>Network:</strong> Runs over standard client TDS connection without requiring server file access.</li>
                    <li><strong>WhatsApp Safe:</strong> Direct support for <code>.zip</code> archives downloaded from messaging apps.</li>
                  </ul>
                </div>

                <div className="p-4 bg-theme-card border border-theme-border rounded-xl space-y-2">
                  <div className="flex items-center space-x-2 font-aladin text-xl text-theme-text">
                    <BakBackupIcon className="w-4 h-4 text-theme-text" />
                    <span>.bak (Physical Backup)</span>
                  </div>
                  <ul className="space-y-1.5 font-ballet text-sm text-theme-muted list-disc list-inside">
                    <li><strong>Best For:</strong> High-speed same-version or upgrade restores.</li>
                    <li><strong>Mechanism:</strong> Native T-SQL <code>BACKUP</code> / <code>RESTORE</code> with automatic <code>WITH MOVE</code> mapping.</li>
                    <li><strong>Limitation:</strong> Cannot restore a backup from a higher SQL Server version into a lower one.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: WINDOWS AUTH & DRIVERS */}
          {activeTab === 'windows_auth' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 bg-theme-card border border-theme-border rounded-xl space-y-2">
                <h3 className="font-aladin text-xl text-theme-text flex items-center space-x-2">
                  <WindowsSecurityIcon className="w-4 h-4 text-theme-text" />
                  <span>SSMS-Style 1-Click Windows Authentication</span>
                </h3>
                <p className="font-ballet text-base text-theme-muted">
                  Connect without password friction just like SQL Server Management Studio:
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-start space-x-3 p-3 bg-theme-card border border-theme-border rounded-xl">
                  <CheckCircleIcon className="w-4 h-4 text-theme-text shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-theme-text block font-aladin text-base">Integrated Security (SSPI / msnodesqlv8):</strong>
                    <span className="font-ballet text-sm text-theme-muted">
                      When on Windows, the app uses native <code>msnodesqlv8</code> and SSPI to authenticate automatically using your active Windows logon session without asking for passwords.
                    </span>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 bg-theme-card border border-theme-border rounded-xl">
                  <CheckCircleIcon className="w-4 h-4 text-theme-text shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-theme-text block font-aladin text-base">Active Directory / Domain NTLM:</strong>
                    <span className="font-ballet text-sm text-theme-muted">
                      Connecting across domains or from Linux? Toggle "Specify Domain User" to pass <code>DOMAIN\user</code> credentials cleanly.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: DOWNGRADE ENGINE */}
          {activeTab === 'downgrade' && (
            <div className="space-y-3.5 animate-in fade-in">
              <div className="p-4 bg-theme-card border border-theme-border rounded-xl space-y-2">
                <h3 className="font-aladin text-xl text-theme-text flex items-center space-x-2">
                  <DowngradeTuningIcon className="w-4 h-4 text-theme-text" />
                  <span>Cross-Version & Downgrade Switches</span>
                </h3>
                <p className="font-ballet text-base text-theme-muted">
                  The app automatically enables battle-tested parameters when migrating across disparate SQL Server versions:
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-2.5 bg-theme-card border border-theme-border rounded-lg flex items-start space-x-2">
                  <RamMemoryIcon className="w-4 h-4 text-theme-text shrink-0 mt-0.5" />
                  <div>
                    <code className="text-theme-text font-mono font-bold">/p:Storage=Memory</code>
                    <p className="font-ballet text-sm text-theme-muted mt-1">Prevents crashes on modern Linux/.NET Core runtimes where ESE storage is unavailable.</p>
                  </div>
                </div>
                <div className="p-2.5 bg-theme-card border border-theme-border rounded-lg flex items-start space-x-2">
                  <DowngradeTuningIcon className="w-4 h-4 text-theme-text shrink-0 mt-0.5" />
                  <div>
                    <code className="text-theme-text font-mono font-bold">/p:CommandTimeout=0</code>
                    <p className="font-ballet text-sm text-theme-muted mt-1">Disables timeout limitations so multi-gigabyte databases export smoothly.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: INFOGRAPHIC */}
          {activeTab === 'visual_guide' && (
            <div className="space-y-3 animate-in fade-in">
              <div className="p-3 bg-theme-card border border-theme-border rounded-xl space-y-1">
                <h3 className="font-aladin text-xl text-theme-text flex items-center space-x-2">
                  <CompassGuideIcon className="w-4 h-4 text-theme-text" />
                  <span>MSSQL Migrator Architecture & Infographic</span>
                </h3>
                <p className="font-ballet text-base text-theme-muted">
                  Infographic breakdown of .bacpac vs .bak, SSPI vs Domain Authentication, and TDS 7.4 connection telemetry.
                </p>
              </div>
              <div className="rounded-xl overflow-hidden border border-theme-border shadow-xl bg-black flex items-center justify-center p-1">
                <img
                  src="/tool_usage_guide.png"
                  alt="MSSQL Database Migrator Visual Tool Usage Guide"
                  className="w-full h-auto object-contain max-h-[380px] rounded-lg"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-theme-card border-t border-theme-border px-6 py-4 flex items-center justify-between">
          <label className="flex items-center space-x-2 text-xs text-theme-muted cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="rounded bg-theme-bg border-theme-border text-theme-text focus:ring-0"
            />
            <span className="font-mono text-[11px]">Don't show this guide on startup</span>
          </label>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-theme-bg hover:bg-theme-border text-theme-text rounded-xl text-xs font-semibold transition border border-theme-border"
            >
              Explore on My Own
            </button>
            <button
              onClick={handleStartTour}
              className="px-4 py-2 bg-user-gradient text-white font-bold rounded-xl text-xs transition flex items-center space-x-1.5 shadow-lg hover:brightness-110 border border-white/20 drop-shadow-sm"
            >
              <PlayIcon className="w-3.5 h-3.5 fill-current" />
              <span>Start Interactive Walkthrough</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
