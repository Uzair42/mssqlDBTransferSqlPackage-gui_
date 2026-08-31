import React, { useState, useRef, useEffect } from 'react';
import {
  BacpacIcon,
  BakBackupIcon,
  DriverConnectorIcon,
  ShieldCheckIcon,
  DownloadCloudIcon,
  HardDriveIcon,
  RefreshIcon,
  CheckCircleIcon,
  CompassGuideIcon,
  SparkleHintIcon,
  ChevronDownIcon,
  PlayIcon,
} from './icons/FeatureIcons';
import { SqlpackageStatus, EnvironmentInfo, ServerVersionInfo } from '../types';

interface HeaderProps {
  status: SqlpackageStatus | null;
  onRedownload: () => void;
  envInfo: EnvironmentInfo | null;
  serverInfo: ServerVersionInfo | null;
  onOpenTour: () => void;
  onStartWalkthrough: () => void;
  isGuideModeActive: boolean;
  onToggleGuideMode: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  status,
  onRedownload,
  envInfo,
  serverInfo,
  onOpenTour,
  onStartWalkthrough,
  isGuideModeActive,
  onToggleGuideMode,
}) => {
  const osLabel = status?.os === 'win32' ? 'Windows' : status?.os === 'linux' ? 'Linux' : status?.os || 'System';
  const [isHelpMenuOpen, setIsHelpMenuOpen] = useState(false);
  const helpMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (helpMenuRef.current && !helpMenuRef.current.contains(event.target as Node)) {
        setIsHelpMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="bg-forest-900/90 border-b border-forest-800 px-6 py-3.5 flex items-center justify-between shadow-md shrink-0">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400 flex items-center justify-center shadow-inner">
          <BacpacIcon className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-lg font-bold text-white tracking-tight">MSSQL BACPAC Exporter</h1>
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-forest-800 text-emerald-300 rounded border border-forest-700">
              GUI Utility
            </span>
          </div>
          <p className="text-[11px] text-emerald-400/80 font-medium">
            Export & Migrate Microsoft SQL Server databases via portable .bacpac and native .bak
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {/* Help & Interactive Tour Menu */}
        <div className="relative" ref={helpMenuRef}>
          <button
            type="button"
            onClick={() => setIsHelpMenuOpen(!isHelpMenuOpen)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-forest-950/80 hover:bg-forest-800 border border-emerald-500/30 hover:border-emerald-500/60 rounded-xl text-xs font-semibold text-emerald-300 hover:text-white transition shadow-sm"
          >
            <CompassGuideIcon className="w-3.5 h-3.5 text-emerald-400" />
            <span>Guide & Tour</span>
            <ChevronDownIcon className={`w-3 h-3 text-emerald-400/70 transition-transform ${isHelpMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {isHelpMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-forest-950 border border-emerald-500/30 rounded-xl shadow-2xl p-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
              <button
                type="button"
                onClick={() => {
                  setIsHelpMenuOpen(false);
                  onOpenTour();
                }}
                className="w-full flex items-center space-x-2.5 px-3 py-2 text-left rounded-lg text-emerald-100 hover:bg-forest-800 hover:text-white transition"
              >
                <CompassGuideIcon className="w-4 h-4 text-emerald-400" />
                <div>
                  <div className="font-semibold">Product Overview Tour</div>
                  <div className="text-[10px] text-forest-300">Feature guide & .bacpac vs .bak</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsHelpMenuOpen(false);
                  onStartWalkthrough();
                }}
                className="w-full flex items-center space-x-2.5 px-3 py-2 text-left rounded-lg text-emerald-100 hover:bg-forest-800 hover:text-white transition"
              >
                <PlayIcon className="w-4 h-4 text-teal-400 fill-current" />
                <div>
                  <div className="font-semibold">Interactive Walkthrough</div>
                  <div className="text-[10px] text-forest-300">Step-by-step on-screen spotlight</div>
                </div>
              </button>

              <div className="my-1 border-t border-forest-800" />

              <button
                type="button"
                onClick={() => {
                  onToggleGuideMode();
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-left rounded-lg transition ${
                  isGuideModeActive ? 'bg-emerald-950/60 text-emerald-200' : 'text-forest-200 hover:bg-forest-800'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <SparkleHintIcon className="w-4 h-4 text-emerald-400" />
                  <div>
                    <div className="font-semibold">Feature Hotspots</div>
                    <div className="text-[10px] text-forest-300">Show pulsing UI hints</div>
                  </div>
                </div>
                <div className={`w-8 h-4 rounded-full p-0.5 transition ${isGuideModeActive ? 'bg-emerald-500' : 'bg-forest-800'}`}>
                  <div className={`w-3 h-3 rounded-full bg-white transition-transform ${isGuideModeActive ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
              </button>
            </div>
          )}
        </div>

        {/* OS Detector Badge */}
        <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-forest-950/60 border border-forest-800 rounded-lg text-xs font-mono text-emerald-200" title="Operating System Host">
          <HardDriveIcon className="w-3.5 h-3.5 text-emerald-400" />
          <span>OS: <strong className="text-emerald-300">{osLabel}</strong></span>
        </div>

        {/* Client Driver Badge (Always active) */}
        <div
          className="flex items-center space-x-1.5 px-2.5 py-1 bg-forest-950/60 border border-forest-800 rounded-lg text-xs font-mono text-emerald-200"
          title={`Active Client Driver: ${envInfo?.activeClientDriver || 'Tedious TDS 7.4'} | Engine: ${envInfo?.sqlpackageVersion || 'SqlPackage v170.4'}`}
        >
          <DriverConnectorIcon className="w-3.5 h-3.5 text-teal-400" />
          <span>Driver: <strong className="text-teal-300">Tedious (TDS 7.4)</strong></span>
        </div>

        {/* Database Version: Before Connection (Local) vs After Connection (Remote/Live) */}
        {serverInfo ? (
          <div
            className="flex items-center space-x-2 px-3 py-1 bg-emerald-950 border border-emerald-500/80 text-emerald-300 rounded-lg text-xs font-medium shadow-md shadow-emerald-950/50 animate-in fade-in"
            title={`Connected to ${serverInfo.friendlyVersion}\nBuild: ${serverInfo.productVersion} (${serverInfo.productLevel})\nDriver: ${serverInfo.activeDriver}\nSPID: ${serverInfo.spid || 'N/A'}`}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate max-w-[200px]">
              Connected: <strong className="text-white">{serverInfo.friendlyVersion}</strong>
            </span>
          </div>
        ) : envInfo?.localMssqlInstalled ? (
          <div
            className="flex items-center space-x-1.5 px-2.5 py-1 bg-forest-950/60 border border-forest-800 rounded-lg text-xs font-mono text-emerald-200"
            title={`Local MSSQL Server installed: v${envInfo.localMssqlVersion} (${envInfo.localMssqlStatus})`}
          >
            <BakBackupIcon className="w-3.5 h-3.5 text-emerald-400" />
            <span>Local DB: <strong className="text-emerald-300">{envInfo.localMssqlFriendly?.replace('SQL Server', 'MSSQL') || 'Installed'}</strong></span>
          </div>
        ) : null}

        {/* Engine Status Badge */}
        {status?.exists ? (
          <div className="flex items-center space-x-2 px-2.5 py-1 bg-emerald-950/50 border border-emerald-800/80 text-emerald-400 rounded-lg text-xs font-medium">
            <ShieldCheckIcon className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Engine Ready</span>
            <button
              onClick={onRedownload}
              title="Re-verify or re-download engine binaries"
              className="ml-0.5 p-1 hover:bg-emerald-900/50 rounded transition text-emerald-300 hover:text-white"
            >
              <RefreshIcon className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button
            onClick={onRedownload}
            className="flex items-center space-x-2 px-3 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 rounded-lg text-xs font-medium transition cursor-pointer shadow-sm"
          >
            <DownloadCloudIcon className="w-3.5 h-3.5 animate-bounce" />
            <span>Acquire Engine</span>
          </button>
        )}
      </div>
    </header>
  );
};
