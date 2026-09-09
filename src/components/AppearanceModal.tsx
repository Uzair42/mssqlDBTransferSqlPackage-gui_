import React from 'react';
import {
  PaletteThemeIcon,
  CloseIcon,
  CheckCircleIcon,
  SparkleHintIcon,
} from './icons/FeatureIcons';
import { ThemeType, TypographyType, FontSizeScale, AppearanceSettings } from '../types';

interface AppearanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppearanceSettings;
  onUpdateSettings: (newSettings: Partial<AppearanceSettings>) => void;
  onResetDefaults: () => void;
}

export interface ThemeMeta {
  id: ThemeType;
  name: string;
  category: 'dark' | 'light' | 'gradient';
  description: string;
  bgHex: string;
  surfaceHex: string;
  accentHex: string;
  gradientStr: string;
  badge: string;
}

export const THEME_LIST: ThemeMeta[] = [
  {
    id: 'theme-pure-black',
    name: 'OLED Pure Black',
    category: 'dark',
    description: 'Deep pitch-black canvas with ultra high-contrast neon accents for zero eye strain.',
    bgHex: '#000000',
    surfaceHex: '#121212',
    accentHex: '#00f2fe',
    gradientStr: 'linear-gradient(90deg, #00f2fe 0%, #4facfe 100%)',
    badge: 'OLED Black',
  },
  {
    id: 'theme-pure-white',
    name: 'Clean Studio White',
    category: 'light',
    description: 'Crisp, high-clarity daylight theme with refined slate borders and azure highlights.',
    bgHex: '#f8fafc',
    surfaceHex: '#ffffff',
    accentHex: '#0284c7',
    gradientStr: 'linear-gradient(90deg, #0284c7 0%, #0369a1 100%)',
    badge: 'Light Mode',
  },
  {
    id: 'theme-monochrome-pro',
    name: 'Monochrome Pro',
    category: 'dark',
    description: 'Distraction-free grayscale palette with silver and zinc elements.',
    bgHex: '#09090b',
    surfaceHex: '#18181b',
    accentHex: '#f4f4f5',
    gradientStr: 'linear-gradient(90deg, #fafafa 0%, #71717a 100%)',
    badge: 'Monochrome',
  },
  {
    id: 'theme-lime-coral',
    name: 'Bio-Pulse Lime Coral',
    category: 'gradient',
    description: 'Vibrant cyberpunk matrix with electric lime and warm coral gradients.',
    bgHex: '#0b0f0c',
    surfaceHex: '#131915',
    accentHex: '#a9ff68',
    gradientStr: 'linear-gradient(90deg, hsla(94, 100%, 70%, 1) 0%, hsla(0, 100%, 77%, 1) 100%)',
    badge: 'Cyberpunk',
  },
  {
    id: 'theme-mint-emerald',
    name: 'Hyper Mint Emerald',
    category: 'gradient',
    description: 'Lush emerald green glow with crisp cyan accent highlights.',
    bgHex: '#05140b',
    surfaceHex: '#0a2113',
    accentHex: '#82f4b1',
    gradientStr: 'linear-gradient(90deg, hsla(145, 84%, 73%, 1) 0%, hsla(150, 61%, 48%, 1) 100%)',
    badge: 'Emerald',
  },
  {
    id: 'theme-sunset-mint',
    name: 'Solar Sunset Mint',
    category: 'gradient',
    description: 'Deep navy background with blazing sunset orange and polar mint tones.',
    bgHex: '#091118',
    surfaceHex: '#101a24',
    accentHex: '#f88b48',
    gradientStr: 'linear-gradient(90deg, hsla(154, 53%, 82%, 1) 0%, hsla(24, 88%, 65%, 1) 50%, hsla(216, 56%, 16%, 1) 100%)',
    badge: 'Solar',
  },
  {
    id: 'theme-sage-plum',
    name: 'Sage Plum Monolith',
    category: 'gradient',
    description: 'Subtle earthy sage green paired with royal amethyst purple accents.',
    bgHex: '#120e13',
    surfaceHex: '#1a151c',
    accentHex: '#a2c9b4',
    gradientStr: 'linear-gradient(90deg, hsla(155, 23%, 71%, 1) 0%, hsla(302, 17%, 32%, 1) 100%)',
    badge: 'Amethyst',
  },
  {
    id: 'theme-olive-moss',
    name: 'Olive Moss Tactical',
    category: 'gradient',
    description: 'Military tactical aesthetic with golden olive and deep moss accents.',
    bgHex: '#141707',
    surfaceHex: '#1d220c',
    accentHex: '#d4e157',
    gradientStr: 'linear-gradient(90deg, hsla(64, 73%, 16%, 1) 0%, hsla(65, 59%, 31%, 1) 100%)',
    badge: 'Tactical',
  },
];

