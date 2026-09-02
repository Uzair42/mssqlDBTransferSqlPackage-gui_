import React from 'react';
import { CheckCircleIcon, AlertCircleIcon, CloseIcon } from './icons/FeatureIcons';

interface StatusBannerProps {
  status: { type: 'success' | 'error'; message: string } | null;
  onDismiss: () => void;
}

export const StatusBanner: React.FC<StatusBannerProps> = ({ status, onDismiss }) => {
  if (!status) return null;

  const isSuccess = status.type === 'success';

  return (
    <div
      className={`p-3.5 rounded-xl border flex items-center justify-between shadow-xl transition-all animate-in slide-in-from-top-2 duration-200 ${
        isSuccess
          ? 'bg-theme-card border-emerald-500 text-emerald-300'
          : 'bg-theme-card border-red-500 text-red-300'
      }`}
    >
      <div className="flex items-center space-x-3">
        {isSuccess ? (
          <CheckCircleIcon className="w-5 h-5 text-emerald-400 shrink-0" />
        ) : (
          <AlertCircleIcon className="w-5 h-5 text-red-400 shrink-0" />
        )}
        <span className="font-aladin text-base leading-relaxed">{status.message}</span>
      </div>
      <button
        onClick={onDismiss}
        className="p-1 hover:bg-theme-bg rounded transition text-theme-muted hover:text-theme-text ml-3"
      >
        <CloseIcon className="w-4 h-4" />
      </button>
    </div>
  );
};
