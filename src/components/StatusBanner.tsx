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
      className={`p-3.5 rounded-xl border flex items-center justify-between shadow-lg transition-all animate-in slide-in-from-top-2 duration-200 ${
        isSuccess
          ? 'bg-emerald-950/80 border-emerald-700 text-emerald-200'
          : 'bg-red-950/80 border-red-800 text-red-200'
      }`}
    >
      <div className="flex items-center space-x-3">
        {isSuccess ? (
          <CheckCircleIcon className="w-5 h-5 text-emerald-400 shrink-0" />
        ) : (
          <AlertCircleIcon className="w-5 h-5 text-red-400 shrink-0" />
        )}
        <span className="text-xs font-medium leading-relaxed">{status.message}</span>
      </div>
      <button
        onClick={onDismiss}
        className="p-1 hover:bg-forest-900/50 rounded transition text-emerald-400/60 hover:text-white ml-3"
      >
        <CloseIcon className="w-4 h-4" />
      </button>
    </div>
  );
};