export const TYPOGRAPHY_OPTIONS: { id: TypographyType; name: string; desc: string; sample: string; className: string }[] = [
  {
    id: 'font-jakarta',
    name: 'Plus Jakarta Sans',
    desc: 'Modern geometric sans with outstanding clarity',
    sample: 'SELECT * FROM dbo.EnterpriseData;',
    className: 'font-jakarta',
  },
  {
    id: 'font-inter',
    name: 'Inter Pro',
    desc: 'Precision engineered UI font optimized for computer screens',
    sample: 'RESTORE DATABASE [Accounting] WITH MOVE;',
    className: 'font-inter',
  },
  {
    id: 'font-jetbrains',
    name: 'JetBrains Mono',
    desc: 'Developer terminal font with distinct glyphs & symbols',
    sample: 'sqlpackage /action:Export /p:AllowIncompatiblePlatform=True',
    className: 'font-jetbrains',
  },
  {
    id: 'font-outfit',
    name: 'Outfit Grotesk',
    desc: 'Contemporary, friendly geometric typeface',
    sample: 'Database Migration Engine v1.9',
    className: 'font-outfit',
  },
  {
    id: 'font-space',
    name: 'Space Grotesk',
    desc: 'Tech-forward typeface with distinct proportional features',
    sample: 'BACKUP DATABASE [Warehouse] TO DISK',
    className: 'font-space',
  },
  {
    id: 'font-roboto',
    name: 'Roboto Pro',
    desc: 'Classic enterprise standard with natural reading flow',
    sample: 'Connected to SQL Server 2025 Express',
    className: 'font-roboto',
  },
];

export const FONT_SCALE_OPTIONS: { id: FontSizeScale; name: string; sizeLabel: string; desc: string }[] = [
  {
    id: 'scale-compact',
    name: 'Compact',
    sizeLabel: '88% (13px)',
    desc: 'Higher information density for smaller laptops',
  },
  {
    id: 'scale-normal',
    name: 'Standard',
    sizeLabel: '100% (14px)',
    desc: 'Balanced optimal size for standard desktop monitors',
  },
  {
    id: 'scale-large',
    name: 'Comfort Large',
    sizeLabel: '112% (15.5px)',
    desc: 'Enhanced legibility and comfortable line heights',
  },
  {
    id: 'scale-xlarge',
    name: 'Extra Large',
    sizeLabel: '125% (17px)',
    desc: 'Maximum visibility for presentations & 4K displays',
  },
];

