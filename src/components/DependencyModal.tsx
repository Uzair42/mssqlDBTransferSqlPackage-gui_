import React from 'react';
import {
  DownloadCloudIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  RefreshIcon,
  HardDriveIcon,
  CloseIcon,
} from './icons/FeatureIcons';
import { DownloadProgress } from '../types';

interface DependencyModalProps {
  isOpen: boolean;
  progress: DownloadProgress | null;
  onRetry: () => void;
  onClose: () => void;
}

export const DependencyModal: React.FC<DependencyModalProps> = ({
  isOpen,
  progress,
  onRetry,
  onClose,
}) => {
  if (!isOpen) return null;

  const isError = progress?.status === 'error';
  const isCompleted = progress?.status === 'completed';

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-theme-surface border border-theme-border w-full max-w-md rounded-2xl shadow-2xl p-6 relative overflow-hidden">
        {/* Top Glow Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-user-gradient"></div>

        {/* Close Button if completed or error */}
        {(isCompleted || isError) && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-theme-muted hover:text-theme-text transition p-1"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        )}

        {/* Icon Header */}
        <div className="flex items-center space-x-4 mb-5">
          <div
            className={`p-3 rounded-2xl border ${
              isError
                ? 'bg-red-500/10 border-red-500/30 text-red-400'
                : isCompleted
                ? 'bg-theme-card border-theme-border text-emerald-400'
                : 'bg-theme-card border-theme-border text-theme-text'
            }`}
          >
            {isError ? (
              <AlertTriangleIcon className="w-7 h-7" />
            ) : isCompleted ? (
              <CheckCircleIcon className="w-7 h-7" />
            ) : (
              <DownloadCloudIcon className="w-7 h-7 animate-pulse" />
            )}
          </div>
          <div>
            <h3 className="font-aladin text-xl text-theme-text font-bold">
              {isError
                ? 'Engine Setup Failed'
                : isCompleted
                ? 'sqlpackage Engine Ready'
                : 'Acquiring sqlpackage Engine'}
            </h3>
            <p className="font-ballet text-sm text-theme-muted">
              Official Microsoft Standalone Binary Package
            </p>
          </div>
        </div>

        {/* Status Message */}
        <div className="space-y-3 mb-6">
          <p className="text-xs text-theme-text font-mono leading-relaxed bg-theme-bg p-3 rounded-xl border border-theme-border min-h-[50px] flex items-center">
            {progress?.message || 'Initializing download engine...'}
          </p>

          {/* Progress Bar */}
          {!isError && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] font-mono text-theme-text">
                <span>Status: {progress?.status || 'starting'}</span>
                <span>{progress?.percent || 0}%</span>
              </div>
              <div className="w-full h-2 bg-theme-bg rounded-full overflow-hidden border border-theme-border">
                <div
                  className="h-full bg-user-gradient transition-all duration-300 rounded-full"
                  style={{ width: `${progress?.percent || 0}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* Details Box */}
        <div className="p-3 bg-theme-bg border border-theme-border rounded-xl space-y-1.5 mb-6 text-xs font-mono text-theme-text">
          <div className="flex items-center space-x-2">
            <HardDriveIcon className="w-3.5 h-3.5 text-theme-text" />
            <span>Target OS: {navigator.userAgent.includes('Win') ? 'Windows' : navigator.userAgent.includes('Linux') ? 'Linux' : 'Cross-Platform'}</span>
          </div>
          <p className="text-[11px] text-theme-muted leading-normal">
            Downloads and configures standalone sqlpackage CLI dependencies with proper permissions.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3">
          {isError && (
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-2 transition shadow-lg"
            >
              <RefreshIcon className="w-3.5 h-3.5" />
              <span>Retry Download</span>
            </button>
          )}

          {isCompleted && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-user-gradient text-white font-extrabold rounded-xl text-xs transition shadow-lg hover:brightness-110 border border-white/20"
            >
              Get Started
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
