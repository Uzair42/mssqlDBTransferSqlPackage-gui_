import React, { useState, useEffect, useCallback } from 'react';
import {
  BacpacIcon,
  BakBackupIcon,
  WindowsSecurityIcon,
  SqlAuthIcon,
  WithMoveMappingIcon,
  StopProcessIcon,
  DatabaseScannerIcon,
  FolderOpenIcon,
  HardDriveIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  LoaderIcon,
  CloseIcon,
  RefreshIcon,
  EditIcon,
  ListIcon,
  ServerHostIcon,
} from './icons/FeatureIcons';
import { ConnectionConfig, ConnectionTestResult, BakFileInfo, FileMove, EnvironmentInfo, ServerVersionInfo } from '../types';
import { Hotspot } from './Hotspot';

interface ConnectionFormProps {
  config: ConnectionConfig;
  onChange: (updated: Partial<ConnectionConfig>) => void;
  onExport: () => void;
  onCancel: () => void;
  onTestConnection: () => void;
  onSelectSavePath?: () => void;
  onSelectBakFile?: () => void;
  onFetchFileList: () => void;
  isRunning: boolean;
  isTesting: boolean;
  testResult: ConnectionTestResult | null;
  onDismissTestResult: () => void;
  bakFileList: BakFileInfo[];
  fileMoves: FileMove[];
  onFileMoveChange: (moves: FileMove[]) => void;
  isFetchingFileList: boolean;
  envInfo?: EnvironmentInfo | null;
  serverInfo: ServerVersionInfo | null;
  isGuideModeActive?: boolean;
  onOpenSchemaModal?: () => void;
  onOpenAuthModal?: () => void;
  onOpenFilesModal?: (databaseName?: string) => void;
}

