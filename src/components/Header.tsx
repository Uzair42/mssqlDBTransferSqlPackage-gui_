import React, { useState, useRef, useEffect } from 'react';
import {
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
  PaletteThemeIcon,
  DatabaseScannerIcon,
} from './icons/FeatureIcons';
import { SqlpackageStatus, EnvironmentInfo, ServerVersionInfo, ThemeType } from '../types';

export interface ThemeOption {
  id: ThemeType;
  name: string;
  gradientStr: string;
  bgHex: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'theme-pure-black',
    name: 'OLED Pure Black',
    gradientStr: 'linear-gradient(90deg, #00f2fe 0%, #4facfe 100%)',
    bgHex: '#000000',
  },
  {
    id: 'theme-pure-white',
    name: 'Studio Pure White',
    gradientStr: 'linear-gradient(90deg, #0284c7 0%, #0369a1 100%)',
    bgHex: '#f8fafc',
  },
  {
    id: 'theme-monochrome-pro',
    name: 'Monochrome Pro',
    gradientStr: 'linear-gradient(90deg, #fafafa 0%, #71717a 100%)',
    bgHex: '#09090b',
  },
  {
    id: 'theme-lime-coral',
    name: 'Bio-Pulse Lime Coral',
    gradientStr: 'linear-gradient(90deg, hsla(94, 100%, 70%, 1) 0%, hsla(0, 100%, 77%, 1) 100%)',
    bgHex: '#0b0f0c',
  },
  {
    id: 'theme-mint-emerald',
    name: 'Hyper Mint Emerald',
    gradientStr: 'linear-gradient(90deg, hsla(145, 84%, 73%, 1) 0%, hsla(150, 61%, 48%, 1) 100%)',
    bgHex: '#05140b',
  },
  {
    id: 'theme-sunset-mint',
    name: 'Solar Sunset Mint',
    gradientStr: 'linear-gradient(90deg, hsla(154, 53%, 82%, 1) 0%, hsla(24, 88%, 65%, 1) 50%, hsla(216, 56%, 16%, 1) 100%)',
    bgHex: '#091118',
  },
  {
    id: 'theme-sage-plum',
    name: 'Sage Plum Monolith',
    gradientStr: 'linear-gradient(90deg, hsla(155, 23%, 71%, 1) 0%, hsla(302, 17%, 32%, 1) 100%)',
    bgHex: '#120e13',
  },
  {
    id: 'theme-olive-moss',
    name: 'Olive Moss Tactical',
    gradientStr: 'linear-gradient(90deg, hsla(64, 73%, 16%, 1) 0%, hsla(65, 59%, 31%, 1) 100%)',
    bgHex: '#141707',
  },
];

