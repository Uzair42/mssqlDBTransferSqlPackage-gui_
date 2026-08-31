import React, { useState } from 'react';
import { InfoCircleIcon, SparkleHintIcon, CloseIcon } from './icons/FeatureIcons';

interface HotspotProps {
  title: string;
  description: string;
  tip?: string;
  isActive?: boolean;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export const Hotspot: React.FC<HotspotProps> = ({
  title,
  description,
  tip,
  isActive = true,
  position = 'top',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!isActive) return null;

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      {/* Pulsing Hotspot Trigger Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className="relative flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/40 hover:text-white transition focus:outline-none"
        title={title}
      >
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
      </button>

      {/* Popover Micro-Card */}
      {isOpen && (
        <div
          className={`absolute z-50 w-64 p-3 bg-forest-950/95 border border-emerald-500/40 rounded-xl shadow-2xl backdrop-blur-md text-emerald-100 text-left pointer-events-auto animate-in fade-in zoom-in-95 duration-150 ${positionClasses[position]}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-emerald-500/20 pb-1.5 mb-1.5">
            <div className="flex items-center space-x-1.5">
              <SparkleHintIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="font-bold text-[11px] text-white tracking-wide">{title}</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-emerald-400/60 hover:text-emerald-200 transition p-0.5"
            >
              <CloseIcon className="w-3 h-3" />
            </button>
          </div>
          <p className="text-[11px] text-emerald-200/90 leading-relaxed font-normal">
            {description}
          </p>
          {tip && (
            <div className="mt-2 pt-1.5 border-t border-emerald-500/10 flex items-start space-x-1 text-[10px] text-teal-300/90 bg-emerald-950/40 p-1.5 rounded-lg">
              <InfoCircleIcon className="w-3 h-3 text-teal-400 shrink-0 mt-0.5" />
              <span><strong>Tip:</strong> {tip}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
