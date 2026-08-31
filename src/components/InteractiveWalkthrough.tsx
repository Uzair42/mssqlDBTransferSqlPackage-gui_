import React, { useState, useEffect, useRef } from 'react';
import {
  CompassGuideIcon,
  CloseIcon,
  ArrowLeftIcon,
  CheckIcon,
  ChevronRightIcon,
} from './icons/FeatureIcons';
import { WalkthroughStep } from '../types';

interface InteractiveWalkthroughProps {
  isActive: boolean;
  onComplete: () => void;
}

const TOUR_STEPS: WalkthroughStep[] = [
  {
    target: 'data-tour-action-tabs',
    title: '1. Select Migration Mode',
    description: 'Switch between portable .bacpac (Export & Import for version downgrades) and native .bak (Backup & Restore with automatic logical file mapping).',
    position: 'right',
  },
  {
    target: 'data-tour-server-auth',
    title: '2. Connection & 1-Click Windows Auth',
    description: 'Connect with zero password friction using Windows Integrated Security (SSPI) or specify Domain/SQL Server credentials. Test connection live with real-time server telemetry.',
    position: 'right',
  },
  {
    target: 'data-tour-db-select',
    title: '3. Database & Target File Selector',
    description: 'Automatically discover online databases on your instance with one click, and browse local file paths for destination archives.',
    position: 'right',
  },
  {
    target: 'data-tour-downgrade-options',
    title: '4. Downgrade & Cross-Version Tuning',
    description: 'Pre-configured with /p:Storage=Memory, infinite timeouts, and certificate trust to prevent crashes when migrating between Linux and Windows or across MSSQL versions.',
    position: 'right',
  },
  {
    target: 'data-tour-run-button',
    title: '5. Non-Shell Secure Execution',
    description: 'Spawns sqlpackage or native SQL engine via direct argument arrays (no shell injection risk) with instantaneous cancellation controls.',
    position: 'right',
  },
  {
    target: 'data-tour-log-console',
    title: '6. Real-Time Streaming Terminal',
    description: 'Watch progress line-by-line with in-memory password redaction, instant log search filtering, auto-scroll, and one-click copy.',
    position: 'left',
  },
];

