import React, { useState, useEffect, useRef } from 'react';
import {
  CloseIcon,
  ArrowLeftIcon,
  CheckIcon,
  ChevronRightIcon,
  DatabaseScannerIcon,
} from './icons/FeatureIcons';

export interface SchemaTourStep {
  target: string;
  title: string;
  badge?: string;
  description: string;
  hint?: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  icon?: React.ReactNode;
}

interface SchemaWalkthroughTourProps {
  isActive: boolean;
  onComplete: () => void;
  onSwitchTab?: (tab: 'columns' | 'data' | 'erd') => void;
}

const SCHEMA_TOUR_STEPS: SchemaTourStep[] = [
  {
    target: 'data-schema-tour-table-list',
    title: '1. Database Table Explorer & Search',
    badge: 'Explorer',
    description: 'Browse all tables with live row count badges. Use the real-time search box to filter across table names and individual column definitions instantly.',
    hint: 'Tip: Type any column name (e.g. "email" or "id") to quickly find all tables containing that column.',
    position: 'right',
  },
  {
    target: 'data-schema-tour-view-tabs',
    title: '2. Multi-Mode Visualization Tabs',
    badge: 'Navigation',
    description: 'Seamlessly switch between Schema Column Definitions, Live Table Data Preview (Top 50 records), and the Interactive Entity Relationship Diagram (ERD).',
    hint: 'Switch to ERD Mode to see graphical relational connections between tables.',
    position: 'bottom',
  },
  {
    target: 'data-schema-tour-erd-canvas',
    title: '3. Interactive ERD Drag & Drop Canvas',
    badge: 'Interactive ERD',
    description: 'Grab and drag any table card to reposition it freely across the canvas. Relationship lines dynamically bend and follow card positions in real-time.',
    hint: 'Click and drag on the canvas background to pan around, or scroll your mouse wheel to zoom in and out.',
    position: 'center',
  },
  {
    target: 'data-schema-tour-zoom-controls',
    title: '4. Canvas Zoom, Pan & Auto-Layout',
    badge: 'Navigation Controls',
    description: 'Use Zoom In (+), Zoom Out (-), Reset (100%), Fit to Screen, and Auto Grid Layout to effortlessly organize complex multi-table schemas.',
    hint: 'Click "Auto Layout" anytime to re-align all table cards into a clean matrix.',
    position: 'bottom',
  },
  {
    target: 'data-schema-tour-export-png',
    title: '5. High-Resolution PNG Screenshot Export',
    badge: 'PNG Photo Export',
    description: 'Export a crystal-clear, high-resolution PNG image of the entire ERD diagram with 1-click. Perfect for presentations, project documentation, and architecture reviews.',
    hint: 'The PNG is rendered via HTML5 canvas and captures all table columns, primary keys, and relationship lines.',
    position: 'bottom',
  },
  {
    target: 'data-schema-tour-export-docs',
    title: '6. Vector SVG & Mermaid Markdown Export',
    badge: 'Docs & Mermaid',
    description: 'Download scalable vector SVG diagrams or full Markdown (.md) documentation complete with embedded Mermaid erDiagram syntax for GitHub and Notion.',
    hint: 'Click the clipboard icon to copy the Mermaid ERD code directly for instant pasting into markdown docs.',
    position: 'bottom',
  },
  {
    target: 'data-schema-tour-data-preview',
    title: '7. Live Table Row Data Preview',
    badge: 'Live Data',
    description: 'Inspect top 50 sample records from the active database directly inside the viewer to verify table data before or after migration without opening external tools.',
    hint: 'Select any table from the sidebar and switch to "Data Preview" to query live records.',
    position: 'bottom',
  },
];

