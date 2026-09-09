import React from 'react';
import {
  CloseIcon,
  CheckCircleIcon,
  DatabaseScannerIcon,
  HardDriveIcon,
} from './icons/FeatureIcons';

interface PostOperationModalProps {
  isOpen: boolean;
  onClose: () => void;
  operationType: 'restore' | 'backup';
  databaseName: string;
  filePath?: string;
  onOpenSchemaModal?: () => void;
  onOpenFileTransfer?: (filePath: string) => void;
  onOpenFilesModal?: () => void;
}

export const PostOperationModal: React.FC<PostOperationModalProps> = ({
  isOpen,
  onClose,
  operationType,
  databaseName,
  filePath,
  onOpenSchemaModal,
  onOpenFileTransfer,
  onOpenFilesModal,
}) => {
  if (!isOpen) return null;

  const isRestore = operationType === 'restore';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-theme-surface border border-theme-border rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header with Success Icon */}
        <div className="bg-theme-card border-b border-theme-border p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl text-emerald-400 shadow-md">
              <CheckCircleIcon className="w-7 h-7 text-emerald-400" />
            </div>
            <div>
              <h2 className="font-aladin text-2xl text-theme-text font-bold leading-tight">
                {isRestore ? 'Database Restored Successfully!' : 'Backup Created Successfully!'}
              </h2>
              <div className="flex items-center space-x-2 pt-0.5">
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-theme-accentPrimary/20 text-theme-accentPrimary border border-theme-accentPrimary/40 rounded-md">
                  Database: [{databaseName}]
                </span>
                <span className="text-xs font-mono text-emerald-400 font-semibold">
                  ● Ready for use
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-theme-muted hover:text-white bg-theme-bg hover:bg-theme-cardHover border border-theme-border rounded-xl transition"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content & Action Buttons */}
        <div className="p-6 space-y-4">
          <p className="font-annie text-lg text-theme-muted tracking-wide leading-relaxed">
            {isRestore
              ? `Database [${databaseName}] has been restored and mounted onto the SQL Server instance. You can explore tables, view foreign key ERD relationships, inspect .mdf/.ldf physical files, or preview data rows immediately.`
              : `Backup package for [${databaseName}] has been generated. You can now transfer it across your local network over high-speed Wi-Fi or Bluetooth without WhatsApp file renaming issues.`}
          </p>

          {filePath && (
            <div className="p-3 bg-theme-card/70 border border-theme-border rounded-xl space-y-1 text-xs font-mono select-text break-all">
              <span className="text-[10px] uppercase font-bold text-theme-accentPrimary">
                {isRestore ? 'Source Backup Package' : 'Generated Backup File'}:
              </span>
              <p className="text-theme-text leading-tight">{filePath}</p>
            </div>
          )}

          {/* Quick Action Grid */}
          <div className="grid grid-cols-1 gap-2.5 pt-2">
            {isRestore ? (
              <>
                {onOpenSchemaModal && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenSchemaModal();
                    }}
                    className="w-full px-4 py-3 bg-user-gradient text-white font-bold rounded-xl text-sm flex items-center justify-between shadow-md hover:brightness-110 active:scale-98 transition group border border-white/20"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-1.5 bg-white/20 rounded-lg">
                        <DatabaseScannerIcon className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <div className="font-aladin text-base font-bold">📊 Explore Schema & Interactive ERD</div>
                        <div className="text-[10px] font-mono text-white/80 font-normal">View tables, foreign keys, drag-and-drop diagram & high-res PNG export</div>
                      </div>
                    </div>
                    <span className="font-mono text-xs opacity-75 group-hover:translate-x-1 transition-transform">→</span>
                  </button>
                )}

                {onOpenFilesModal && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenFilesModal();
                    }}
                    className="w-full px-4 py-2.5 bg-theme-card hover:bg-theme-cardHover border border-theme-border text-theme-text rounded-xl text-xs font-semibold flex items-center justify-between transition group"
                  >
                    <div className="flex items-center space-x-3">
                      <HardDriveIcon className="w-4 h-4 text-theme-accentPrimary" />
                      <div className="text-left">
                        <div className="font-bold">Inspect Physical Storage Files (.mdf / .ldf)</div>
                        <div className="text-[10px] font-mono text-theme-muted">View exact disk paths and allocated file sizes</div>
                      </div>
                    </div>
                    <span className="font-mono text-xs text-theme-muted group-hover:translate-x-1 transition-transform">→</span>
                  </button>
                )}
              </>
            ) : (
              <>
                {onOpenFileTransfer && filePath && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenFileTransfer(filePath);
                    }}
                    className="w-full px-4 py-3 bg-user-gradient text-white font-bold rounded-xl text-sm flex items-center justify-between shadow-md hover:brightness-110 active:scale-98 transition group border border-white/20"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-1.5 bg-white/20 rounded-lg">
                        <img src="/assets/app_logo.svg" alt="Transfer" className="w-5 h-5 object-contain" />
                      </div>
                      <div className="text-left">
                        <div className="font-aladin text-base font-bold">📡 Transfer / Share Backup via Wi-Fi</div>
                        <div className="text-[10px] font-mono text-white/80 font-normal">Start local peer server to send file to other PCs or phones</div>
                      </div>
                    </div>
                    <span className="font-mono text-xs opacity-75 group-hover:translate-x-1 transition-transform">→</span>
                  </button>
                )}

                {onOpenSchemaModal && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenSchemaModal();
                    }}
                    className="w-full px-4 py-2.5 bg-theme-card hover:bg-theme-cardHover border border-theme-border text-theme-text rounded-xl text-xs font-semibold flex items-center justify-between transition group"
                  >
                    <div className="flex items-center space-x-3">
                      <DatabaseScannerIcon className="w-4 h-4 text-theme-accentPrimary" />
                      <div className="text-left">
                        <div className="font-bold">View Database Schema & ERD</div>
                        <div className="text-[10px] font-mono text-theme-muted">Inspect tables and export documentation</div>
                      </div>
                    </div>
                    <span className="font-mono text-xs text-theme-muted group-hover:translate-x-1 transition-transform">→</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-theme-card border-t border-theme-border p-4 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-theme-bg hover:bg-theme-surface border border-theme-border text-theme-text font-bold rounded-xl transition text-xs"
          >
            Dismiss / Done
          </button>
        </div>
      </div>
    </div>
  );
};
