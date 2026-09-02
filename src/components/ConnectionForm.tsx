import React, { useState, useEffect, useCallback } from 'react';
import {
  BacpacIcon,
  BakBackupIcon,
  WindowsSecurityIcon,
  SqlAuthIcon,
  WithMoveMappingIcon,
  TrustCertIcon,
  StopProcessIcon,
  DatabaseScannerIcon,
  DriverConnectorIcon,
  SessionThreadIcon,
  FolderOpenIcon,
  EyeIcon,
  EyeOffIcon,
  UserIcon,
  LockIcon,
  HashIcon,
  ActivityPulseIcon,
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
  onSelectSavePath: () => void;
  onSelectBakFile: () => void;
  onFetchFileList: () => void;
  isRunning: boolean;
  isTesting: boolean;
  testResult: ConnectionTestResult | null;
  onDismissTestResult: () => void;
  bakFileList: BakFileInfo[];
  fileMoves: FileMove[];
  onFileMoveChange: (moves: FileMove[]) => void;
  isFetchingFileList: boolean;
  envInfo: EnvironmentInfo | null;
  serverInfo: ServerVersionInfo | null;
  isGuideModeActive?: boolean;
  onOpenSchemaModal?: () => void;
}

export const ConnectionForm: React.FC<ConnectionFormProps> = ({
  config,
  onChange,
  onExport,
  onCancel,
  onTestConnection,
  onSelectSavePath,
  onSelectBakFile,
  onFetchFileList,
  isRunning,
  isTesting,
  testResult,
  onDismissTestResult,
  bakFileList,
  fileMoves,
  onFileMoveChange,
  isFetchingFileList,
  envInfo,
  serverInfo,
  isGuideModeActive = true,
  onOpenSchemaModal,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showFullVersion, setShowFullVersion] = useState(false);
  const [specifyDomainUser, setSpecifyDomainUser] = useState(Boolean(config.domain || (config.authType === 'windows' && config.username)));

  // Dynamic Database Listing state
  const [databases, setDatabases] = useState<string[]>([]);
  const [isFetchingDbs, setIsFetchingDbs] = useState(false);
  const [isManualDbInput, setIsManualDbInput] = useState(false);

  const handleAuthTypeChange = (type: 'sql' | 'windows') => {
    onChange({
      authType: type,
      useCurrentWindowsUser: type === 'windows' && !specifyDomainUser,
    });
  };

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
            targetFile: `${defaultDb}_${new Date().toISOString().slice(0, 10)}.${ext}`,
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

  const isWindowsAuthSSPI = config.authType === 'windows' && !specifyDomainUser;

  const isFormValid =
    config.server.trim() !== '' &&
    (config.action === 'Restore_Bak' || config.database.trim() !== '') &&
    (isWindowsAuthSSPI ||
      (config.authType === 'windows' && specifyDomainUser ? config.username.trim() !== '' : (config.username.trim() !== '' && config.password !== '')));

  const isExport = config.action === 'Export';
  const isImport = config.action === 'Import';
  const isBackup = config.action === 'Backup';
  const isRestoreBak = config.action === 'Restore_Bak';

  return (
    <div className="bg-theme-surface border border-theme-border rounded-2xl p-4 shadow-2xl space-y-3.5 flex flex-col justify-between h-full overflow-y-auto font-sans text-xs">
      <div className="space-y-3.5">
        {/* CARD 1: 4 Operation Mode Tabs with Color-Coded Accents */}
        <div data-tour-action-tabs="true" className="relative">
          <div className="grid grid-cols-4 gap-1 p-1 bg-theme-bg border border-theme-border rounded-xl">
            <button
              type="button"
              onClick={() => {
                const defaultFile = config.database
                  ? `${config.database}_${new Date().toISOString().slice(0, 10)}.bacpac`
                  : '';
                onChange({ action: 'Export', targetFile: defaultFile });
              }}
              className={`py-1.5 px-1 rounded-lg text-sm font-aladin transition flex items-center justify-center space-x-1 ${
                isExport
                  ? 'bg-[var(--theme-badge-export)] text-slate-950 font-extrabold shadow-md'
                  : 'text-theme-muted hover:text-theme-text font-medium'
              }`}
            >
              <BacpacIcon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Export .bacpac</span>
            </button>

            <button
              type="button"
              onClick={() => onChange({ action: 'Import' })}
              className={`py-1.5 px-1 rounded-lg text-sm font-aladin transition flex items-center justify-center space-x-1 ${
                isImport
                  ? 'bg-[var(--theme-badge-import)] text-slate-950 font-extrabold shadow-md'
                  : 'text-theme-muted hover:text-theme-text font-medium'
              }`}
            >
              <BacpacIcon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Import .bacpac</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const defaultFile = config.database
                  ? `${config.database}_${new Date().toISOString().slice(0, 10)}.bak`
                  : '';
                onChange({ action: 'Backup', targetFile: defaultFile });
              }}
              className={`py-1.5 px-1 rounded-lg text-sm font-aladin transition flex items-center justify-center space-x-1 ${
                isBackup
                  ? 'bg-[var(--theme-badge-backup)] text-slate-950 font-extrabold shadow-md'
                  : 'text-theme-muted hover:text-theme-text font-medium'
              }`}
            >
              <BakBackupIcon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Backup .bak</span>
            </button>

            <button
              type="button"
              onClick={() => onChange({ action: 'Restore_Bak' })}
              className={`py-1.5 px-1 rounded-lg text-sm font-aladin transition flex items-center justify-center space-x-1 ${
                isRestoreBak
                  ? 'bg-[var(--theme-badge-restore)] text-slate-950 font-extrabold shadow-md'
                  : 'text-theme-muted hover:text-theme-text font-medium'
              }`}
            >
              <WithMoveMappingIcon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Restore .bak</span>
            </button>
          </div>

          <div className="absolute -top-1.5 -right-1.5">
            <Hotspot
              isActive={isGuideModeActive}
              title="Operation Mode"
              description=".bacpac extracts schema + data for seamless version downgrades. .bak performs physical byte backups on the server."
              tip="Use .bacpac if migrating from MSSQL 2022 to 2014/2016."
              position="bottom"
            />
          </div>
        </div>

        {/* Tab Description Callouts with Annie Font */}
        {isBackup && (
          <div className="p-2.5 bg-theme-card border-l-4 border-l-[var(--theme-badge-backup)] border-theme-border rounded-xl text-theme-text text-xs leading-relaxed flex items-start space-x-2">
            <BakBackupIcon className="w-4 h-4 text-[var(--theme-badge-backup)] shrink-0 mt-0.5" />
            <span className="font-annie text-base">
              <strong>Native T-SQL BACKUP DATABASE:</strong> Creates a full binary `.bak` backup directly on the SQL Server host. Fast and preserves transaction log structure.
            </span>
          </div>
        )}

        {isRestoreBak && (
          <div className="p-2.5 bg-theme-card border-l-4 border-l-[var(--theme-badge-restore)] border-theme-border rounded-xl text-theme-text text-xs leading-relaxed flex items-start space-x-2">
            <WithMoveMappingIcon className="w-4 h-4 text-[var(--theme-badge-restore)] shrink-0 mt-0.5" />
            <span className="font-annie text-base">
              <strong>Native T-SQL RESTORE WITH MOVE:</strong> Reads logical names from `.bak` via `RESTORE FILELISTONLY` and automatically maps file paths to the target OS format (Linux `/var/opt/mssql/data` or Windows).
            </span>
          </div>
        )}

        {/* CARD 2: Server Telemetry Panel */}
        {serverInfo ? (
          <div className="p-3 bg-theme-card border border-theme-border rounded-xl space-y-2 shadow-lg animate-in fade-in duration-300">
            <div className="flex items-center justify-between border-b border-theme-border/80 pb-1.5">
              <div className="flex items-center space-x-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="font-aladin text-base text-theme-text uppercase tracking-wider">
                  Connected MSSQL & Active Session Driver
                </span>
              </div>
              <span className="text-[10px] font-mono text-theme-accentPrimary bg-theme-bg px-2 py-0.5 rounded border border-theme-border flex items-center space-x-1">
                <SessionThreadIcon className="w-3 h-3 inline" />
                <span>SPID #{serverInfo.spid || 'Active'}</span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
              <div className="bg-theme-bg p-2 rounded-lg border border-theme-border space-y-0.5">
                <div className="text-amber-400 text-[9px] font-bold uppercase">Connected Database Engine</div>
                <div className="text-theme-text font-bold text-[11px] truncate" title={serverInfo.friendlyVersion}>
                  {serverInfo.friendlyVersion}
                </div>
                <div className="text-theme-muted text-[9px] truncate">
                  Build {serverInfo.productVersion} ({serverInfo.productLevel || 'RTM'})
                </div>
              </div>

              <div className="bg-theme-bg p-2 rounded-lg border border-theme-border space-y-0.5">
                <div className="text-emerald-400 text-[9px] font-bold uppercase flex items-center space-x-1">
                  <DriverConnectorIcon className="w-3 h-3 text-emerald-400" />
                  <span>Active TDS Driver</span>
                </div>
                <div className="text-theme-text font-bold text-[11px] truncate">
                  {serverInfo.activeDriver.split('(')[0].trim()}
                </div>
                <div className="text-theme-muted text-[9px] truncate" title={serverInfo.engineDriver}>
                  Engine: {serverInfo.engineDriver.split('(')[0].trim()}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-theme-muted pt-1">
              <span>Host: <strong className="text-theme-text font-mono">{serverInfo.machineName || config.server}:{config.port || '1433'}</strong></span>
              <button
                type="button"
                onClick={() => setShowFullVersion(!showFullVersion)}
                className="text-[10px] text-theme-accentPrimary hover:underline"
              >
                {showFullVersion ? 'Hide Details' : 'View Full @@VERSION'}
              </button>
            </div>

            {showFullVersion && (
              <div className="mt-2 p-2 bg-theme-bg border border-theme-border rounded-lg text-[9px] font-mono text-theme-text whitespace-pre-wrap max-h-24 overflow-y-auto select-text leading-tight">
                {serverInfo.fullVersion}
              </div>
            )}
          </div>
        ) : (
          <div className="p-2.5 bg-theme-card/60 border border-theme-border rounded-xl space-y-2">
            <div className="flex items-center justify-between border-b border-theme-border/80 pb-1">
              <div className="flex items-center space-x-1.5">
                <DriverConnectorIcon className="w-3.5 h-3.5 text-theme-accentPrimary" />
                <span className="font-aladin text-sm text-theme-text uppercase tracking-wider">
                  Installed Engine & Driver Status (Pre-Connection)
                </span>
              </div>
              <span className="text-[9px] font-mono text-emerald-400 bg-theme-bg px-1.5 py-0.5 rounded border border-theme-border">
                Ready to Connect
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
              <div className="bg-theme-bg p-2 rounded-lg border border-theme-border space-y-0.5">
                <div className="text-amber-400 text-[9px] font-bold uppercase flex items-center space-x-1">
                  <BakBackupIcon className="w-3 h-3 text-amber-400" />
                  <span>Local MSSQL Engine</span>
                </div>
                <div className="text-theme-text font-semibold truncate" title={envInfo?.localMssqlVersion || 'Not installed'}>
                  {envInfo?.localMssqlInstalled
                    ? (envInfo.localMssqlFriendly || `v${envInfo.localMssqlVersion}`)
                    : 'Not installed locally'}
                </div>
                <div className="text-[9px] text-theme-muted">
                  {envInfo?.localMssqlInstalled
                    ? `Status: ${envInfo.localMssqlStatus === 'active' ? '● Service Active' : '○ Inactive'}`
                    : 'Targeting remote host'}
                </div>
              </div>

              <div className="bg-theme-bg p-2 rounded-lg border border-theme-border space-y-0.5">
                <div className="text-emerald-400 text-[9px] font-bold uppercase flex items-center space-x-1">
                  <DriverConnectorIcon className="w-3 h-3 text-emerald-400" />
                  <span>Active Driver (In Use)</span>
                </div>
                <div className="text-theme-text font-semibold truncate">
                  Tedious v20.0 (TDS 7.4)
                </div>
                <div className="text-[9px] text-theme-muted truncate" title={envInfo?.sqlpackageVersion || 'SqlPackage CLI'}>
                  {envInfo?.sqlpackageVersion || 'SqlPackage v170.4 (DacFx)'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Test Result Banner */}
        {testResult && (
          <div
            className={`p-2.5 rounded-xl border space-y-1 relative ${
              testResult.success
                ? 'bg-theme-card border-emerald-500 text-emerald-300'
                : 'bg-theme-card border-red-500 text-red-300'
            }`}
          >
            <button
              onClick={onDismissTestResult}
              className="absolute right-2 top-2 p-1 rounded text-theme-muted hover:text-theme-text"
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
              <p className="text-[10px] font-mono text-theme-text whitespace-pre-wrap pl-6">
                {testResult.details}
              </p>
            )}
          </div>
        )}

        {/* CARD 3: Server & Authentication Section */}
        <div data-tour-server-auth="true" className="space-y-2.5 border border-theme-border rounded-xl p-3.5 bg-theme-card relative">
          <div className="flex items-center justify-between border-b border-theme-border pb-1.5">
            <div className="flex items-center space-x-2">
              <ServerHostIcon className="w-4 h-4 text-theme-accentPrimary" />
              <h2 className="font-aladin text-base font-bold text-theme-text uppercase tracking-wider">
                {isExport
                  ? 'Export Source Server'
                  : isImport
                  ? 'Target Restore Server'
                  : isBackup
                  ? 'MSSQL Backup Source'
                  : 'MSSQL Restore Target'}
              </h2>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="text-[10px] font-mono text-theme-muted">
                {isBackup || isRestoreBak ? 'T-SQL Engine' : 'sqlpackage Engine'}
              </span>
              <Hotspot
                isActive={isGuideModeActive}
                title="Server Connection"
                description="Supports local instances, remote hosts, Azure SQL, and Docker container ports."
                position="left"
              />
            </div>
          </div>

          {/* Server Host & Port */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2 space-y-1">
              <label className="block text-[11px] font-medium text-theme-text">
                Server Host / IP <span className="text-emerald-400">*</span>
              </label>
              <input
                type="text"
                value={config.server}
                onChange={(e) => onChange({ server: e.target.value })}
                placeholder="localhost or 192.168.1.10"
                className="w-full bg-theme-bg border border-theme-border focus:border-theme-accentPrimary rounded-lg px-2.5 py-1.5 text-xs text-theme-text placeholder-theme-muted focus:outline-none font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-theme-text flex items-center space-x-1">
                <HashIcon className="w-3 h-3 text-theme-muted" />
                <span>Port</span>
              </label>
              <input
                type="text"
                value={config.port}
                onChange={(e) => onChange({ port: e.target.value })}
                placeholder="1433"
                className="w-full bg-theme-bg border border-theme-border focus:border-theme-accentPrimary rounded-lg px-2.5 py-1.5 text-xs text-theme-text placeholder-theme-muted focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* Auth Mode Tabs */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-medium text-theme-text">
                Authentication Mode
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2 p-1 bg-theme-bg border border-theme-border rounded-lg">
              <button
                type="button"
                onClick={() => handleAuthTypeChange('sql')}
                className={`py-1.5 px-2 rounded-md text-[11px] font-semibold transition flex items-center justify-center space-x-1.5 ${
                  config.authType === 'sql'
                    ? 'bg-theme-card text-theme-accentPrimary font-bold border border-theme-accentPrimary/50 shadow-sm'
                    : 'text-theme-muted hover:text-theme-text font-medium'
                }`}
              >
                <SqlAuthIcon className="w-3.5 h-3.5" />
                <span>SQL Server Auth</span>
              </button>
              <button
                type="button"
                onClick={() => handleAuthTypeChange('windows')}
                className={`py-1.5 px-2 rounded-md text-[11px] font-semibold transition flex items-center justify-center space-x-1.5 ${
                  config.authType === 'windows'
                    ? 'bg-theme-card text-theme-accentPrimary font-bold border border-theme-accentPrimary/50 shadow-sm'
                    : 'text-theme-muted hover:text-theme-text font-medium'
                }`}
              >
                <WindowsSecurityIcon className="w-3.5 h-3.5" />
                <span>Windows Auth (SSPI)</span>
              </button>
            </div>
          </div>

          {/* SQL Server Auth Inputs */}
          {config.authType === 'sql' && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-theme-text flex items-center space-x-1">
                  <UserIcon className="w-3 h-3 text-theme-muted" />
                  <span>Username</span> <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  value={config.username}
                  onChange={(e) => onChange({ username: e.target.value })}
                  placeholder="sa"
                  className="w-full bg-theme-bg border border-theme-border focus:border-theme-accentPrimary rounded-lg px-2.5 py-1.5 text-xs text-theme-text placeholder-theme-muted focus:outline-none font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-theme-text flex items-center space-x-1">
                  <LockIcon className="w-3 h-3 text-theme-muted" />
                  <span>Password</span> <span className="text-emerald-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={config.password}
                    onChange={(e) => onChange({ password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full bg-theme-bg border border-theme-border focus:border-theme-accentPrimary rounded-lg pl-2.5 pr-7 py-1.5 text-xs text-theme-text placeholder-theme-muted focus:outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-2 text-theme-muted hover:text-theme-text"
                  >
                    {showPassword ? <EyeOffIcon className="w-3.5 h-3.5" /> : <EyeIcon className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Windows Auth Options */}
          {config.authType === 'windows' && (
            <div className="space-y-2 p-2.5 bg-theme-bg border border-theme-border rounded-lg text-theme-text">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <WindowsSecurityIcon className="w-4 h-4 text-theme-accentPrimary shrink-0" />
                  <span className="font-semibold text-theme-text">
                    {specifyDomainUser ? 'Domain / NTLM User' : 'Windows Integrated Security (SSPI)'}
                  </span>
                </div>
                <label className="flex items-center space-x-1.5 text-[10px] text-theme-muted cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={specifyDomainUser}
                    onChange={(e) => {
                      setSpecifyDomainUser(e.target.checked);
                      onChange({
                        useCurrentWindowsUser: !e.target.checked,
                        domain: e.target.checked ? (config.domain || '') : undefined,
                      });
                    }}
                    className="rounded bg-theme-card border-theme-border text-theme-accentPrimary focus:ring-0"
                  />
                  <span>Specify Domain User</span>
                </label>
              </div>

              {!specifyDomainUser ? (
                <p className="font-annie text-base text-theme-muted leading-snug">
                  Automatically uses current Windows SSPI credentials with zero password hassle.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div className="space-y-0.5">
                    <label className="text-[10px] text-theme-muted">Domain</label>
                    <input
                      type="text"
                      value={config.domain || ''}
                      onChange={(e) => onChange({ domain: e.target.value })}
                      placeholder="MYDOMAIN"
                      className="w-full bg-theme-card border border-theme-border focus:border-theme-accentPrimary rounded px-2 py-1 text-xs text-theme-text font-mono focus:outline-none"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="text-[10px] text-theme-muted">Username *</label>
                    <input
                      type="text"
                      value={config.username}
                      onChange={(e) => onChange({ username: e.target.value })}
                      placeholder="john.doe"
                      className="w-full bg-theme-card border border-theme-border focus:border-theme-accentPrimary rounded px-2 py-1 text-xs text-theme-text font-mono focus:outline-none"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="text-[10px] text-theme-muted">Password</label>
                    <input
                      type="password"
                      value={config.password}
                      onChange={(e) => onChange({ password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full bg-theme-card border border-theme-border focus:border-theme-accentPrimary rounded px-2 py-1 text-xs text-theme-text font-mono focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Trust Server Certificate Checkbox */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center space-x-2 text-[11px] text-theme-text cursor-pointer select-none">
              <input
                type="checkbox"
                checked={config.trustServerCertificate}
                onChange={(e) => onChange({ trustServerCertificate: e.target.checked })}
                className="rounded bg-theme-bg border-theme-border text-theme-accentPrimary focus:ring-0"
              />
              <TrustCertIcon className="w-3.5 h-3.5 text-theme-accentPrimary inline shrink-0" />
              <span>Trust Server Certificate (SSL Bypassing)</span>
            </label>
          </div>

          {/* Test Connection Button inside Card 3 */}
          <div className="pt-2">
            <button
              type="button"
              disabled={!config.server || isTesting || isRunning}
              onClick={onTestConnection}
              className="w-full py-2 px-3 rounded-xl text-xs font-semibold border bg-theme-bg hover:bg-theme-cardHover border-theme-border text-theme-text transition flex items-center justify-center space-x-2 shadow-sm hover:border-theme-accentPrimary/50"
            >
              {isTesting ? (
                <>
                  <LoaderIcon className="w-3.5 h-3.5 animate-spin text-theme-accentPrimary" />
                  <span>Testing Connection & Fetching Telemetry...</span>
                </>
              ) : (
                <>
                  <ActivityPulseIcon className="w-3.5 h-3.5 text-theme-accentPrimary" />
                  <span>Test Connection & Fetch Databases</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* CARD 4: Database & Target File Selection */}
        <div data-tour-db-select="true" className="space-y-2 border border-theme-border rounded-xl p-3.5 bg-theme-card relative">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-medium text-theme-text flex items-center space-x-1.5">
                <DatabaseScannerIcon className="w-3.5 h-3.5 text-theme-accentSecondary" />
                <span>{isImport || isRestoreBak ? 'Target Database Name' : 'Source Database Name'}</span>{' '}
                <span className="text-emerald-400">*</span>
              </label>

              {!isRestoreBak && (
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleFetchDatabases}
                    disabled={isFetchingDbs || !config.server}
                    className="text-[10px] text-theme-accentPrimary hover:underline flex items-center space-x-1 disabled:opacity-50"
                  >
                    <RefreshIcon className={`w-3 h-3 ${isFetchingDbs ? 'animate-spin' : ''}`} />
                    <span>{isFetchingDbs ? 'Fetching...' : 'Fetch DBs'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsManualDbInput(!isManualDbInput)}
                    className="text-[10px] text-theme-muted hover:text-theme-text"
                  >
                    {isManualDbInput ? <ListIcon className="w-3 h-3" /> : <EditIcon className="w-3 h-3" />}
                  </button>
                </div>
              )}
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
                className="w-full bg-theme-bg border border-theme-border focus:border-theme-accentPrimary rounded-lg px-2.5 py-1.5 text-xs text-theme-text focus:outline-none font-mono"
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
                placeholder={isRestoreBak ? 'e.g. Hospital_Restored' : 'e.g. dummy_hospital'}
                className="w-full bg-theme-bg border border-theme-border focus:border-theme-accentPrimary rounded-lg px-2.5 py-1.5 text-xs text-theme-text placeholder-theme-muted focus:outline-none font-mono"
              />
            )}

            {onOpenSchemaModal && config.database && (
              <button
                type="button"
                onClick={onOpenSchemaModal}
                className="w-full py-1.5 px-3 bg-theme-bg hover:bg-theme-cardHover text-theme-accentPrimary border border-theme-accentPrimary/40 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition shadow-2xs hover:border-theme-accentPrimary"
                title="Inspect tables, columns, constraints & sample data rows"
              >
                <DatabaseScannerIcon className="w-3.5 h-3.5" />
                <span>🔍 Explore Database Schema & Data</span>
              </button>
            )}
          </div>

          {/* File Location */}
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
                  isRestoreBak
                    ? 'Click Browse to select .bak file...'
                    : 'File path destination...'
                }
                className="flex-1 bg-theme-bg border border-theme-border focus:border-theme-accentPrimary rounded-lg px-2.5 py-1.5 text-xs text-theme-text placeholder-theme-muted focus:outline-none font-mono truncate"
              />
              <button
                type="button"
                onClick={isRestoreBak || isImport ? onSelectBakFile : onSelectSavePath}
                className="px-3 py-1.5 bg-theme-bg hover:bg-theme-border text-theme-text rounded-lg border border-theme-border text-xs font-medium flex items-center space-x-1 shrink-0"
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

      {/* CARD 5: Primary Action Launch Control Bar */}
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
