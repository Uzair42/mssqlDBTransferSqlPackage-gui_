import React, { useState, useEffect, useRef } from 'react';
import {
  TerminalConsoleIcon,
  TrashIcon,
  CopyIcon,
  CheckIcon,
  ShieldCheckIcon,
  SearchFilterIcon,
  ArrowDownIcon,
} from './icons/FeatureIcons';
import { LogItem } from '../types';

interface LogConsoleProps {
  logs: LogItem[];
  onClear: () => void;
  isRunning: boolean;
}

export const LogConsole: React.FC<LogConsoleProps> = ({
  logs,
  onClear,
  isRunning,
}) => {
  const [filterText, setFilterText] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logic
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter((log) =>
    filterText === '' ? true : log.content.toLowerCase().includes(filterText.toLowerCase())
  );

  const handleCopy = () => {
    const rawText = logs.map((l) => `[${l.timestamp}] [${l.type.toUpperCase()}] ${l.content}`).join('\n');
    navigator.clipboard.writeText(rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div data-tour-log-console="true" className="bg-theme-surface border border-theme-border rounded-2xl flex flex-col h-full overflow-hidden shadow-2xl">
      {/* Console Header Bar */}
      <div className="bg-theme-card px-4 py-3 border-b border-theme-border flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block shadow-xs"></span>
            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block shadow-xs"></span>
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block shadow-xs"></span>
          </div>
          <div className="flex items-center space-x-2 pl-2 border-l border-theme-border">
            <TerminalConsoleIcon className="w-4 h-4 text-theme-accentPrimary" />
            <span className="font-aladin text-lg tracking-wide text-theme-text font-bold">
              sqlpackage Terminal Output
            </span>
          </div>

          {/* Masked Security Verification Badge */}
          <div className="flex items-center space-x-1 px-2 py-0.5 bg-theme-bg border border-emerald-500/40 rounded text-[10px] font-mono text-emerald-300">
            <ShieldCheckIcon className="w-3 h-3 text-emerald-400" />
            <span>Passwords Masked</span>
          </div>
        </div>

        {/* Console Controls */}
        <div className="flex items-center space-x-2">
          {/* Search Filter */}
          <div className="relative">
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Filter logs..."
              className="w-32 focus:w-48 transition-all bg-theme-bg border border-theme-border focus:border-theme-accentPrimary text-[11px] font-mono rounded-lg pl-7 pr-2 py-1 text-theme-text placeholder-theme-muted focus:outline-none"
            />
            <SearchFilterIcon className="w-3 h-3 text-theme-muted absolute left-2 top-2" />
          </div>

          {/* Auto Scroll Toggle */}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            title={autoScroll ? 'Auto-scroll enabled' : 'Auto-scroll disabled'}
            className={`p-1.5 rounded-lg border transition ${
              autoScroll
                ? 'bg-user-gradient text-white font-extrabold border-transparent shadow-sm'
                : 'bg-theme-bg border-theme-border text-theme-muted hover:text-theme-text'
            }`}
          >
            <ArrowDownIcon className="w-3.5 h-3.5" />
          </button>

          {/* Copy Logs */}
          <button
            onClick={handleCopy}
            disabled={logs.length === 0}
            title="Copy logs to clipboard"
            className="p-1.5 bg-theme-bg hover:bg-theme-cardHover disabled:opacity-40 text-theme-text border border-theme-border rounded-lg transition"
          >
            {copied ? (
              <CheckIcon className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <CopyIcon className="w-3.5 h-3.5 text-theme-accentPrimary" />
            )}
          </button>

          {/* Clear Logs */}
          <button
            onClick={onClear}
            disabled={logs.length === 0}
            title="Clear console window"
            className="p-1.5 bg-theme-bg hover:bg-theme-cardHover disabled:opacity-40 text-theme-muted hover:text-red-400 border border-theme-border rounded-lg transition"
          >
            <TrashIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Log Output Body */}
      <div
        ref={scrollRef}
        className="flex-1 p-4 font-mono text-xs overflow-y-auto space-y-1 terminal-scroll bg-theme-bg text-theme-text select-text"
      >
        {filteredLogs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-theme-muted space-y-2 py-12">
            <TerminalConsoleIcon className="w-10 h-10 text-theme-muted stroke-[1.2]" />
            <p className="font-aladin text-2xl text-theme-text font-bold">No process logs to display.</p>
            <p className="font-annie text-lg text-theme-muted tracking-wide">
              Fill in connection details and click Export to launch sqlpackage.
            </p>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isError = log.type === 'error';
            const isStderr = log.type === 'stderr';
            const isInfo = log.type === 'info';

            return (
              <div
                key={log.id}
                className={`flex space-x-2 leading-relaxed px-1.5 py-0.5 rounded transition ${
                  isError
                    ? 'text-red-400 bg-red-950/40 border-l-2 border-red-500 pl-2'
                    : isStderr
                    ? 'text-amber-300 bg-amber-950/30 border-l-2 border-amber-500 pl-2'
                    : isInfo
                    ? 'text-cyan-300 border-l-2 border-cyan-500 pl-2'
                    : 'text-emerald-300 hover:bg-theme-card/60'
                }`}
              >
                <span className="text-theme-muted shrink-0 text-[10px] select-none">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className="whitespace-pre-wrap break-all">{log.content}</span>
              </div>
            );
          })
        )}

        {isRunning && (
          <div className="flex items-center space-x-2 text-theme-accentPrimary pt-2 font-mono text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>sqlpackage operation in progress...</span>
          </div>
        )}
      </div>
    </div>
  );
};
