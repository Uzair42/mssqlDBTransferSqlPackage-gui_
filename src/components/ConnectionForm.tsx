import React, { useState, useEffect, useCallback } from 'react';
import {
  Server,
  FolderOpen,
  Square,
  Eye,
  EyeOff,
  Database,
  Lock,
  User,
  Hash,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  X,
  Download,
  Upload,
  Info,
  RefreshCw,
  Edit3,
  List,
  HardDrive,
  RotateCcw,
  FileCode,
} from 'lucide-react';
import { ConnectionConfig, ConnectionTestResult, BakFileInfo, FileMove } from '../types';

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
}) => {
  const [showPassword, setShowPassword] = useState(false);

  // Dynamic Database Listing state
  const [databases, setDatabases] = useState<string[]>([]);
  const [isFetchingDbs, setIsFetchingDbs] = useState(false);
  const [isManualDbInput, setIsManualDbInput] = useState(false);
  const [fetchDbError, setFetchDbError] = useState<string | null>(null);

  const handleAuthTypeChange = (type: 'sql' | 'windows') => {
    onChange({ authType: type });
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
  }, [config.server, config.port, config.username, config.password, config.authType, config.trustServerCertificate, config.action, config.database, onChange]);

  useEffect(() => {
    if (testResult?.success) {
      handleFetchDatabases();
    }
  }, [testResult?.success, handleFetchDatabases]);

  const isFormValid =
    config.server.trim() !== '' &&
    (config.action === 'Restore_Bak' || config.database.trim() !== '') &&
    (config.authType === 'windows' ||
      (config.username.trim() !== '' && config.password !== ''));

  const isExport = config.action === 'Export';
  const isImport = config.action === 'Import';
  const isBackup = config.action === 'Backup';
  const isRestoreBak = config.action === 'Restore_Bak';

  return (
    <div className="bg-forest-900 border border-forest-800 rounded-2xl p-4 shadow-xl space-y-3.5 flex flex-col justify-between h-full overflow-y-auto font-sans text-xs">
      <div className="space-y-3.5">
        {/* 4 Action Selector Tabs */}
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
            <Download className="w-3 h-3 shrink-0" />
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
            <Upload className="w-3 h-3 shrink-0" />
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
            <HardDrive className="w-3 h-3 shrink-0" />
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
            <RotateCcw className="w-3 h-3 shrink-0" />
            <span className="truncate">Restore .bak</span>
          </button>
        </div>

        {/* Tab Description Banners */}
        {isBackup && (
          <div className="p-2.5 bg-emerald-950/80 border border-emerald-800/80 rounded-xl text-emerald-200 text-[11px] leading-relaxed flex items-start space-x-2">
            <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              <strong>Native T-SQL BACKUP DATABASE:</strong> Creates a full binary `.bak` backup directly on the SQL Server host. Fast and preserves full transaction log structure.
            </span>
          </div>
        )}

        {isRestoreBak && (
          <div className="p-2.5 bg-emerald-950/80 border border-emerald-800/80 rounded-xl text-emerald-200 text-[11px] leading-relaxed flex items-start space-x-2">
            <RotateCcw className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              <strong>Native T-SQL RESTORE WITH MOVE:</strong> Reads logical names from `.bak` via `RESTORE FILELISTONLY` and automatically maps file paths to the target OS format (Linux `/var/opt/mssql/data` or Windows).
            </span>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between border-b border-forest-800 pb-2">
          <div className="flex items-center space-x-2">
            <Server className="w-4 h-4 text-emerald-400" />
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
          <span className="text-[10px] font-mono text-emerald-400/70">
            {isBackup || isRestoreBak ? 'T-SQL Module' : 'sqlpackage Engine'}
          </span>
        </div>

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
              <X className="w-3.5 h-3.5" />
            </button>
            <div className="flex items-center space-x-2 font-bold text-xs">
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
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
              <Hash className="w-3 h-3 text-emerald-400" />
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

        {/* Auth Mode */}
        <div className="space-y-1">
          <label className="block text-[11px] font-medium text-emerald-100">
            Authentication Method
          </label>
          <div className="grid grid-cols-2 gap-2 p-1 bg-forest-950 border border-forest-800 rounded-lg">
            <button
              type="button"
              onClick={() => handleAuthTypeChange('sql')}
              className={`py-1 px-2 rounded-md text-[11px] font-medium transition ${
                config.authType === 'sql'
                  ? 'bg-emerald-600 text-white'
                  : 'text-emerald-400/70 hover:text-white'
              }`}
            >
              SQL Server Auth
            </button>
            <button
              type="button"
              onClick={() => handleAuthTypeChange('windows')}
              className={`py-1 px-2 rounded-md text-[11px] font-medium transition ${
                config.authType === 'windows'
                  ? 'bg-emerald-600 text-white'
                  : 'text-emerald-400/70 hover:text-white'
              }`}
            >
              Windows Auth
            </button>
          </div>
        </div>

        {/* User & Password */}
        {config.authType === 'sql' && (
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-emerald-100 flex items-center space-x-1">
                <User className="w-3 h-3 text-emerald-400" />
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
                <Lock className="w-3 h-3 text-emerald-400" />
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
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Target/Source Database Selection */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="block text-[11px] font-medium text-emerald-100 flex items-center space-x-1">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
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
                  <RefreshCw className={`w-3 h-3 ${isFetchingDbs ? 'animate-spin' : ''}`} />
                  <span>{isFetchingDbs ? 'Fetching...' : 'Fetch DBs'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsManualDbInput(!isManualDbInput)}
                  className="text-[10px] text-emerald-400/60 hover:text-emerald-300"
                >
                  {isManualDbInput ? <List className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />}
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
              onClick={isRestoreBak ? onSelectBakFile : onSelectSavePath}
              className="px-3 py-1.5 bg-forest-850 hover:bg-forest-800 text-emerald-200 rounded-lg border border-forest-700 text-xs font-medium flex items-center space-x-1 shrink-0"
            >
              <FolderOpen className="w-3.5 h-3.5 text-emerald-400" />
              <span>Browse</span>
            </button>
          </div>
        </div>

        {/* RESTORE .BAK LOGICAL FILE LIST VIEW */}
        {isRestoreBak && (
          <div className="space-y-2 border border-forest-800 rounded-xl p-3 bg-forest-950">
            <div className="flex items-center justify-between border-b border-forest-800 pb-1.5">
              <span className="font-bold text-emerald-300 flex items-center space-x-1.5 text-[11px]">
                <FileCode className="w-3.5 h-3.5 text-emerald-400" />
                <span>Logical File Layout (WITH MOVE)</span>
              </span>
              <button
                type="button"
                onClick={onFetchFileList}
                disabled={isFetchingFileList || !config.targetFile}
                className="text-[10px] text-emerald-400 hover:text-emerald-200 flex items-center space-x-1 disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isFetchingFileList ? 'animate-spin' : ''}`} />
                <span>Read File List</span>
              </button>
            </div>

            {isFetchingFileList ? (
              <div className="py-4 text-center text-emerald-400/70 flex items-center justify-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin" />
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
      <div className="pt-2 border-t border-forest-800 space-y-2">
        <button
          type="button"
          disabled={!config.server || isTesting || isRunning}
          onClick={onTestConnection}
          className="w-full py-1.5 px-3 rounded-xl text-xs font-semibold border bg-forest-850 hover:bg-forest-800 border-forest-700 text-emerald-300 hover:text-white transition flex items-center justify-center space-x-2"
        >
          {isTesting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
              <span>Testing Connection...</span>
            </>
          ) : (
            <>
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
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
                <Download className="w-4 h-4" />
                <span>Export Database to .bacpac</span>
              </>
            ) : isImport ? (
              <>
                <Upload className="w-4 h-4" />
                <span>Import / Restore .bacpac to Server</span>
              </>
            ) : isBackup ? (
              <>
                <HardDrive className="w-4 h-4" />
                <span>Execute BACKUP DATABASE (.bak)</span>
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4" />
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
            <Square className="w-4 h-4 fill-current" />
            <span>Cancel Active Operation</span>
          </button>
        )}
      </div>
    </div>
  );
};
