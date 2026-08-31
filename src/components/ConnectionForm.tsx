import React, { useState, useEffect, useCallback } from 'react';
import {
  BacpacIcon,
  BakBackupIcon,
  WindowsSecurityIcon,
  SqlAuthIcon,
  DowngradeTuningIcon,
  RamMemoryIcon,
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
  ChevronDownIcon,
  ChevronUpIcon,
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
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showFullVersion, setShowFullVersion] = useState(false);
  const [showAdvancedDowngrade, setShowAdvancedDowngrade] = useState(false);
  const [specifyDomainUser, setSpecifyDomainUser] = useState(Boolean(config.domain || (config.authType === 'windows' && config.username)));

  // Dynamic Database Listing state
  const [databases, setDatabases] = useState<string[]>([]);
  const [isFetchingDbs, setIsFetchingDbs] = useState(false);
  const [isManualDbInput, setIsManualDbInput] = useState(false);
  const [fetchDbError, setFetchDbError] = useState<string | null>(null);

  const handleAuthTypeChange = (type: 'sql' | 'windows') => {
    onChange({
      authType: type,
      useCurrentWindowsUser: type === 'windows' && !specifyDomainUser,
    });
  };

  const handleFetchDatabases = useCallback(async () => {
    if (!window.electronAPI || !config.server) return;
    setIsFetchingDbs(true);
    setFetchDbError(null);

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
      } else {
        setFetchDbError(res.message || 'No databases found on server.');
      }
    } catch (err) {
      setFetchDbError((err as Error).message);
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
    <div className="bg-forest-900 border border-forest-800 rounded-2xl p-4 shadow-xl space-y-3.5 flex flex-col justify-between h-full overflow-y-auto font-sans text-xs">
      <div className="space-y-3.5">
        {/* 4 Action Selector Tabs */}
        <div data-tour-action-tabs="true" className="relative">
          <div className="grid grid-cols-4 gap-1 p-1 bg-forest-950 border border-forest-800 rounded-xl">
            <button
              type="button"
              onClick={() => {
                const defaultFile = config.database
                  ? `${config.database}_${new Date().toISOString().slice(0, 10)}.bacpac`
                  : '';
                onChange({ action: 'Export', targetFile: defaultFile });
              }}
              className={`py-1.5 px-1 rounded-lg text-[10px] font-bold transition flex items-center justify-center space-x-1 ${
                isExport
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-emerald-400/70 hover:text-white'
              }`}
            >
              <BacpacIcon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Export .bacpac</span>
            </button>

            <button
              type="button"
              onClick={() => onChange({ action: 'Import' })}
              className={`py-1.5 px-1 rounded-lg text-[10px] font-bold transition flex items-center justify-center space-x-1 ${
                isImport
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-emerald-400/70 hover:text-white'
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
              className={`py-1.5 px-1 rounded-lg text-[10px] font-bold transition flex items-center justify-center space-x-1 ${
                isBackup
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-emerald-400/70 hover:text-white'
              }`}
            >
              <BakBackupIcon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Backup .bak</span>
            </button>

            <button
              type="button"
              onClick={() => onChange({ action: 'Restore_Bak' })}
              className={`py-1.5 px-1 rounded-lg text-[10px] font-bold transition flex items-center justify-center space-x-1 ${
                isRestoreBak
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-emerald-400/70 hover:text-white'
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

        {/* Tab Description Banners */}
        {isBackup && (
          <div className="p-2.5 bg-emerald-950/80 border border-emerald-800/80 rounded-xl text-emerald-200 text-[11px] leading-relaxed flex items-start space-x-2">
            <BakBackupIcon className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              <strong>Native T-SQL BACKUP DATABASE:</strong> Creates a full binary `.bak` backup directly on the SQL Server host. Fast and preserves transaction log structure.
            </span>
          </div>
        )}

        {isRestoreBak && (
          <div className="p-2.5 bg-emerald-950/80 border border-emerald-800/80 rounded-xl text-emerald-200 text-[11px] leading-relaxed flex items-start space-x-2">
            <WithMoveMappingIcon className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              <strong>Native T-SQL RESTORE WITH MOVE:</strong> Reads logical names from `.bak` via `RESTORE FILELISTONLY` and automatically maps file paths to the target OS format (Linux `/var/opt/mssql/data` or Windows).
            </span>
          </div>
        )}

        {/* ==================================================================== */}
        {/* POST-CONNECTION TELEMETRY CARD (Visible once connection established)  */}
        {/* ==================================================================== */}
        {serverInfo ? (
          <div className="p-3 bg-emerald-950/70 border border-emerald-500/60 rounded-xl space-y-2 shadow-lg shadow-emerald-950/40 animate-in fade-in duration-300">
            <div className="flex items-center justify-between border-b border-emerald-800/80 pb-1.5">
              <div className="flex items-center space-x-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-[11px] font-bold text-emerald-200 uppercase tracking-wider">
                  Connected MSSQL & Active Session Driver
                </span>
              </div>
              <span className="text-[10px] font-mono text-emerald-300 bg-emerald-900/60 px-2 py-0.5 rounded border border-emerald-700/60 flex items-center space-x-1">
                <SessionThreadIcon className="w-3 h-3 text-emerald-400 inline" />
                <span>SPID #{serverInfo.spid || 'Active'}</span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
              <div className="bg-forest-950/80 p-2 rounded-lg border border-forest-800 space-y-0.5">
                <div className="text-emerald-400/80 text-[9px] font-bold uppercase">Connected Database Engine</div>
                <div className="text-white font-bold text-[11px] truncate" title={serverInfo.friendlyVersion}>
                  {serverInfo.friendlyVersion}
                </div>
                <div className="text-emerald-300/70 text-[9px] truncate">
                  Build {serverInfo.productVersion} ({serverInfo.productLevel || 'RTM'})
                </div>
              </div>

              <div className="bg-forest-950/80 p-2 rounded-lg border border-forest-800 space-y-0.5">
                <div className="text-teal-400/80 text-[9px] font-bold uppercase flex items-center space-x-1">
                  <DriverConnectorIcon className="w-3 h-3 text-teal-400" />
                  <span>Active TDS Driver</span>
                </div>
                <div className="text-white font-bold text-[11px] truncate">
                  {serverInfo.activeDriver.split('(')[0].trim()}
                </div>
                <div className="text-teal-300/70 text-[9px] truncate" title={serverInfo.engineDriver}>
                  Engine: {serverInfo.engineDriver.split('(')[0].trim()}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-emerald-400/80 pt-1">
              <span>Host: <strong className="text-white font-mono">{serverInfo.machineName || config.server}:{config.port || '1433'}</strong></span>
              <button
                type="button"
                onClick={() => setShowFullVersion(!showFullVersion)}
                className="text-[10px] text-emerald-300 hover:text-white underline underline-offset-2"
              >
                {showFullVersion ? 'Hide Details' : 'View Full @@VERSION'}
              </button>
            </div>

            {showFullVersion && (
              <div className="mt-2 p-2 bg-black/70 border border-emerald-800 rounded-lg text-[9px] font-mono text-emerald-300 whitespace-pre-wrap max-h-24 overflow-y-auto select-text leading-tight">
                {serverInfo.fullVersion}
              </div>
            )}
          </div>
        ) : (
          /* =================================================================== */
          /* PRE-CONNECTION ENVIRONMENT & DRIVER STATUS (Before connection made)  */
          /* =================================================================== */
          <div className="p-2.5 bg-forest-950/90 border border-forest-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between border-b border-forest-800/80 pb-1">
              <div className="flex items-center space-x-1.5">
                <DriverConnectorIcon className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">
                  Installed Engine & Driver Status (Pre-Connection)
                </span>
              </div>
              <span className="text-[9px] font-mono text-emerald-500/70 bg-forest-900 px-1.5 py-0.5 rounded border border-forest-800">
                Ready to Connect
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
              <div className="bg-forest-900/80 p-2 rounded-lg border border-forest-800/80 space-y-0.5">
                <div className="text-emerald-400/80 text-[9px] font-bold uppercase flex items-center space-x-1">
                  <BakBackupIcon className="w-3 h-3 text-emerald-400" />
                  <span>Local MSSQL Engine</span>
                </div>
                <div className="text-emerald-100 font-semibold truncate" title={envInfo?.localMssqlVersion || 'Not installed'}>
                  {envInfo?.localMssqlInstalled
                    ? (envInfo.localMssqlFriendly || `v${envInfo.localMssqlVersion}`)
                    : 'Not installed locally'}
                </div>
                <div className="text-[9px] text-emerald-400/60">
                  {envInfo?.localMssqlInstalled
                    ? `Status: ${envInfo.localMssqlStatus === 'active' ? '● Service Active' : '○ Inactive'}`
                    : 'Targeting remote host'}
                </div>
              </div>

              <div className="bg-forest-900/80 p-2 rounded-lg border border-forest-800/80 space-y-0.5">
                <div className="text-teal-400/80 text-[9px] font-bold uppercase flex items-center space-x-1">
                  <DriverConnectorIcon className="w-3 h-3 text-teal-400" />
                  <span>Active Driver (In Use)</span>
                </div>
                <div className="text-emerald-100 font-semibold truncate">
                  Tedious v20.0 (TDS 7.4)
                </div>
                <div className="text-[9px] text-teal-400/60 truncate" title={envInfo?.sqlpackageVersion || 'SqlPackage CLI'}>
                  {envInfo?.sqlpackageVersion || 'SqlPackage v170.4 (DacFx)'}
                </div>
              </div>
            </div>

            {envInfo?.systemOdbcDrivers && envInfo.systemOdbcDrivers.length > 0 && (
              <div className="text-[9px] text-emerald-500/80 font-mono flex items-center space-x-1 pt-0.5">
                <span>System ODBC:</span>
                <span className="text-emerald-300 font-semibold truncate">{envInfo.systemOdbcDrivers.join(', ')}</span>
              </div>
            )}
          </div>
        )}

        {/* Test Result Banner */}
        {testResult && (
          <div
            className={`p-2.5 rounded-xl border space-y-1 relative ${
              testResult.success
                ? 'bg-emerald-950/90 border-emerald-700 text-emerald-200'
                : 'bg-red-950/90 border-red-800 text-red-200'
            }`}
          >
            <button
              onClick={onDismissTestResult}
              className="absolute right-2 top-2 p-1 rounded text-slate-400 hover:text-white"
            >
              <CloseIcon className="w-3.5 h-3.5" />
            </button>
            <div className="flex items-center space-x-2 font-bold text-xs">
              {testResult.success ? (
                <CheckCircleIcon className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangleIcon className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span>{testResult.message}</span>
            </div>
            {testResult.details && (
              <p className="text-[10px] font-mono text-slate-300 whitespace-pre-wrap pl-6">
                {testResult.details}
              </p>
            )}
          </div>
        )}

        {/* ==================================================================== */}
        {/* SERVER & AUTHENTICATION SECTION                                      */}
        {/* ==================================================================== */}
        <div data-tour-server-auth="true" className="space-y-2.5 border border-forest-800 rounded-xl p-3 bg-forest-950/50 relative">
          <div className="flex items-center justify-between border-b border-forest-800 pb-1.5">
            <div className="flex items-center space-x-2">
              <ServerHostIcon className="w-4 h-4 text-emerald-400" />
              <h2 className="text-[11px] font-bold text-white uppercase tracking-wider">
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
              <span className="text-[10px] font-mono text-emerald-400/70">
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
              <label className="block text-[11px] font-medium text-emerald-100">
                Server Host / IP <span className="text-emerald-400">*</span>
              </label>
              <input
                type="text"
                value={config.server}
                onChange={(e) => onChange({ server: e.target.value })}
                placeholder="localhost or 192.168.1.10"
                className="w-full bg-forest-950 border border-forest-800 focus:border-emerald-500 rounded-lg px-2.5 py-1.5 text-xs text-emerald-50 placeholder-forest-600 focus:outline-none font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-emerald-100 flex items-center space-x-1">
                <HashIcon className="w-3 h-3 text-emerald-400" />
                <span>Port</span>
              </label>
              <input
                type="text"
                value={config.port}
                onChange={(e) => onChange({ port: e.target.value })}
                placeholder="1433"
                className="w-full bg-forest-950 border border-forest-800 focus:border-emerald-500 rounded-lg px-2.5 py-1.5 text-xs text-emerald-50 placeholder-forest-600 focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* Auth Mode Tabs */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-medium text-emerald-100">
                Authentication Mode
              </label>
              <Hotspot
                isActive={isGuideModeActive}
                title="Windows Authentication"
                description="Connect without typing passwords using current Windows SSPI credentials, just like SQL Server Management Studio."
                tip="On Windows host, no username or password is required."
                position="left"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 p-1 bg-forest-950 border border-forest-800 rounded-lg">
              <button
                type="button"
                onClick={() => handleAuthTypeChange('sql')}
                className={`py-1 px-2 rounded-md text-[11px] font-medium transition flex items-center justify-center space-x-1.5 ${
                  config.authType === 'sql'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-emerald-400/70 hover:text-white'
                }`}
              >
                <SqlAuthIcon className="w-3.5 h-3.5" />
                <span>SQL Server Auth</span>
              </button>
              <button
                type="button"
                onClick={() => handleAuthTypeChange('windows')}
                className={`py-1 px-2 rounded-md text-[11px] font-medium transition flex items-center justify-center space-x-1.5 ${
                  config.authType === 'windows'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-emerald-400/70 hover:text-white'
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
                <label className="block text-[11px] font-medium text-emerald-100 flex items-center space-x-1">
                  <UserIcon className="w-3 h-3 text-emerald-400" />
                  <span>Username</span> <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  value={config.username}
                  onChange={(e) => onChange({ username: e.target.value })}
                  placeholder="sa"
                  className="w-full bg-forest-950 border border-forest-800 focus:border-emerald-500 rounded-lg px-2.5 py-1.5 text-xs text-emerald-50 placeholder-forest-600 focus:outline-none font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-emerald-100 flex items-center space-x-1">
                  <LockIcon className="w-3 h-3 text-emerald-400" />
                  <span>Password</span> <span className="text-emerald-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={config.password}
                    onChange={(e) => onChange({ password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full bg-forest-950 border border-forest-800 focus:border-emerald-500 rounded-lg pl-2.5 pr-7 py-1.5 text-xs text-emerald-50 placeholder-forest-600 focus:outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-2 text-emerald-400/60 hover:text-emerald-300"
                  >
                    {showPassword ? <EyeOffIcon className="w-3.5 h-3.5" /> : <EyeIcon className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Windows Authentication Options */}
          {config.authType === 'windows' && (
            <div className="space-y-2 p-2.5 bg-emerald-950/40 border border-emerald-500/30 rounded-lg text-emerald-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <WindowsSecurityIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-semibold text-white">
                    {specifyDomainUser ? 'Domain / NTLM User' : 'Windows Integrated Security (SSPI)'}
                  </span>
                </div>
                <label className="flex items-center space-x-1.5 text-[10px] text-emerald-300 cursor-pointer select-none">
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
                    className="rounded bg-forest-950 border-forest-700 text-emerald-500 focus:ring-0"
                  />
                  <span>Specify Domain User</span>
                </label>
              </div>

              {!specifyDomainUser ? (
                <p className="text-[11px] text-emerald-200/90 leading-snug">
                  ✓ Automatically uses your current logged-in Windows account (<code>/SourceIntegratedSecurity:True</code>) with zero password hassle.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div className="space-y-0.5">
                    <label className="text-[10px] text-emerald-300">Domain</label>
                    <input
                      type="text"
                      value={config.domain || ''}
                      onChange={(e) => onChange({ domain: e.target.value })}
                      placeholder="MYDOMAIN"
                      className="w-full bg-forest-950 border border-forest-800 focus:border-emerald-500 rounded px-2 py-1 text-xs text-white font-mono focus:outline-none"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="text-[10px] text-emerald-300">Username *</label>
                    <input
                      type="text"
                      value={config.username}
                      onChange={(e) => onChange({ username: e.target.value })}
                      placeholder="john.doe"
                      className="w-full bg-forest-950 border border-forest-800 focus:border-emerald-500 rounded px-2 py-1 text-xs text-white font-mono focus:outline-none"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="text-[10px] text-emerald-300">Password</label>
                    <input
                      type="password"
                      value={config.password}
                      onChange={(e) => onChange({ password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full bg-forest-950 border border-forest-800 focus:border-emerald-500 rounded px-2 py-1 text-xs text-white font-mono focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Trust Server Certificate Checkbox */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center space-x-2 text-[11px] text-emerald-200 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={config.trustServerCertificate}
                onChange={(e) => onChange({ trustServerCertificate: e.target.checked })}
                className="rounded bg-forest-950 border-forest-700 text-emerald-500 focus:ring-0"
              />
              <TrustCertIcon className="w-3.5 h-3.5 text-emerald-400 inline shrink-0" />
              <span>Trust Server Certificate (Recommended for Local / Docker)</span>
            </label>
            <Hotspot
              isActive={isGuideModeActive}
              title="Trust Server Certificate"
              description="Bypasses certificate chain validation when using self-signed SSL certificates in development or Docker containers."
              position="left"
            />
          </div>
        </div>

        {/* ==================================================================== */}
        {/* DATABASE & DESTINATION SELECTION                                     */}
        {/* ==================================================================== */}
        <div data-tour-db-select="true" className="space-y-2 border border-forest-800 rounded-xl p-3 bg-forest-950/50 relative">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-medium text-emerald-100 flex items-center space-x-1.5">
                <DatabaseScannerIcon className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isImport || isRestoreBak ? 'Target Database Name' : 'Source Database Name'}</span>{' '}
                <span className="text-emerald-400">*</span>
              </label>

              {!isRestoreBak && (
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleFetchDatabases}
                    disabled={isFetchingDbs || !config.server}
                    className="text-[10px] text-emerald-400 hover:text-emerald-200 flex items-center space-x-1 disabled:opacity-50"
                  >
                    <RefreshIcon className={`w-3 h-3 ${isFetchingDbs ? 'animate-spin' : ''}`} />
                    <span>{isFetchingDbs ? 'Fetching...' : 'Fetch DBs'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsManualDbInput(!isManualDbInput)}
                    className="text-[10px] text-emerald-400/60 hover:text-emerald-300"
                    title={isManualDbInput ? 'Switch to Database Dropdown' : 'Type Database Name Manually'}
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
                className="w-full bg-forest-950 border border-forest-800 focus:border-emerald-500 rounded-lg px-2.5 py-1.5 text-xs text-emerald-50 focus:outline-none font-mono"
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
                className="w-full bg-forest-950 border border-forest-800 focus:border-emerald-500 rounded-lg px-2.5 py-1.5 text-xs text-emerald-50 placeholder-forest-600 focus:outline-none font-mono"
              />
            )}

            {fetchDbError && (
              <p className="text-[10px] text-amber-400 font-mono">
                Note: {fetchDbError}
              </p>
            )}
          </div>

          {/* File Location Field */}
          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-emerald-100">
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
                className="flex-1 bg-forest-950 border border-forest-800 focus:border-emerald-500 rounded-lg px-2.5 py-1.5 text-xs text-emerald-50 placeholder-forest-600 focus:outline-none font-mono truncate"
              />
              <button
                type="button"
                onClick={isRestoreBak || isImport ? onSelectBakFile : onSelectSavePath}
                className="px-3 py-1.5 bg-forest-850 hover:bg-forest-800 text-emerald-200 rounded-lg border border-forest-700 text-xs font-medium flex items-center space-x-1 shrink-0"
              >
                <FolderOpenIcon className="w-3.5 h-3.5 text-emerald-400" />
                <span>Browse</span>
              </button>
            </div>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* CROSS-VERSION & LEGACY DOWNGRADE TUNING (Accordion)                 */}
        {/* ==================================================================== */}
        {(isExport || isImport) && (
          <div data-tour-downgrade-options="true" className="border border-forest-800 rounded-xl bg-forest-950/60 overflow-hidden relative">
            <button
              type="button"
              onClick={() => setShowAdvancedDowngrade(!showAdvancedDowngrade)}
              className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-forest-900/60 transition"
            >
              <div className="flex items-center space-x-2">
                <DowngradeTuningIcon className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-semibold text-emerald-200 text-[11px]">
                  Cross-Version & Downgrade Tuning
                </span>
                <span className="text-[9px] bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-800">
                  {config.compatibilityMode === 'legacy_downgrade' ? 'Legacy Downgrade Preset' : config.compatibilityMode}
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <Hotspot
                  isActive={isGuideModeActive}
                  title="Downgrade Tuning"
                  description="Enables Memory storage (/p:Storage=Memory) and removes timeouts to safely downgrade databases across major MSSQL versions."
                  position="left"
                />
                {showAdvancedDowngrade ? <ChevronUpIcon className="w-4 h-4 text-forest-400" /> : <ChevronDownIcon className="w-4 h-4 text-forest-400" />}
              </div>
            </button>

            {showAdvancedDowngrade && (
              <div className="p-3 border-t border-forest-800 space-y-2.5 text-[11px] animate-in fade-in">
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="text-emerald-300 font-medium flex items-center space-x-1">
                      <RamMemoryIcon className="w-3 h-3 text-teal-400" />
                      <span>Storage Engine</span>
                    </label>
                    <select
                      value={config.storage}
                      onChange={(e) => onChange({ storage: e.target.value as any })}
                      className="w-full bg-forest-950 border border-forest-800 rounded px-2 py-1 text-white font-mono"
                    >
                      <option value="Memory">Memory (Recommended)</option>
                      <option value="File">File (Windows ESE Only)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-emerald-300 font-medium">Command Timeout</label>
                    <input
                      type="number"
                      value={config.commandTimeout}
                      onChange={(e) => onChange({ commandTimeout: parseInt(e.target.value, 10) || 0 })}
                      placeholder="0 (Infinite)"
                      className="w-full bg-forest-950 border border-forest-800 rounded px-2 py-1 text-white font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-emerald-300 font-medium">Preset</label>
                    <select
                      value={config.compatibilityMode}
                      onChange={(e) => onChange({ compatibilityMode: e.target.value as any })}
                      className="w-full bg-forest-950 border border-forest-800 rounded px-2 py-1 text-white font-mono"
                    >
                      <option value="legacy_downgrade">Legacy Downgrade</option>
                      <option value="standard">Standard</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <label className="flex items-center space-x-2 text-emerald-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.ignorePermissions}
                      onChange={(e) => onChange({ ignorePermissions: e.target.checked })}
                      className="rounded bg-forest-950 border-forest-700 text-emerald-500"
                    />
                    <span>Ignore Object Permissions</span>
                  </label>

                  <label className="flex items-center space-x-2 text-emerald-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.verifyExtraction}
                      onChange={(e) => onChange({ verifyExtraction: e.target.checked })}
                      className="rounded bg-forest-950 border-forest-700 text-emerald-500"
                    />
                    <span>Verify Extraction (Slow)</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        )}

        {/* RESTORE .BAK LOGICAL FILE LIST VIEW */}
        {isRestoreBak && (
          <div className="space-y-2 border border-forest-800 rounded-xl p-3 bg-forest-950 relative">
            <div className="flex items-center justify-between border-b border-forest-800 pb-1.5">
              <div className="flex items-center space-x-1.5">
                <WithMoveMappingIcon className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-bold text-emerald-300 text-[11px]">
                  Logical File Layout (WITH MOVE)
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={onFetchFileList}
                  disabled={isFetchingFileList || !config.targetFile}
                  className="text-[10px] text-emerald-400 hover:text-emerald-200 flex items-center space-x-1 disabled:opacity-50"
                >
                  <RefreshIcon className={`w-3 h-3 ${isFetchingFileList ? 'animate-spin' : ''}`} />
                  <span>Read File List</span>
                </button>
                <Hotspot
                  isActive={isGuideModeActive}
                  title="WITH MOVE Mapping"
                  description="Relocates physical database files to the server's default data and log directories."
                  position="left"
                />
              </div>
            </div>

            {isFetchingFileList ? (
              <div className="py-4 text-center text-emerald-400/70 flex items-center justify-center space-x-2">
                <LoaderIcon className="w-4 h-4 animate-spin" />
                <span>Reading logical file header from .bak...</span>
              </div>
            ) : bakFileList.length > 0 ? (
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {fileMoves.map((move, idx) => {
                  const bakInfo = bakFileList[idx];
                  return (
                    <div key={move.logicalName} className="p-2 bg-forest-900 border border-forest-800 rounded-lg space-y-1 font-mono text-[10px]">
                      <div className="flex items-center justify-between text-emerald-200 font-bold">
                        <span>Logical: {move.logicalName} ({bakInfo?.type === 'L' ? 'LOG' : 'DATA'})</span>
                        <span className="text-[9px] text-emerald-400/60">Original: {bakInfo?.physicalName}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-emerald-400">
                        <span>➜ Target:</span>
                        <input
                          type="text"
                          value={move.targetPath}
                          onChange={(e) => {
                            const updated = [...fileMoves];
                            updated[idx].targetPath = e.target.value;
                            onFileMoveChange(updated);
                          }}
                          className="flex-1 bg-forest-950 border border-forest-800 rounded px-1.5 py-0.5 text-emerald-100 focus:outline-none text-[10px]"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[10px] text-emerald-400/60 italic py-2 text-center">
                Select a .bak file to auto-detect database logical file names & generate OS-specific file move rules.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div data-tour-run-button="true" className="pt-2 border-t border-forest-800 space-y-2">
        <button
          type="button"
          disabled={!config.server || isTesting || isRunning}
          onClick={onTestConnection}
          className="w-full py-1.5 px-3 rounded-xl text-xs font-semibold border bg-forest-850 hover:bg-forest-800 border-forest-700 text-emerald-300 hover:text-white transition flex items-center justify-center space-x-2"
        >
          {isTesting ? (
            <>
              <LoaderIcon className="w-3.5 h-3.5 animate-spin text-emerald-400" />
              <span>Testing Connection & Fetching Telemetry...</span>
            </>
          ) : (
            <>
              <ActivityPulseIcon className="w-3.5 h-3.5 text-emerald-400" />
              <span>Test Connection & Fetch Databases</span>
            </>
          )}
        </button>

        {!isRunning ? (
          <button
            type="button"
            disabled={!isFormValid}
            onClick={onExport}
            className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 shadow-lg ${
              isFormValid
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40'
                : 'bg-forest-850 text-emerald-700 cursor-not-allowed border border-forest-800'
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
            className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 shadow-lg animate-pulse"
          >
            <StopProcessIcon className="w-4 h-4" />
            <span>Cancel Active Operation</span>
          </button>
        )}
      </div>
    </div>
  );
};