export const ConnectionForm: React.FC<ConnectionFormProps> = ({
  config,
  onChange,
  onExport,
  onCancel,
  onTestConnection,
  onFetchFileList,
  isRunning,
  isTesting,
  testResult,
  onDismissTestResult,
  bakFileList,
  fileMoves,
  onFileMoveChange,
  isFetchingFileList,
  serverInfo,
  isGuideModeActive = true,
  onOpenSchemaModal,
  onOpenAuthModal,
  onOpenFilesModal,
}) => {
  // Dynamic Database Listing state
  const [databases, setDatabases] = useState<string[]>([]);
  const [isFetchingDbs, setIsFetchingDbs] = useState(false);
  const [isManualDbInput, setIsManualDbInput] = useState(false);

  const handleFetchDatabases = useCallback(async () => {
    if (!window.electronAPI || !config.server) return;
    setIsFetchingDbs(true);

    try {
      const res = await window.electronAPI.fetchDatabases(config);
      if (res.success && res.databases && res.databases.length > 0) {
        setDatabases(res.databases);
        if (!config.database || !res.databases.includes(config.database)) {
          const userDbs = res.databases.filter(
            (db) => !['master', 'tempdb', 'model', 'msdb'].includes(db)
          );
          const defaultDb = userDbs.length > 0 ? userDbs[0] : res.databases[0];
          const ext = config.action === 'Backup' ? 'bak' : 'bacpac';
          onChange({
            database: defaultDb,
            targetFile: config.targetFile || `${defaultDb}_${new Date().toISOString().slice(0, 10)}.${ext}`,
          });
        }
      }
    } catch {
      // Ignored
    } finally {
      setIsFetchingDbs(false);
    }
  }, [config, onChange]);

  useEffect(() => {
    if (testResult?.success) {
      handleFetchDatabases();
    }
  }, [testResult?.success, handleFetchDatabases]);

  const isWindowsAuthSSPI = config.authType === 'windows' && !config.domain && !config.username;

  const isFormValid =
    config.server.trim() !== '' &&
    (config.action === 'Restore_Bak' || config.database.trim() !== '') &&
    (config.authType === 'windows' ? true : (config.username.trim() !== '' && config.password !== ''));

  const isExport = config.action === 'Export';
  const isImport = config.action === 'Import';
  const isBackup = config.action === 'Backup';
  const isRestoreBak = config.action === 'Restore_Bak';

  const isBacpacEngine = isExport || isImport;
  const isBakEngine = isBackup || isRestoreBak;

  const handleBrowseAction = async () => {
    if (isRestoreBak || isImport) {
      const file = await window.electronAPI?.selectOpenPath(
        isImport ? 'Select Source .bacpac File to Import' : 'Select Source .bak File to Restore'
      );
      if (file) {
        // Auto-extract database name if empty
        const baseName = file.split(/[\\/]/).pop()?.replace(/\.(bacpac|bak|zip)$/i, '').replace(/_\d{4}-\d{2}-\d{2}.*$/, '') || '';
        const updates: Partial<ConnectionConfig> = { targetFile: file };
        if (!config.database && baseName) {
          updates.database = baseName;
        }
        onChange(updates);
      }
    } else {
      const defaultExt = isBackup ? 'bak' : 'bacpac';
      const defaultName = config.database
        ? `${config.database}_${new Date().toISOString().slice(0, 10)}.${defaultExt}`
        : `DatabaseBackup_${new Date().toISOString().slice(0, 10)}.${defaultExt}`;
      const savePath = await window.electronAPI?.selectSavePath(defaultName, defaultExt);
      if (savePath) {
        onChange({ targetFile: savePath });
      }
    }
  };

  return (
    <div className="bg-theme-surface border border-theme-border rounded-2xl p-4 shadow-2xl space-y-3.5 flex flex-col justify-between h-full overflow-y-auto font-sans text-xs">
      <div className="space-y-3.5">
        
        {/* ========================================================= */}
        {/* DUAL ENGINE SELECTOR: SECTION 1 (.bacpac) & SECTION 2 (.bak) */}
        {/* ========================================================= */}
        <div data-tour-action-tabs="true" className="space-y-2 relative">
          
          {/* Section A: .bacpac DacFx Engine */}
          <div className={`p-2.5 rounded-xl border transition-all ${
            isBacpacEngine
              ? 'bg-theme-card border-theme-accentPrimary/60 shadow-md ring-1 ring-theme-accentPrimary/30'
              : 'bg-theme-bg/60 border-theme-border opacity-70 hover:opacity-100'
          }`}>
            <div className="flex items-center justify-between pb-1.5 border-b border-theme-border/60">
              <div className="flex items-center space-x-2">
                <BacpacIcon className="w-4 h-4 text-theme-accentPrimary" />
                <span className="font-aladin text-sm font-bold text-theme-text uppercase tracking-wider">
                  📦 .bacpac Migration Engine (DACPAC / BACPAC)
                </span>
              </div>
              <span className="text-[9px] font-mono font-bold bg-theme-accentPrimary/20 text-theme-accentPrimary px-2 py-0.5 rounded border border-theme-accentPrimary/40">
                Cross-Platform & Version Downgrade
              </span>
            </div>

            <p className="font-annie text-base text-theme-muted tracking-wide pt-1 pb-2">
              Exports full schema & data into a portable, version-independent package. Perfect for moving between Linux ↔ Windows and cross-version migrations.
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  const defaultFile = config.database
                    ? `${config.database}_${new Date().toISOString().slice(0, 10)}.bacpac`
                    : '';
                  onChange({ action: 'Export', targetFile: defaultFile });
                }}
                className={`py-2 px-2 rounded-xl text-xs font-aladin tracking-wider transition flex items-center justify-center space-x-1.5 shadow-sm ${
                  isExport
                    ? 'bg-[var(--theme-badge-export)] text-slate-950 font-extrabold ring-2 ring-white/20'
                    : 'bg-theme-surface hover:bg-theme-card text-theme-text border border-theme-border font-medium'
                }`}
              >
                <BacpacIcon className="w-3.5 h-3.5 shrink-0" />
                <span>1. Export .bacpac (Schema + Data)</span>
              </button>

              <button
                type="button"
                onClick={() => onChange({ action: 'Import' })}
                className={`py-2 px-2 rounded-xl text-xs font-aladin tracking-wider transition flex items-center justify-center space-x-1.5 shadow-sm ${
                  isImport
                    ? 'bg-[var(--theme-badge-import)] text-slate-950 font-extrabold ring-2 ring-white/20'
                    : 'bg-theme-surface hover:bg-theme-card text-theme-text border border-theme-border font-medium'
                }`}
              >
                <BacpacIcon className="w-3.5 h-3.5 shrink-0" />
                <span>2. Import .bacpac (Restore DB)</span>
              </button>
            </div>
          </div>

          {/* Section B: .bak Native SQL Server Engine */}
          <div className={`p-2.5 rounded-xl border transition-all ${
            isBakEngine
              ? 'bg-theme-card border-theme-accentPrimary/60 shadow-md ring-1 ring-theme-accentPrimary/30'
              : 'bg-theme-bg/60 border-theme-border opacity-70 hover:opacity-100'
          }`}>
            <div className="flex items-center justify-between pb-1.5 border-b border-theme-border/60">
              <div className="flex items-center space-x-2">
                <BakBackupIcon className="w-4 h-4 text-[var(--theme-badge-backup)]" />
                <span className="font-aladin text-sm font-bold text-theme-text uppercase tracking-wider">
                  💾 .bak Native SQL Server Engine (T-SQL Disk Engine)
                </span>
              </div>
              <span className="text-[9px] font-mono font-bold bg-[var(--theme-badge-backup)]/20 text-[var(--theme-badge-backup)] px-2 py-0.5 rounded border border-[var(--theme-badge-backup)]/40">
                High-Speed Binary Snapshot
              </span>
            </div>

            <p className="font-annie text-base text-theme-muted tracking-wide pt-1 pb-2">
              Executes instant server-side binary BACKUP and RESTORE with automatic WITH MOVE logical data (.mdf) & log (.ldf) relocation.
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  const defaultFile = config.database
                    ? `${config.database}_${new Date().toISOString().slice(0, 10)}.bak`
                    : '';
                  onChange({ action: 'Backup', targetFile: defaultFile });
                }}
                className={`py-2 px-2 rounded-xl text-xs font-aladin tracking-wider transition flex items-center justify-center space-x-1.5 shadow-sm ${
                  isBackup
                    ? 'bg-[var(--theme-badge-backup)] text-slate-950 font-extrabold ring-2 ring-white/20'
                    : 'bg-theme-surface hover:bg-theme-card text-theme-text border border-theme-border font-medium'
                }`}
              >
                <BakBackupIcon className="w-3.5 h-3.5 shrink-0" />
                <span>3. Backup .bak (Disk Snapshot)</span>
              </button>

              <button
                type="button"
                onClick={() => onChange({ action: 'Restore_Bak' })}
                className={`py-2 px-2 rounded-xl text-xs font-aladin tracking-wider transition flex items-center justify-center space-x-1.5 shadow-sm ${
                  isRestoreBak
                    ? 'bg-[var(--theme-badge-restore)] text-slate-950 font-extrabold ring-2 ring-white/20'
                    : 'bg-theme-surface hover:bg-theme-card text-theme-text border border-theme-border font-medium'
                }`}
              >
                <WithMoveMappingIcon className="w-3.5 h-3.5 shrink-0" />
                <span>4. Restore .bak (WITH MOVE)</span>
              </button>
            </div>
          </div>

          <div className="absolute -top-1 -right-1">
            <Hotspot
              isActive={isGuideModeActive}
              title="Dual Migration Engines"
              description="Use .bacpac for schema+data version compatibility. Use .bak for high-speed direct disk backups."
              tip="Both engines are fully supported on Linux and Windows."
              position="bottom"
            />
          </div>
        </div>

        {/* CARD 2: Server & Authentication Quick Bar */}
        <div className="p-3 bg-theme-card border border-theme-border rounded-xl space-y-2 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ServerHostIcon className="w-4 h-4 text-theme-accentPrimary" />
              <span className="font-aladin text-sm font-bold text-theme-text uppercase tracking-wider">
                Connection & Credentials
              </span>
            </div>

            {onOpenAuthModal && (
              <button
                type="button"
                onClick={onOpenAuthModal}
                className="px-2.5 py-1 bg-theme-surface hover:bg-theme-cardHover border border-theme-accentPrimary/50 text-theme-accentPrimary rounded-lg text-xs font-bold transition flex items-center space-x-1 shadow-2xs"
                title="Configure host, port, SQL Auth & Windows SSPI"
              >
                <span>⚙️ Auth Settings</span>
              </button>
            )}
          </div>

          {/* Connection Summary Pill */}
          <div className="p-2 bg-theme-bg border border-theme-border rounded-lg flex items-center justify-between font-mono text-[11px] text-theme-text">
            <div className="flex items-center space-x-2 truncate">
              {config.authType === 'windows' ? (
                <WindowsSecurityIcon className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              ) : (
                <SqlAuthIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              )}
              <span className="font-semibold text-white truncate">
                {config.authType === 'windows'
                  ? isWindowsAuthSSPI
                    ? 'Windows SSPI'
                    : `Domain\\${config.username || 'User'}`
                  : `${config.username || 'sa'}`}
              </span>
              <span className="text-theme-muted">@</span>
              <span className="text-emerald-300 truncate font-bold">
                {config.server || 'localhost'}:{config.port || '1433'}
              </span>
            </div>

            <button
              type="button"
              onClick={onTestConnection}
              disabled={isTesting || !config.server}
              className="text-[10px] text-theme-accentPrimary hover:underline flex items-center space-x-1 shrink-0 ml-2 font-bold"
            >
              <RefreshIcon className={`w-3 h-3 ${isTesting ? 'animate-spin' : ''}`} />
              <span>{isTesting ? 'Testing...' : 'Test'}</span>
            </button>
          </div>
        </div>

        {/* Server Telemetry Badge */}
        {serverInfo && (
          <div className="p-2.5 bg-theme-card/60 border border-theme-border rounded-xl space-y-1 text-[10px] font-mono animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-emerald-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Connected: {serverInfo.friendlyVersion}</span>
              </div>
              <span className="text-theme-muted">SPID #{serverInfo.spid || 'Active'}</span>
            </div>
            <div className="text-theme-muted truncate">
              Driver: {serverInfo.activeDriver.split('(')[0].trim()} | Machine: {serverInfo.machineName || config.server}
            </div>
          </div>
        )}

        {/* Test Result Banner */}
        {testResult && (
          <div
            className={`p-2.5 rounded-xl border space-y-1 relative animate-in fade-in duration-150 ${
              testResult.success
                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                : 'bg-red-950/30 border-red-500/40 text-red-300'
            }`}
          >
            <button
              onClick={onDismissTestResult}
              className="absolute right-2 top-2 p-1 rounded text-theme-muted hover:text-white"
            >
              <CloseIcon className="w-3.5 h-3.5" />
            </button>
            <div className="flex items-center space-x-2 font-bold text-xs font-aladin">
              {testResult.success ? (
                <CheckCircleIcon className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangleIcon className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span className="text-base">{testResult.message}</span>
            </div>
            {testResult.details && (
              <p className="text-[10px] font-mono text-theme-text whitespace-pre-wrap pl-6 leading-tight">
                {testResult.details}
              </p>
            )}
          </div>
        )}

        {/* CARD 3: Database & File Target Section */}
        <div data-tour-db-select="true" className="space-y-2.5 border border-theme-border rounded-xl p-3.5 bg-theme-card relative">
          
          {/* Database Selector with Physical Files Inspector */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-medium text-theme-text flex items-center space-x-1.5">
                <DatabaseScannerIcon className="w-3.5 h-3.5 text-theme-accentSecondary" />
                <span>{isImport || isRestoreBak ? 'Target Database Name' : 'Source Database Name'}</span>{' '}
                <span className="text-emerald-400">*</span>
              </label>

              <div className="flex items-center space-x-2">
                {!isRestoreBak && (
                  <>
                    <button
                      type="button"
                      onClick={handleFetchDatabases}
                      disabled={isFetchingDbs || !config.server}
                      className="text-[10px] text-theme-accentPrimary hover:underline flex items-center space-x-1 disabled:opacity-50 font-mono"
                    >
                      <RefreshIcon className={`w-3 h-3 ${isFetchingDbs ? 'animate-spin' : ''}`} />
                      <span>{isFetchingDbs ? 'Fetching...' : 'Fetch DBs'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsManualDbInput(!isManualDbInput)}
                      className="text-[10px] text-theme-muted hover:text-theme-text"
                      title={isManualDbInput ? 'Switch to Dropdown' : 'Manual Name Input'}
                    >
                      {isManualDbInput ? <ListIcon className="w-3 h-3" /> : <EditIcon className="w-3 h-3" />}
                    </button>
                  </>
                )}
              </div>
            </div>

            {!isRestoreBak && !isManualDbInput && databases.length > 0 ? (
              <select
                value={config.database}
                onChange={(e) => {
                  const selectedDb = e.target.value;
                  const ext = isBackup ? 'bak' : 'bacpac';
                  onChange({
                    database: selectedDb,
                    targetFile: config.targetFile || `${selectedDb}_${new Date().toISOString().slice(0, 10)}.${ext}`,
                  });
                }}
                className="w-full bg-theme-bg border border-theme-border focus:border-theme-accentPrimary rounded-xl px-3 py-2 text-xs text-theme-text focus:outline-none font-mono"
              >
                {databases.map((db: string) => (
                  <option key={db} value={db}>{db}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={config.database}
                onChange={(e) => onChange({ database: e.target.value })}
                placeholder={isRestoreBak ? 'e.g. MyDatabase_Restored' : 'e.g. CompanyForm'}
                className="w-full bg-theme-bg border border-theme-border focus:border-theme-accentPrimary rounded-xl px-3 py-2 text-xs text-theme-text placeholder-theme-muted focus:outline-none font-mono"
              />
            )}

            {/* Inspect Physical Files & Schema Visualizer Bar */}
            {config.database && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                {onOpenFilesModal && (
                  <button
                    type="button"
                    onClick={() => onOpenFilesModal(config.database)}
                    className="py-1.5 px-2 bg-theme-bg hover:bg-theme-surface text-theme-text border border-theme-border rounded-lg text-[11px] font-semibold flex items-center justify-center space-x-1.5 transition shadow-2xs hover:border-theme-accentPrimary"
                    title="Inspect .mdf (Data File) & .ldf (Log File) disk locations"
                  >
                    <HardDriveIcon className="w-3.5 h-3.5 text-emerald-400" />
                    <span>📁 Storage Files (.mdf/.ldf)</span>
                  </button>
                )}

                {onOpenSchemaModal && (
                  <button
                    type="button"
                    onClick={onOpenSchemaModal}
                    className="py-1.5 px-2 bg-theme-bg hover:bg-theme-surface text-theme-accentPrimary border border-theme-accentPrimary/40 rounded-lg text-[11px] font-semibold flex items-center justify-center space-x-1.5 transition shadow-2xs hover:border-theme-accentPrimary"
                    title="Inspect tables, columns, foreign keys & interactive ERD"
                  >
                    <DatabaseScannerIcon className="w-3.5 h-3.5" />
                    <span>📊 Schema & ERD</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Backup / Target File Location */}
          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-theme-text">
              {isBackup
                ? 'Destination .bak File Location'
                : isRestoreBak
                ? 'Select .bak Backup File to Restore'
                : isExport
                ? 'Destination .bacpac Location'
                : 'Source .bacpac Archive to Restore'}{' '}
              <span className="text-emerald-400">*</span>
            </label>

            <div className="flex space-x-2">
              <input
                type="text"
                value={config.targetFile}
                onChange={(e) => onChange({ targetFile: e.target.value })}
                placeholder={
                  isRestoreBak || isImport
                    ? 'Click Browse to select backup file (.bacpac or .bak)...'
                    : 'Destination file path...'
                }
                className="flex-1 bg-theme-bg border border-theme-border focus:border-theme-accentPrimary rounded-xl px-3 py-2 text-xs text-theme-text placeholder-theme-muted focus:outline-none font-mono truncate"
              />
              <button
                type="button"
                onClick={handleBrowseAction}
                className="px-3.5 py-2 bg-theme-bg hover:bg-theme-surface text-theme-text rounded-xl border border-theme-border text-xs font-semibold flex items-center space-x-1.5 shrink-0 transition"
              >
                <FolderOpenIcon className="w-3.5 h-3.5 text-theme-accentPrimary" />
                <span>Browse</span>
              </button>
            </div>
          </div>
        </div>

        {/* RESTORE .BAK LOGICAL FILE LIST VIEW */}
        {isRestoreBak && (
          <div className="space-y-2 border border-theme-border rounded-xl p-3 bg-theme-card relative">
            <div className="flex items-center justify-between border-b border-theme-border pb-1.5">
              <div className="flex items-center space-x-1.5">
                <WithMoveMappingIcon className="w-3.5 h-3.5 text-[var(--theme-badge-restore)]" />
                <span className="font-aladin text-base text-theme-text">
                  Logical File Layout (WITH MOVE)
                </span>
              </div>
              <button
                type="button"
                onClick={onFetchFileList}
                disabled={isFetchingFileList || !config.targetFile}
                className="text-[10px] text-theme-accentPrimary hover:underline flex items-center space-x-1 disabled:opacity-50 font-mono"
              >
                <RefreshIcon className={`w-3 h-3 ${isFetchingFileList ? 'animate-spin' : ''}`} />
                <span>Read File List</span>
              </button>
            </div>

            {isFetchingFileList ? (
              <div className="py-4 text-center text-theme-muted flex items-center justify-center space-x-2 font-mono">
                <LoaderIcon className="w-4 h-4 animate-spin text-theme-accentPrimary" />
                <span>Reading logical file header from .bak...</span>
              </div>
            ) : bakFileList.length > 0 ? (
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {fileMoves.map((move, idx) => {
                  const bakInfo = bakFileList[idx];
                  return (
                    <div key={move.logicalName} className="p-2 bg-theme-bg border border-theme-border rounded-lg space-y-1 font-mono text-[10px]">
                      <div className="flex items-center justify-between text-theme-text font-bold">
                        <span>Logical: {move.logicalName} ({bakInfo?.type === 'L' ? 'LOG' : 'DATA'})</span>
                        <span className="text-[9px] text-theme-muted">Original: {bakInfo?.physicalName}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-theme-text">
                        <span>➜ Target:</span>
                        <input
                          type="text"
                          value={move.targetPath}
                          onChange={(e) => {
                            const updated = [...fileMoves];
                            updated[idx].targetPath = e.target.value;
                            onFileMoveChange(updated);
                          }}
                          className="flex-1 bg-theme-card border border-theme-border rounded px-1.5 py-0.5 text-theme-text focus:outline-none text-[10px]"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="font-annie text-base text-theme-muted py-2 text-center">
                Select a .bak file to auto-detect database logical file names & generate OS-specific file move rules.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Primary Action Launch Control Bar */}
      <div data-tour-run-button="true" className="pt-2 border-t border-theme-border space-y-2">
        {!isRunning ? (
          <button
            type="button"
            disabled={!isFormValid}
            onClick={onExport}
            className={`w-full py-2.5 px-4 rounded-xl text-base font-aladin tracking-wider transition flex items-center justify-center space-x-2 shadow-xl ${
              isFormValid
                ? 'bg-user-gradient text-white font-bold border border-white/20 drop-shadow-sm hover:brightness-110 active:scale-[0.99]'
                : 'bg-theme-bg text-theme-muted cursor-not-allowed border border-theme-border'
            }`}
          >
            {isExport ? (
              <>
                <BacpacIcon className="w-4 h-4" />
                <span>Export Database to .bacpac</span>
              </>
            ) : isImport ? (
              <>
                <BacpacIcon className="w-4 h-4" />
                <span>Import / Restore .bacpac to Server</span>
              </>
            ) : isBackup ? (
              <>
                <BakBackupIcon className="w-4 h-4" />
                <span>Execute BACKUP DATABASE (.bak)</span>
              </>
            ) : (
              <>
                <WithMoveMappingIcon className="w-4 h-4" />
                <span>Execute RESTORE DATABASE WITH MOVE</span>
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={onCancel}
            className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-500 text-white rounded-xl text-base font-aladin tracking-wider transition flex items-center justify-center space-x-2 shadow-xl animate-pulse"
          >
            <StopProcessIcon className="w-4 h-4" />
            <span>Cancel Active Operation</span>
          </button>
        )}
      </div>
    </div>
  );
};
