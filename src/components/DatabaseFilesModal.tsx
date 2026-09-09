import React, { useState, useEffect, useCallback } from 'react';
import { ConnectionConfig, DatabasePhysicalFileInfo } from '../types';
import {
  CloseIcon,
  HardDriveIcon,
  CopyClipboardIcon,
  RefreshIcon,
  LoaderIcon,
  FolderOpenIcon,
  CheckIcon,
} from './icons/FeatureIcons';

interface DatabaseFilesModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ConnectionConfig;
  databaseName?: string;
}

export const DatabaseFilesModal: React.FC<DatabaseFilesModalProps> = ({
  isOpen,
  onClose,
  config,
  databaseName,
}) => {
  const [files, setFiles] = useState<DatabasePhysicalFileInfo[]>([]);
  const [dataPath, setDataPath] = useState<string>('');
  const [logPath, setLogPath] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const targetDb = databaseName || config.database || 'master';

  const fetchFiles = useCallback(async () => {
    if (!window.electronAPI || !isOpen) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await window.electronAPI.fetchDatabaseFiles(config, targetDb);
      if (res.success && res.files) {
        setFiles(res.files);
        if (res.dataPath) setDataPath(res.dataPath);
        if (res.logPath) setLogPath(res.logPath);
      } else {
        setError(res.message || `Could not retrieve physical storage files for [${targetDb}].`);
      }
    } catch (err: any) {
      setError(`Error fetching database storage details: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [config, targetDb, isOpen]);

  useEffect(() => {
    if (isOpen) {
      fetchFiles();
    }
  }, [isOpen, fetchFiles]);

  if (!isOpen) return null;

  const handleCopyPath = (pathText: string, index: number) => {
    navigator.clipboard.writeText(pathText);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-theme-surface border border-theme-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-theme-card border-b border-theme-border p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-theme-bg border border-theme-accentPrimary/40 rounded-xl text-theme-accentPrimary shadow-sm">
              <HardDriveIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-aladin text-xl text-theme-text font-bold">
                  Database Physical Storage & File Locations
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-theme-accentPrimary/20 text-theme-accentPrimary border border-theme-accentPrimary/40 rounded-md">
                  [{targetDb}]
                </span>
              </div>
              <p className="font-annie text-base text-theme-muted tracking-wide -mt-0.5">
                Exact physical paths on host disk for .mdf (Data File) and .ldf (Transaction Log)
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={fetchFiles}
              disabled={isLoading}
              className="p-1.5 text-theme-muted hover:text-white bg-theme-bg hover:bg-theme-cardHover border border-theme-border rounded-xl transition disabled:opacity-50"
              title="Refresh File Details"
            >
              <RefreshIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-theme-muted hover:text-white bg-theme-bg hover:bg-red-500/20 hover:border-red-500/40 border border-theme-border rounded-xl transition"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {isLoading ? (
            <div className="p-8 text-center text-theme-muted space-y-2">
              <LoaderIcon className="w-7 h-7 animate-spin mx-auto text-theme-accentPrimary" />
              <p className="font-mono text-xs">Querying sys.master_files for [{targetDb}]...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-950/30 border border-red-500/40 text-red-300 font-mono text-xs rounded-xl">
              {error}
            </div>
          ) : files.length === 0 ? (
            <div className="p-6 text-center text-theme-muted font-mono text-xs bg-theme-card/40 rounded-xl">
              No physical files detected for database [{targetDb}]. The database might not exist on the current host.
            </div>
          ) : (
            <div className="space-y-3">
              {files.map((file, idx) => {
                const isData = file.typeDesc.includes('ROWS') || file.physicalName.endsWith('.mdf') || file.physicalName.endsWith('.ndf');
                const isLog = file.typeDesc.includes('LOG') || file.physicalName.endsWith('.ldf');

                return (
                  <div
                    key={`${file.logicalName}-${idx}`}
                    className="p-3.5 bg-theme-card border border-theme-border rounded-xl space-y-2 hover:border-theme-accentPrimary/40 transition shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            isData
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : isLog
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          }`}
                        >
                          {isData ? '📄 Primary Data (.mdf)' : isLog ? '📜 Transaction Log (.ldf)' : '📁 FileStream (.ndf)'}
                        </span>
                        <span className="font-mono font-bold text-theme-text text-sm">
                          {file.logicalName}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 font-mono text-[11px]">
                        <span className="text-theme-muted">Size:</span>
                        <span className="text-theme-accentPrimary font-bold">{file.sizeMB.toLocaleString()} MB</span>
                        <span className="text-theme-muted px-1">•</span>
                        <span className="text-emerald-400 font-semibold">{file.stateDesc}</span>
                      </div>
                    </div>

                    {/* Physical File Path */}
                    <div className="bg-theme-bg p-2 rounded-lg border border-theme-border flex items-center justify-between font-mono text-[11px] text-theme-text select-text break-all">
                      <span className="truncate pr-2">{file.physicalName}</span>
                      <button
                        onClick={() => handleCopyPath(file.physicalName, idx)}
                        className="px-2 py-1 bg-theme-surface hover:bg-theme-card border border-theme-border text-theme-text rounded-md text-[10px] flex items-center space-x-1 shrink-0 transition"
                        title="Copy Physical File Path"
                      >
                        {copiedIndex === idx ? (
                          <>
                            <CheckIcon className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <CopyClipboardIcon className="w-3 h-3 text-theme-muted" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Instance Default Storage Directories */}
          {(dataPath || logPath) && (
            <div className="p-3.5 bg-theme-card/40 border border-theme-border rounded-xl space-y-2">
              <div className="font-aladin text-sm text-theme-text uppercase tracking-wider flex items-center space-x-1.5">
                <FolderOpenIcon className="w-4 h-4 text-theme-accentPrimary" />
                <span>SQL Server Instance Default Storage Directories</span>
              </div>
              <div className="grid grid-cols-1 gap-2 font-mono text-[11px]">
                {dataPath && (
                  <div className="bg-theme-bg p-2 rounded-lg border border-theme-border flex items-center justify-between">
                    <span className="text-theme-muted shrink-0 pr-2">Default DATA:</span>
                    <span className="text-theme-text truncate font-semibold select-text">{dataPath}</span>
                  </div>
                )}
                {logPath && (
                  <div className="bg-theme-bg p-2 rounded-lg border border-theme-border flex items-center justify-between">
                    <span className="text-theme-muted shrink-0 pr-2">Default LOG:</span>
                    <span className="text-theme-text truncate font-semibold select-text">{logPath}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-theme-card border-t border-theme-border p-4 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-theme-bg hover:bg-theme-surface border border-theme-border text-theme-text font-bold rounded-xl transition"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