export const SchemaWalkthroughTour: React.FC<SchemaWalkthroughTourProps> = ({
  isActive,
  onComplete,
  onSwitchTab,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const currentStep = SCHEMA_TOUR_STEPS[currentStepIndex];

  // Auto-switch tabs to show relevant context
  useEffect(() => {
    if (!isActive || !onSwitchTab) return;
    if (currentStepIndex >= 2 && currentStepIndex <= 5) {
      onSwitchTab('erd');
    } else if (currentStepIndex === 6) {
      onSwitchTab('data');
    } else if (currentStepIndex === 0 || currentStepIndex === 1) {
      onSwitchTab('columns');
    }
  }, [isActive, currentStepIndex, onSwitchTab]);

  useEffect(() => {
    if (!isActive) {
      setCurrentStepIndex(0);
      setTargetRect(null);
      return;
    }

    const updateRect = () => {
      if (!currentStep) return;
      if (currentStep.position === 'center') {
        setTargetRect(null);
        return;
      }

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

  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (currentStepIndex < SCHEMA_TOUR_STEPS.length - 1) {
          setCurrentStepIndex((prev) => prev + 1);
        } else {
          onComplete();
        }
      } else if (e.key === 'ArrowLeft') {
        if (currentStepIndex > 0) {
          setCurrentStepIndex((prev) => prev - 1);
        }
      } else if (e.key === 'Escape') {
        onComplete();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, currentStepIndex, onComplete]);

  if (!isActive || !currentStep) return null;

  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === SCHEMA_TOUR_STEPS.length - 1;

  // Calculate card positioning relative to target element
  const getCardStyle = (): React.CSSProperties => {
    if (!targetRect || currentStep.position === 'center') {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        position: 'fixed',
      };
    }

    const margin = 16;
    const cardWidth = 380;
    const cardHeight = 240;

    let top = 0;
    let left = 0;

    switch (currentStep.position) {
      case 'right':
        left = targetRect.right + margin;
        top = targetRect.top + targetRect.height / 2 - cardHeight / 2;
        break;
      case 'left':
        left = targetRect.left - cardWidth - margin;
        top = targetRect.top + targetRect.height / 2 - cardHeight / 2;
        break;
      case 'top':
        left = targetRect.left + targetRect.width / 2 - cardWidth / 2;
        top = targetRect.top - cardHeight - margin;
        break;
      case 'bottom':
      default:
        left = targetRect.left + targetRect.width / 2 - cardWidth / 2;
        top = targetRect.bottom + margin;
        break;
    }

    // Keep inside viewport boundaries
    left = Math.max(margin, Math.min(window.innerWidth - cardWidth - margin, left));
    top = Math.max(margin, Math.min(window.innerHeight - cardHeight - margin, top));

    return {
      top: `${top}px`,
      left: `${left}px`,
      position: 'fixed',
    };
  };

  return (
    <div className="fixed inset-0 z-[100] pointer-events-auto">
      {/* Dark Dim Backdrop with SVG Spotlight Cutout */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none transition-all duration-300">
        <defs>
          <mask id="schema-walkthrough-mask">
            <rect width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left - 6}
                y={targetRect.top - 6}
                width={targetRect.width + 12}
                height={targetRect.height + 12}
                rx={12}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.82)"
          mask="url(#schema-walkthrough-mask)"
        />
      </svg>

      {/* Target Pulsing Highlight Frame */}
      {targetRect && (
        <div
          className="fixed pointer-events-none rounded-xl border-2 border-theme-accentPrimary shadow-[0_0_25px_rgba(169,255,104,0.5)] transition-all duration-300 animate-pulse z-[101]"
          style={{
            left: `${targetRect.left - 6}px`,
            top: `${targetRect.top - 6}px`,
            width: `${targetRect.width + 12}px`,
            height: `${targetRect.height + 12}px`,
          }}
        />
      )}

      {/* Interactive Tooltip Card */}
      <div
        ref={cardRef}
        style={getCardStyle()}
        className="w-[380px] bg-theme-surface border-2 border-theme-border rounded-2xl shadow-2xl p-5 z-[102] animate-in fade-in zoom-in-95 duration-200 flex flex-col space-y-3"
      >
        {/* Card Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 bg-theme-card border border-theme-accentPrimary/40 rounded-lg text-theme-accentPrimary">
              <DatabaseScannerIcon className="w-4 h-4" />
            </span>
            <div>
              <span className="text-[10px] font-mono uppercase font-bold text-theme-accentPrimary tracking-wider">
                {currentStep.badge || 'ERD & Schema Guide'}
              </span>
              <div className="font-mono text-[11px] text-theme-muted">
                Step {currentStepIndex + 1} of {SCHEMA_TOUR_STEPS.length}
              </div>
            </div>
          </div>

          <button
            onClick={onComplete}
            className="p-1 text-theme-muted hover:text-white hover:bg-theme-card rounded-lg transition"
            title="Exit Walkthrough (Esc)"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Card Title & Content */}
        <div className="space-y-1.5">
          <h4 className="font-aladin text-xl text-theme-text font-bold leading-snug">
            {currentStep.title}
          </h4>
          <p className="font-ballet text-sm text-theme-muted leading-relaxed">
            {currentStep.description}
          </p>
        </div>

        {/* Contextual Tip */}
        {currentStep.hint && (
          <div className="p-2.5 bg-theme-card border border-theme-border rounded-xl text-xs font-mono text-theme-text flex items-start space-x-2">
            <span className="text-amber-400 font-bold shrink-0">💡</span>
            <span className="text-[11px] leading-tight text-theme-muted">{currentStep.hint}</span>
          </div>
        )}

        {/* Step Progress Dots & Navigation Buttons */}
        <div className="pt-2 border-t border-theme-border flex items-center justify-between">
          {/* Progress Dots */}
          <div className="flex items-center space-x-1">
            {SCHEMA_TOUR_STEPS.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStepIndex(idx)}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  idx === currentStepIndex
                    ? 'w-5 bg-user-gradient'
                    : 'w-1.5 bg-theme-border hover:bg-theme-muted'
                }`}
                title={`Jump to step ${idx + 1}`}
              />
            ))}
          </div>

          {/* Next / Prev Buttons */}
          <div className="flex items-center space-x-2">
            {!isFirst && (
              <button
                onClick={() => setCurrentStepIndex((prev) => prev - 1)}
                className="px-3 py-1.5 bg-theme-card hover:bg-theme-cardHover border border-theme-border text-theme-text rounded-xl text-xs font-semibold flex items-center space-x-1 transition"
              >
                <ArrowLeftIcon className="w-3 h-3" />
                <span>Back</span>
              </button>
            )}

            <button
              onClick={() => {
                if (isLast) {
                  onComplete();
                } else {
                  setCurrentStepIndex((prev) => prev + 1);
                }
              }}
              className="px-4 py-1.5 bg-user-gradient text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-md hover:brightness-110 active:scale-95 border border-white/20 transition drop-shadow-sm"
            >
              <span>{isLast ? 'Finish Tour' : 'Next'}</span>
              {isLast ? <CheckIcon className="w-3.5 h-3.5" /> : <ChevronRightIcon className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
