import React from 'react';
import { Database, ShieldCheck, DownloadCloud, HardDrive, RefreshCw } from 'lucide-react';
import { SqlpackageStatus } from '../types';

interface HeaderProps {
  status: SqlpackageStatus | null;
  onRedownload: () => void;
}

export const Header: React.FC<HeaderProps> = ({ status, onRedownload }) => {
  const osLabel = status?.os === 'win32' ? 'Windows' : status?.os === 'linux' ? 'Linux' : status?.os || 'System';

  return (
    <header className="bg-forest-900/90 border-b border-forest-800 px-6 py-4 flex items-center justify-between shadow-md">
      <div className="flex items-center space-x-3">
        <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400 flex items-center justify-center shadow-inner">
          <Database className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-white tracking-tight">MSSQL BACPAC Exporter</h1>
            <span className="px-2 py-0.5 text-xs font-semibold bg-forest-800 text-emerald-300 rounded border border-forest-700">
              GUI Utility
            </span>
          </div>
          <p className="text-xs text-emerald-400/80 font-medium mt-0.5">
            Export Microsoft SQL Server databases to portable .bacpac archives
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {/* OS Detector Badge */}
        <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-forest-950/60 border border-forest-800 rounded-lg text-xs font-mono text-emerald-200">
          <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
          <span>OS: <strong className="text-emerald-300">{osLabel}</strong></span>
        </div>

        {/* Engine Status Badge */}
        {status?.exists ? (
          <div className="flex items-center space-x-2 px-3 py-1.5 bg-emerald-950/50 border border-emerald-800/80 text-emerald-400 rounded-lg text-xs font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>sqlpackage Engine Ready</span>
            <button
              onClick={onRedownload}
              title="Re-verify or re-download engine binaries"
              className="ml-1 p-1 hover:bg-emerald-900/50 rounded transition text-emerald-300 hover:text-white"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button
            onClick={onRedownload}
            className="flex items-center space-x-2 px-3.5 py-1.5 bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 rounded-lg text-xs font-medium transition cursor-pointer shadow-sm"
          >
            <DownloadCloud className="w-4 h-4 animate-bounce" />
            <span>Acquire sqlpackage Engine</span>
          </button>
        )}
      </div>
    </header>
  );
};