export const InteractiveWalkthrough: React.FC<InteractiveWalkthroughProps> = ({
  isActive,
  onComplete,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const currentStep = TOUR_STEPS[currentStepIndex];

  useEffect(() => {
    if (!isActive) {
      setCurrentStepIndex(0);
      setTargetRect(null);
      return;
    }

    const updateRect = () => {
      if (!currentStep) return;
      const el = document.querySelector(`[${currentStep.target}]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        setTargetRect(el.getBoundingClientRect());
      } else {
        setTargetRect(null);
      }
    };

    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);

    const timer = setTimeout(updateRect, 300);

    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
      clearTimeout(timer);
    };
  }, [isActive, currentStepIndex, currentStep]);

  if (!isActive || !currentStep) return null;

  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === TOUR_STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      onComplete();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  // Smart non-overlapping position calculation
  let cardTop = 100;
  let cardLeft = 100;
  let arrowSide: 'left' | 'right' | 'top' | 'bottom' = 'left';

  if (targetRect) {
    const cardWidth = 370;
    const cardHeight = 230;
    const spacing = 22;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    // Check if element is on the left half of the screen
    const isLeftColumn = targetRect.left + targetRect.width / 2 < windowWidth / 2;

    if (isLeftColumn) {
      // Place card to the RIGHT of the target element (over the spacious console area)
      if (targetRect.right + cardWidth + spacing < windowWidth) {
        cardLeft = targetRect.right + spacing;
        cardTop = targetRect.top + (targetRect.height / 2) - (cardHeight / 2);
        arrowSide = 'left';
      } else {
        // Fallback for very small window
        cardLeft = Math.max(16, windowWidth - cardWidth - 16);
        cardTop = targetRect.bottom + spacing;
        arrowSide = 'top';
      }
    } else {
      // Element is on the right (like Console) -> Place card to the LEFT of the target
      if (targetRect.left - cardWidth - spacing > 16) {
        cardLeft = targetRect.left - cardWidth - spacing;
        cardTop = targetRect.top + 60;
        arrowSide = 'right';
      } else {
        cardLeft = 24;
        cardTop = Math.max(16, targetRect.top);
        arrowSide = 'right';
      }
    }

    // Ensure within viewport bounds
    if (cardTop + cardHeight > windowHeight - 16) {
      cardTop = windowHeight - cardHeight - 16;
    }
    if (cardTop < 16) {
      cardTop = 16;
    }
  }

  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden transition-all duration-300">
      {/* SVG Cutout Backdrop Overlay */}
      {targetRect ? (
        <svg className="absolute inset-0 w-full h-full pointer-events-auto">
          <defs>
            <mask id="spotlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              <rect
                x={targetRect.left - 6}
                y={targetRect.top - 6}
                width={targetRect.width + 12}
                height={targetRect.height + 12}
                rx="12"
                fill="black"
              />
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.78)"
            mask="url(#spotlight-mask)"
            className="transition-all duration-300"
          />
          {/* Glowing Target Highlight Box */}
          <rect
            x={targetRect.left - 6}
            y={targetRect.top - 6}
            width={targetRect.width + 12}
            height={targetRect.height + 12}
            rx="12"
            fill="none"
            stroke="#10b981"
            strokeWidth="2.5"
            strokeDasharray="6 4"
            className="animate-pulse"
          />
        </svg>
      ) : (
        <div className="absolute inset-0 bg-black/75 pointer-events-auto" />
      )}

      {/* Floating Walkthrough Step Card */}
      <div
        ref={cardRef}
        style={{ top: `${cardTop}px`, left: `${cardLeft}px` }}
        className="absolute z-50 w-[370px] bg-forest-900/95 border-2 border-emerald-500 rounded-2xl p-5 shadow-2xl shadow-emerald-950 pointer-events-auto backdrop-blur-md text-white animate-in zoom-in-95 duration-200"
      >
        {/* Dynamic Pointer Arrow indicating highlighted feature */}
        {arrowSide === 'left' && (
          <div className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-0 h-0 border-y-8 border-y-transparent border-r-8 border-r-emerald-500" />
        )}
        {arrowSide === 'right' && (
          <div className="absolute -right-2.5 top-12 w-0 h-0 border-y-8 border-y-transparent border-l-8 border-l-emerald-500" />
        )}
        {arrowSide === 'top' && (
          <div className="absolute -top-2.5 left-12 w-0 h-0 border-x-8 border-x-transparent border-b-8 border-b-emerald-500" />
        )}

        <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3 mb-3">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-emerald-500/20 border border-emerald-500/40 rounded-lg text-emerald-300">
              <CompassGuideIcon className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Interactive Tour ({currentStepIndex + 1}/{TOUR_STEPS.length})
            </span>
          </div>
          <button
            onClick={onComplete}
            className="text-forest-400 hover:text-white transition p-1"
            title="Exit Walkthrough"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        <h3 className="text-sm font-bold text-white mb-1.5">{currentStep.title}</h3>
        <p className="text-xs text-emerald-200/90 leading-relaxed mb-4">
          {currentStep.description}
        </p>

        {/* Step Progress Dots & Navigation Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-forest-800">
          <div className="flex items-center space-x-1.5">
            {TOUR_STEPS.map((_, idx) => (
              <span
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentStepIndex
                    ? 'w-5 bg-emerald-400'
                    : idx < currentStepIndex
                    ? 'w-1.5 bg-emerald-600'
                    : 'w-1.5 bg-forest-700'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center space-x-2">
            {!isFirst && (
              <button
                type="button"
                onClick={handlePrev}
                className="px-2.5 py-1.5 bg-forest-800 hover:bg-forest-700 text-forest-200 rounded-lg text-xs font-medium transition flex items-center space-x-1"
              >
                <ArrowLeftIcon className="w-3 h-3" />
                <span>Back</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1 shadow-md shadow-emerald-950"
            >
              <span>{isLast ? 'Got it!' : 'Next'}</span>
              {isLast ? <CheckIcon className="w-3 h-3 ml-1" /> : <ChevronRightIcon className="w-3 h-3 ml-1" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