interface HeaderProps {
  status: SqlpackageStatus | null;
  onRedownload: () => void;
  envInfo: EnvironmentInfo | null;
  serverInfo: ServerVersionInfo | null;
  onOpenTour: () => void;
  onStartWalkthrough: () => void;
  isGuideModeActive: boolean;
  onToggleGuideMode: () => void;
  onOpenTransferModal: () => void;
  onOpenSchemaModal?: () => void;
  onOpenAppearanceModal?: () => void;
  currentTheme: ThemeType;
  onThemeChange: (theme: ThemeType) => void;
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
  onOpenTransferModal,
  onOpenSchemaModal,
  onOpenAppearanceModal,
  currentTheme,
  onThemeChange,
}) => {
  const osLabel = status?.os === 'win32' ? 'Windows' : status?.os === 'linux' ? 'Linux' : status?.os || 'System';
  const [isHelpMenuOpen, setIsHelpMenuOpen] = useState(false);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);

  const helpMenuRef = useRef<HTMLDivElement>(null);
  const themeMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (helpMenuRef.current && !helpMenuRef.current.contains(event.target as Node)) {
        setIsHelpMenuOpen(false);
      }
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target as Node)) {
        setIsThemeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeThemeOpt = THEME_OPTIONS.find((t) => t.id === currentTheme) || THEME_OPTIONS[0];

  return (
    <header className="bg-theme-surface/95 border-b border-theme-border px-6 py-2.5 flex items-center justify-between shadow-xl shrink-0 z-20 backdrop-blur-md">
      {/* ZONE 1: Brand Hero Group */}
      <div className="flex items-center space-x-3.5">
        <div className="relative p-1.5 bg-theme-card border-2 border-theme-accentPrimary/40 rounded-xl shadow-md overflow-hidden group">
          <img
            src="/assets/app_logo.svg"
            alt="App Logo"
            className="w-9 h-9 object-contain transition-transform group-hover:scale-105"
          />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="font-aladin text-2xl tracking-wide text-theme-text font-bold leading-none">
              <span className="text-user-gradient">MSSQL Database Migrator</span>
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-theme-card text-theme-accentPrimary rounded-md border border-theme-border shadow-xs">
              v1.9 GUI
            </span>
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-theme-accentPrimary/20 text-theme-accentPrimary rounded-md border border-theme-accentPrimary/40 shadow-xs">
              by mu42
            </span>
          </div>
          <p className="font-annie text-base text-theme-muted tracking-wide -mt-0.5">
            Enterprise SQL Server database migrations & cross-platform transfers • Developed by mu42
          </p>
        </div>
      </div>

      {/* ZONE 2: Center Telemetry Bar (Multi-Accent Pills) */}
      <div className="hidden xl:flex items-center space-x-2 bg-theme-card/60 p-1.5 rounded-xl border border-theme-border/80 shadow-inner">
        {/* OS Detector Badge */}
        <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-theme-surface border border-cyan-500/30 rounded-lg text-xs font-mono text-cyan-300">
          <HardDriveIcon className="w-3.5 h-3.5 text-cyan-400" />
          <span>OS: <strong className="text-white">{osLabel}</strong></span>
        </div>

        {/* Client Driver Badge */}
        <div
          className="flex items-center space-x-1.5 px-2.5 py-1 bg-theme-surface border border-emerald-500/30 rounded-lg text-xs font-mono text-emerald-300"
          title={`Active Client Driver: ${envInfo?.activeClientDriver || 'Tedious TDS 7.4'}${envInfo?.sqlpackageVersion ? ` | Engine: ${envInfo.sqlpackageVersion}` : ''}`}
        >
          <DriverConnectorIcon className="w-3.5 h-3.5 text-emerald-400" />
          <span>Driver: <strong className="text-white">{envInfo?.activeClientDriver?.includes('msnodesqlv8') ? 'msnodesqlv8 (Native)' : 'Tedious'}</strong></span>
        </div>

        {/* Connected DB Server Badge */}
        {serverInfo ? (
          <div
            className="flex items-center space-x-2 px-2.5 py-1 bg-theme-surface border border-amber-500/40 text-amber-300 rounded-lg text-xs font-mono shadow-md animate-in fade-in"
            title={`Connected to ${serverInfo.friendlyVersion}\nBuild: ${serverInfo.productVersion} (${serverInfo.productLevel})`}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <CheckCircleIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate max-w-[160px]">
              <strong className="text-white">{serverInfo.friendlyVersion}</strong>
            </span>
          </div>
        ) : envInfo?.localMssqlInstalled ? (
          <div
            className="flex items-center space-x-1.5 px-2.5 py-1 bg-theme-surface border border-amber-500/30 rounded-lg text-xs font-mono text-amber-300"
            title={`Local MSSQL Server installed: v${envInfo.localMssqlVersion}`}
          >
            <BakBackupIcon className="w-3.5 h-3.5 text-amber-400" />
            <span>Local DB: <strong className="text-white">{envInfo.localMssqlFriendly?.replace('SQL Server', 'MSSQL') || 'Installed'}</strong></span>
          </div>
        ) : null}

        {/* Engine Status Badge */}
        {status?.exists ? (
          <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-theme-surface border border-theme-accentPrimary/40 text-theme-accentPrimary rounded-lg text-xs font-mono">
            <ShieldCheckIcon className="w-3.5 h-3.5 text-theme-accentPrimary" />
            <span>Engine Ready</span>
            <button
              onClick={onRedownload}
              title="Re-verify engine binaries"
              className="ml-0.5 p-0.5 hover:bg-theme-border/50 rounded transition text-theme-muted hover:text-white"
            >
              <RefreshIcon className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button
            onClick={onRedownload}
            className="flex items-center space-x-1.5 px-2.5 py-1 bg-amber-500/20 border border-amber-500/50 text-amber-300 hover:bg-amber-500/30 rounded-lg text-xs font-medium transition cursor-pointer shadow-sm"
          >
            <DownloadCloudIcon className="w-3.5 h-3.5 animate-bounce" />
            <span>Acquire Engine</span>
          </button>
        )}
      </div>

      {/* ZONE 3: Right Tools & Theme Selector */}
      <div className="flex items-center space-x-2.5">
        {/* Theme & Appearance Customizer Trigger */}
        {onOpenAppearanceModal ? (
          <button
            type="button"
            onClick={onOpenAppearanceModal}
            className="flex items-center space-x-2 px-3 py-1.5 bg-theme-card hover:bg-theme-cardHover border border-theme-border rounded-xl text-xs font-medium text-theme-text transition shadow-sm hover:border-theme-accentPrimary/50 group"
            title="Open Appearance, White/Black Themes, Typography & Font Sizing Customizer"
          >
            <PaletteThemeIcon className="w-4 h-4 text-theme-accentPrimary group-hover:rotate-12 transition-transform" />
            <div className="w-3.5 h-3.5 rounded-full border border-white/40 shadow-xs" style={{ background: activeThemeOpt.gradientStr }} />
            <span className="font-mono text-[11px] hidden sm:inline">{activeThemeOpt.name}</span>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-white/10 text-theme-accentPrimary">Fonts & UI</span>
          </button>
        ) : (
          <div className="relative" ref={themeMenuRef} data-tour-theme-switcher="true">
            <button
              type="button"
              onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
              className="flex items-center space-x-2 px-3 py-1.5 bg-theme-card hover:bg-theme-cardHover border border-theme-border rounded-xl text-xs font-medium text-theme-text transition shadow-sm"
              title="Switch Theme Palette"
            >
              <PaletteThemeIcon className="w-4 h-4 text-theme-accentPrimary" />
              <div className="w-3.5 h-3.5 rounded-full border border-white/40 shadow-xs" style={{ background: activeThemeOpt.gradientStr }} />
              <span className="font-mono text-[11px] hidden sm:inline">{activeThemeOpt.name}</span>
              <ChevronDownIcon className={`w-3 h-3 text-theme-muted transition-transform ${isThemeMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {isThemeMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-theme-surface border-2 border-theme-border rounded-xl shadow-2xl p-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
                {THEME_OPTIONS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      onThemeChange(t.id);
                      setIsThemeMenuOpen(false);
                    }}
                    className="w-full text-left p-2 rounded-lg hover:bg-theme-card flex items-center gap-2 text-theme-text"
                  >
                    <div className="w-3.5 h-3.5 rounded-full shrink-0" style={{ background: t.gradientStr }} />
                    <span className="text-[11px] font-mono">{t.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Schema Visualizer Button */}
        {onOpenSchemaModal && (
          <button
            type="button"
            onClick={onOpenSchemaModal}
            data-tour-schema-visualizer="true"
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-theme-card hover:bg-theme-cardHover text-theme-text font-bold rounded-xl text-xs transition border border-theme-border shadow-xs hover:border-theme-accentPrimary/50"
            title="Explore database schema, table structures & live data"
          >
            <DatabaseScannerIcon className="w-3.5 h-3.5 text-theme-accentPrimary" />
            <span className="hidden sm:inline">Schema Visualizer</span>
          </button>
        )}

        {/* Transfer Backup Button */}
        <button
          type="button"
          onClick={onOpenTransferModal}
          data-tour-transfer-backup="true"
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-user-gradient text-white font-bold rounded-xl text-xs transition shadow-md hover:brightness-110 active:scale-95 border border-white/20 drop-shadow-sm"
          title="Transfer database backup files over Wi-Fi/Bluetooth network"
        >
          <img
            src="/assets/app_logo.svg"
            alt="App Icon"
            className="w-4 h-4 object-contain shrink-0"
          />
          <span className="text-white font-bold drop-shadow">Transfer Backup</span>
        </button>

        {/* Guide & Tour Menu */}
        <div className="relative" ref={helpMenuRef}>
          <button
            type="button"
            onClick={() => setIsHelpMenuOpen(!isHelpMenuOpen)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-theme-card hover:bg-theme-cardHover border border-theme-border rounded-xl text-xs font-medium text-theme-text transition shadow-sm"
          >
            <CompassGuideIcon className="w-3.5 h-3.5 text-theme-accentSecondary" />
            <span>Guide & Tour</span>
            <ChevronDownIcon className={`w-3 h-3 transition-transform ${isHelpMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {isHelpMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-theme-surface border-2 border-theme-border rounded-xl shadow-2xl p-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
              <button
                type="button"
                onClick={() => {
                  setIsHelpMenuOpen(false);
                  onOpenTour();
                }}
                className="w-full flex items-center space-x-2.5 px-3 py-2 text-left rounded-lg text-theme-text hover:bg-theme-card transition"
              >
                <CompassGuideIcon className="w-4 h-4 text-theme-accentPrimary" />
                <div>
                  <div className="font-semibold">Product Overview Tour</div>
                  <div className="text-[10px] text-theme-muted font-annie text-base">Feature guide & .bacpac vs .bak</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsHelpMenuOpen(false);
                  onStartWalkthrough();
                }}
                className="w-full flex items-center space-x-2.5 px-3 py-2 text-left rounded-lg text-theme-text hover:bg-theme-card transition"
              >
                <PlayIcon className="w-4 h-4 fill-current text-theme-accentSecondary" />
                <div>
                  <div className="font-semibold">Interactive Walkthrough</div>
                  <div className="text-[10px] text-theme-muted font-annie text-base">Step-by-step spotlight</div>
                </div>
              </button>

              {onOpenSchemaModal && (
                <button
                  type="button"
                  onClick={() => {
                    setIsHelpMenuOpen(false);
                    onOpenSchemaModal();
                  }}
                  className="w-full flex items-center space-x-2.5 px-3 py-2 text-left rounded-lg text-theme-text hover:bg-theme-card transition"
                >
                  <DatabaseScannerIcon className="w-4 h-4 text-emerald-400" />
                  <div>
                    <div className="font-semibold">ERD & Schema Visualizer</div>
                    <div className="text-[10px] text-theme-muted font-annie text-base">Drag & Drop ERD, PNG export & tables</div>
                  </div>
                </button>
              )}

              <div className="my-1 border-t border-theme-border" />

              <button
                type="button"
                onClick={onToggleGuideMode}
                className={`w-full flex items-center justify-between px-3 py-2 text-left rounded-lg transition ${
                  isGuideModeActive ? 'bg-theme-card text-theme-text' : 'text-theme-muted hover:bg-theme-card'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <SparkleHintIcon className="w-4 h-4 text-amber-400" />
                  <div>
                    <div className="font-semibold">Feature Hotspots</div>
                    <div className="text-[10px] text-theme-muted font-annie text-base">Show UI hints</div>
                  </div>
                </div>
                <div className={`w-8 h-4 rounded-full p-0.5 transition ${isGuideModeActive ? 'bg-user-gradient' : 'bg-theme-border'}`}>
                  <div className={`w-3 h-3 rounded-full bg-slate-950 transition-transform ${isGuideModeActive ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
