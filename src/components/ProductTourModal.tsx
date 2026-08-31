import React, { useState } from 'react';
import {
  BacpacIcon,
  BakBackupIcon,
  WindowsSecurityIcon,
  DowngradeTuningIcon,
  RamMemoryIcon,
  TrustCertIcon,
  ShieldCheckIcon,
  LightningIcon,
  CompassGuideIcon,
  CheckCircleIcon,
  CloseIcon,
  PlayIcon,
} from './icons/FeatureIcons';

interface ProductTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartWalkthrough: () => void;
}

export const ProductTourModal: React.FC<ProductTourModalProps> = ({
  isOpen,
  onClose,
  onStartWalkthrough,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'bacpac_vs_bak' | 'windows_auth' | 'downgrade'>('overview');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-forest-900 border border-emerald-500/30 rounded-2xl shadow-2xl shadow-emerald-950/80 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-forest-950 via-forest-900 to-forest-950 border-b border-forest-800 p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400">
              <CompassGuideIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <span>Welcome to MSSQL Database Migrator</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Product Guide
                </span>
              </h2>
              <p className="text-xs text-emerald-400/80">
                A quick tour of key migration capabilities and hassle-free workflows
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 text-forest-300 hover:text-white rounded-lg hover:bg-forest-800 transition"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-4 bg-forest-950/80 border-b border-forest-800 px-4 pt-2 gap-1 text-xs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-2 text-center font-semibold rounded-t-lg transition border-b-2 flex items-center justify-center space-x-1.5 ${
              activeTab === 'overview'
                ? 'border-emerald-500 text-emerald-300 bg-forest-900/60'
                : 'border-transparent text-forest-300 hover:text-emerald-200'
            }`}
          >
            <CompassGuideIcon className="w-3.5 h-3.5" />
            <span>1. Overview</span>
          </button>
          <button
            onClick={() => setActiveTab('bacpac_vs_bak')}
            className={`py-2 px-2 text-center font-semibold rounded-t-lg transition border-b-2 flex items-center justify-center space-x-1.5 ${
              activeTab === 'bacpac_vs_bak'
                ? 'border-emerald-500 text-emerald-300 bg-forest-900/60'
                : 'border-transparent text-forest-300 hover:text-emerald-200'
            }`}
          >
            <BacpacIcon className="w-3.5 h-3.5" />
            <span>2. .bacpac vs .bak</span>
          </button>
          <button
            onClick={() => setActiveTab('windows_auth')}
            className={`py-2 px-2 text-center font-semibold rounded-t-lg transition border-b-2 flex items-center justify-center space-x-1.5 ${
              activeTab === 'windows_auth'
                ? 'border-emerald-500 text-emerald-300 bg-forest-900/60'
                : 'border-transparent text-forest-300 hover:text-emerald-200'
            }`}
          >
            <WindowsSecurityIcon className="w-3.5 h-3.5" />
            <span>3. Windows Auth</span>
          </button>
          <button
            onClick={() => setActiveTab('downgrade')}
            className={`py-2 px-2 text-center font-semibold rounded-t-lg transition border-b-2 flex items-center justify-center space-x-1.5 ${
              activeTab === 'downgrade'
                ? 'border-emerald-500 text-emerald-300 bg-forest-900/60'
                : 'border-transparent text-forest-300 hover:text-emerald-200'
            }`}
          >
            <DowngradeTuningIcon className="w-3.5 h-3.5" />
            <span>4. Downgrade Engine</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs leading-relaxed text-emerald-100 flex-1">
          {activeTab === 'overview' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 bg-forest-950/70 border border-emerald-500/20 rounded-xl space-y-2">
                <h3 className="font-bold text-sm text-emerald-300 flex items-center space-x-2">
                  <BacpacIcon className="w-4 h-4 text-emerald-400" />
                  <span>Dual-Engine Database Operations</span>
                </h3>
                <p className="text-emerald-200/90">
                  This utility bridges the gap between Microsoft's command-line <code>sqlpackage</code> and native SQL backup engines into a single, intuitive interface.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 bg-forest-950/50 border border-forest-800 rounded-xl space-y-1.5">
                  <div className="flex items-center space-x-2 text-teal-300 font-semibold">
                    <LightningIcon className="w-4 h-4 text-teal-400" />
                    <span>Auto Engine Acquisition</span>
                  </div>
                  <p className="text-forest-200 text-[11px]">
                    Detects your OS (Linux/Windows) and automatically downloads official Microsoft standalone binaries in the background.
                  </p>
                </div>

                <div className="p-3.5 bg-forest-950/50 border border-forest-800 rounded-xl space-y-1.5">
                  <div className="flex items-center space-x-2 text-emerald-300 font-semibold">
                    <ShieldCheckIcon className="w-4 h-4 text-emerald-400" />
                    <span>Zero Shell Injection Risk</span>
                  </div>
                  <p className="text-forest-200 text-[11px]">
                    Executes non-shell argument arrays with complete in-memory password masking for bulletproof security.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'bacpac_vs_bak' && (
            <div className="space-y-3.5 animate-in fade-in">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-xl space-y-2">
                  <div className="flex items-center space-x-2 text-emerald-300 font-bold text-sm">
                    <BacpacIcon className="w-4 h-4 text-emerald-400" />
                    <span>.bacpac (Schema + Data)</span>
                  </div>
                  <ul className="space-y-1.5 text-[11px] text-emerald-200/90 list-disc list-inside">
                    <li><strong>Best For:</strong> Version downgrades (e.g. MSSQL 2022 to 2014) & cross-platform migration.</li>
                    <li><strong>Mechanism:</strong> Microsoft <code>sqlpackage</code> DacFx extract & publish.</li>
                    <li><strong>Network:</strong> Runs over standard client TDS connection without requiring server file access.</li>
                  </ul>
                </div>

                <div className="p-4 bg-teal-950/30 border border-teal-500/30 rounded-xl space-y-2">
                  <div className="flex items-center space-x-2 text-teal-300 font-bold text-sm">
                    <BakBackupIcon className="w-4 h-4 text-teal-400" />
                    <span>.bak (Physical Backup)</span>
                  </div>
                  <ul className="space-y-1.5 text-[11px] text-teal-200/90 list-disc list-inside">
                    <li><strong>Best For:</strong> High-speed same-version or upgrade restores.</li>
                    <li><strong>Mechanism:</strong> Native T-SQL <code>BACKUP</code> / <code>RESTORE</code> with <code>WITH MOVE</code>.</li>
                    <li><strong>Limitation:</strong> Cannot restore a backup from a higher SQL Server version into a lower one.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'windows_auth' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 bg-forest-950/70 border border-emerald-500/20 rounded-xl space-y-2">
                <h3 className="font-bold text-sm text-emerald-300 flex items-center space-x-2">
                  <WindowsSecurityIcon className="w-4 h-4 text-emerald-400" />
                  <span>SSMS-Style 1-Click Windows Authentication</span>
                </h3>
                <p className="text-emerald-200/90">
                  Connect without the password headache just like SQL Server Management Studio:
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-start space-x-3 p-3 bg-forest-950/50 border border-forest-800 rounded-xl">
                  <CheckCircleIcon className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block font-medium">Integrated Security (SSPI):</strong>
                    <span className="text-[11px] text-forest-200">
                      When on Windows, simply choose "Windows Auth". The app passes <code>/SourceIntegratedSecurity:True</code> directly to the engine without asking for username or password.
                    </span>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 bg-forest-950/50 border border-forest-800 rounded-xl">
                  <CheckCircleIcon className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block font-medium">Active Directory / Domain NTLM:</strong>
                    <span className="text-[11px] text-forest-200">
                      Connecting across domains or from Linux? Toggle "Specify Domain User" to pass <code>DOMAIN\user</code> credentials securely.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'downgrade' && (
            <div className="space-y-3.5 animate-in fade-in">
              <div className="p-4 bg-forest-950/70 border border-emerald-500/20 rounded-xl space-y-2">
                <h3 className="font-bold text-sm text-emerald-300 flex items-center space-x-2">
                  <DowngradeTuningIcon className="w-4 h-4 text-emerald-400" />
                  <span>Cross-Version & Downgrade Switches</span>
                </h3>
                <p className="text-emerald-200/90">
                  The app automatically enables battle-tested parameters when migrating across disparate SQL Server versions:
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-[11px]">
                <div className="p-2.5 bg-forest-950/60 border border-forest-800 rounded-lg flex items-start space-x-2">
                  <RamMemoryIcon className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                  <div>
                    <code className="text-emerald-300 font-mono">/p:Storage=Memory</code>
                    <p className="text-forest-300 mt-1">Prevents crashes on modern Linux/.NET Core runtimes where Windows ESE file storage is unavailable.</p>
                  </div>
                </div>
                <div className="p-2.5 bg-forest-950/60 border border-forest-800 rounded-lg flex items-start space-x-2">
                  <DowngradeTuningIcon className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <code className="text-emerald-300 font-mono">/p:CommandTimeout=0</code>
                    <p className="text-forest-300 mt-1">Disables timeout limitations so multi-gigabyte databases export smoothly without dropping.</p>
                  </div>
                </div>
                <div className="p-2.5 bg-forest-950/60 border border-forest-800 rounded-lg flex items-start space-x-2">
                  <ShieldCheckIcon className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <code className="text-emerald-300 font-mono">/p:VerifyExtraction=False</code>
                    <p className="text-forest-300 mt-1">Skips redundant re-reading phases, saving significant time during large extractions.</p>
                  </div>
                </div>
                <div className="p-2.5 bg-forest-950/60 border border-forest-800 rounded-lg flex items-start space-x-2">
                  <TrustCertIcon className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <code className="text-emerald-300 font-mono">Trust Server Certificate</code>
                    <p className="text-forest-300 mt-1">Essential for self-signed certificates in local instances, Docker containers, and test servers.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-forest-950 border-t border-forest-800 px-6 py-4 flex items-center justify-between">
          <label className="flex items-center space-x-2 text-xs text-forest-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="rounded bg-forest-900 border-forest-700 text-emerald-500 focus:ring-0"
            />
            <span>Don't show this guide on startup</span>
          </label>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-forest-800 hover:bg-forest-700 text-forest-100 rounded-xl text-xs font-semibold transition"
            >
              Explore on My Own
            </button>
            <button
              onClick={handleStartTour}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-lg shadow-emerald-900/40"
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
