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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-forest-900 border border-forest-800 w-full max-w-md rounded-2xl shadow-2xl p-6 relative overflow-hidden">
        {/* Top Glow Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600"></div>

        {/* Close Button if completed or error */}
        {(isCompleted || isError) && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-emerald-400/60 hover:text-white transition p-1"
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
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
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
            <h3 className="text-base font-bold text-white">
              {isError
                ? 'Engine Setup Failed'
                : isCompleted
                ? 'sqlpackage Engine Ready'
                : 'Acquiring sqlpackage Engine'}
            </h3>
            <p className="text-xs text-emerald-400/70">
              Official Microsoft Standalone Binary Package
            </p>
          </div>
        </div>

        {/* Status Message */}
        <div className="space-y-3 mb-6">
          <p className="text-xs text-emerald-100 font-mono leading-relaxed bg-forest-950 p-3 rounded-xl border border-forest-800 min-h-[50px] flex items-center">
            {progress?.message || 'Initializing download engine...'}
          </p>

          {/* Progress Bar */}
          {!isError && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] font-mono text-emerald-400">
                <span>Status: {progress?.status || 'starting'}</span>
                <span>{progress?.percent || 0}%</span>
              </div>
              <div className="w-full h-2 bg-forest-950 rounded-full overflow-hidden border border-forest-800">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300 rounded-full"
                  style={{ width: `${progress?.percent || 0}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* Details Box */}
        <div className="p-3 bg-forest-950/60 border border-forest-800 rounded-xl space-y-1.5 mb-6 text-xs font-mono text-emerald-300">
          <div className="flex items-center space-x-2">
            <HardDriveIcon className="w-3.5 h-3.5 text-emerald-400" />
            <span>Target OS: {process.platform}</span>
          </div>
          <p className="text-[11px] text-emerald-400/60 leading-normal">
            Downloads and configures standalone sqlpackage CLI dependencies with proper permissions.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3">
          {isError && (
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-2 transition shadow-lg shadow-emerald-950/50"
            >
              <RefreshIcon className="w-3.5 h-3.5" />
              <span>Retry Download</span>
            </button>
          )}

          {isCompleted && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition"
            >
              Get Started
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