export const AppearanceModal: React.FC<AppearanceModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onResetDefaults,
}) => {
  if (!isOpen) return null;

  const currentThemeMeta = THEME_LIST.find((t) => t.id === settings.theme) || THEME_LIST[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl border overflow-hidden"
        style={{
          backgroundColor: 'var(--theme-surface)',
          borderColor: 'var(--theme-border)',
          color: 'var(--theme-text)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b shrink-0"
          style={{
            borderColor: 'var(--theme-border)',
            backgroundColor: 'var(--theme-card)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="p-2.5 rounded-xl flex items-center justify-center shadow-inner"
              style={{
                background: 'var(--theme-gradient)',
                color: '#000000',
              }}
            >
              <PaletteThemeIcon className="w-6 h-6 text-black" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
                Appearance, Themes & Typography
                <span
                  className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border shadow-sm"
                  style={{
                    borderColor: 'var(--theme-border)',
                    backgroundColor: 'var(--theme-surface)',
                    color: 'var(--theme-accent-primary)',
                  }}
                >
                  Customizer
                </span>
              </h2>
              <p className="text-xs opacity-75">
                Personalize color themes (Pure Black OLED / Clean White Studio), typography font families, and UI scaling.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl transition-all duration-150 hover:opacity-80 active:scale-95 border"
            style={{
              borderColor: 'var(--theme-border)',
              backgroundColor: 'var(--theme-surface)',
            }}
          >
            <CloseIcon className="w-5 h-5 opacity-70 hover:opacity-100" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 terminal-scroll">
          {/* SECTION 1: THEMES SELECTION */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider opacity-80 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--theme-accent-primary)' }} />
                1. Visual Theme (Dark, OLED Black & Pure White)
              </h3>
              <span className="text-xs font-mono opacity-60">Active: {currentThemeMeta.name}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {THEME_LIST.map((theme) => {
                const isSelected = settings.theme === theme.id;
                return (
                  <button
                    key={theme.id}
                    onClick={() => onUpdateSettings({ theme: theme.id })}
                    className={`relative text-left p-3.5 rounded-xl border transition-all duration-200 flex flex-col justify-between group ${
                      isSelected
                        ? 'ring-2 ring-offset-2 ring-offset-black scale-[1.02] shadow-lg'
                        : 'opacity-85 hover:opacity-100 hover:border-opacity-100'
                    }`}
                    style={{
                      backgroundColor: theme.surfaceHex,
                      borderColor: isSelected ? theme.accentHex : '#334155',
                      color: theme.category === 'light' ? '#0f172a' : '#ffffff',
                    }}
                  >
                    <div>
                      {/* Color Strip & Badge */}
                      <div className="flex items-center justify-between mb-2.5">
                        <div
                          className="h-3 w-14 rounded-full shadow-sm"
                          style={{ background: theme.gradientStr }}
                        />
                        <span
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded border"
                          style={{
                            borderColor: theme.accentHex,
                            color: theme.accentHex,
                            backgroundColor: theme.bgHex,
                          }}
                        >
                          {theme.badge}
                        </span>
                      </div>

                      <div className="font-bold text-sm tracking-tight flex items-center justify-between">
                        <span>{theme.name}</span>
                        {isSelected && (
                          <CheckCircleIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                        )}
                      </div>

                      <p
                        className="text-[11px] mt-1 leading-snug line-clamp-2"
                        style={{ opacity: theme.category === 'light' ? 0.75 : 0.65 }}
                      >
                        {theme.description}
                      </p>
                    </div>

                    {/* Preview Dots */}
                    <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-white/10">
                      <div className="w-3 h-3 rounded-full border border-black/30 shadow-xs" style={{ backgroundColor: theme.bgHex }} title="Background" />
                      <div className="w-3 h-3 rounded-full border border-black/30 shadow-xs" style={{ backgroundColor: theme.surfaceHex }} title="Surface" />
                      <div className="w-3 h-3 rounded-full border border-black/30 shadow-xs" style={{ backgroundColor: theme.accentHex }} title="Accent" />
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* SECTION 2: TYPOGRAPHY SELECTION */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider opacity-80 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--theme-accent-secondary)' }} />
                2. Typography & Font Family
              </h3>
              <span className="text-xs font-mono opacity-60">Active Font: {TYPOGRAPHY_OPTIONS.find(f => f.id === settings.typography)?.name}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {TYPOGRAPHY_OPTIONS.map((font) => {
                const isSelected = settings.typography === font.id;
                return (
                  <button
                    key={font.id}
                    onClick={() => onUpdateSettings({ typography: font.id })}
                    className={`p-3.5 rounded-xl border text-left transition-all duration-150 ${font.className} ${
                      isSelected
                        ? 'border-emerald-400 bg-emerald-500/10 shadow-md ring-1 ring-emerald-400'
                        : 'border-white/10 hover:border-white/30 bg-black/20 hover:bg-black/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm tracking-tight">{font.name}</span>
                      {isSelected && <CheckCircleIcon className="w-4 h-4 text-emerald-400" />}
                    </div>
                    <p className="text-[11px] opacity-65 mt-0.5">{font.desc}</p>
                    <div
                      className="mt-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-white/5 bg-black/40 truncate"
                      style={{ color: 'var(--theme-accent-primary)' }}
                    >
                      {font.sample}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* SECTION 3: FONT SIZE & UI SCALING */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider opacity-80 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--theme-accent-tertiary)' }} />
              3. Font Size & UI Scale
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {FONT_SCALE_OPTIONS.map((scale) => {
                const isSelected = settings.fontSize === scale.id;
                return (
                  <button
                    key={scale.id}
                    onClick={() => onUpdateSettings({ fontSize: scale.id })}
                    className={`p-3 rounded-xl border text-left transition-all duration-150 ${
                      isSelected
                        ? 'border-cyan-400 bg-cyan-500/10 shadow-md ring-1 ring-cyan-400'
                        : 'border-white/10 hover:border-white/30 bg-black/20 hover:bg-black/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">{scale.name}</span>
                      {isSelected && <CheckCircleIcon className="w-4 h-4 text-cyan-400" />}
                    </div>
                    <div className="text-xs font-mono font-semibold text-cyan-300 mt-0.5">{scale.sizeLabel}</div>
                    <p className="text-[11px] opacity-65 mt-1 leading-tight">{scale.desc}</p>
                  </button>
                );
              })}
            </div>
          </section>

          {/* LIVE PREVIEW BANNER */}
          <div
            className="p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
            style={{
              backgroundColor: 'var(--theme-card)',
              borderColor: 'var(--theme-border)',
            }}
          >
            <div className="flex items-center gap-3">
              <SparkleHintIcon className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <div className="text-xs font-bold tracking-tight">Live UI Preview & State Persistence</div>
                <div className="text-[11px] opacity-70">
                  Settings are immediately active across all modals, ERD visualizer, SQL terminal, and saved to localStorage.
                </div>
              </div>
            </div>

            <button
              onClick={onResetDefaults}
              className="px-3 py-1.5 rounded-lg border text-xs font-semibold opacity-75 hover:opacity-100 transition-all hover:bg-white/10 shrink-0"
              style={{ borderColor: 'var(--theme-border)' }}
            >
              ↺ Reset to Defaults
            </button>
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-3 px-6 py-4 border-t shrink-0"
          style={{
            borderColor: 'var(--theme-border)',
            backgroundColor: 'var(--theme-card)',
          }}
        >
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl font-bold text-xs uppercase tracking-wider text-black transition-all shadow-md active:scale-95 hover:brightness-110"
            style={{
              background: 'var(--theme-gradient)',
            }}
          >
            Apply & Done
          </button>
        </div>
      </div>
    </div>
  );
};
