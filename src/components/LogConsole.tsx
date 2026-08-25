import React, { useState, useEffect, useRef } from 'react';
import {
  Terminal,
  Trash2,
  Copy,
  Check,
  ShieldCheck,
  Search,
  ArrowDownCircle,
} from 'lucide-react';
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
    <div className="bg-forest-950 border border-forest-800 rounded-2xl flex flex-col h-full overflow-hidden shadow-2xl">
      {/* Console Header Bar */}
      <div className="bg-forest-900 px-4 py-3 border-b border-forest-800 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block"></span>
          </div>
          <div className="flex items-center space-x-2 pl-2 border-l border-forest-800">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-mono font-bold text-emerald-200">
              sqlpackage Terminal Output
            </span>
          </div>

          {/* Masked Security Verification Badge */}
          <div className="flex items-center space-x-1 px-2 py-0.5 bg-emerald-950/80 border border-emerald-800/80 rounded text-[10px] font-mono text-emerald-400">
            <ShieldCheck className="w-3 h-3" />
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
              className="w-32 focus:w-44 transition-all bg-forest-950 border border-forest-800 focus:border-emerald-500 text-[11px] font-mono rounded-lg pl-7 pr-2 py-1 text-emerald-200 placeholder-forest-600 focus:outline-none"
            />
            <Search className="w-3 h-3 text-forest-600 absolute left-2 top-2" />
          </div>

          {/* Auto Scroll Toggle */}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            title={autoScroll ? 'Auto-scroll enabled' : 'Auto-scroll disabled'}
            className={`p-1.5 rounded-lg border transition ${
              autoScroll
                ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-400'
                : 'bg-forest-900 border-forest-800 text-emerald-600 hover:text-emerald-300'
            }`}
          >
            <ArrowDownCircle className="w-3.5 h-3.5" />
          </button>

          {/* Copy Logs */}
          <button
            onClick={handleCopy}
            disabled={logs.length === 0}
            title="Copy logs to clipboard"
            className="p-1.5 bg-forest-900 hover:bg-forest-850 disabled:opacity-40 text-emerald-300 border border-forest-800 rounded-lg transition"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Clear Logs */}
          <button
            onClick={onClear}
            disabled={logs.length === 0}
            title="Clear console window"
            className="p-1.5 bg-forest-900 hover:bg-forest-850 disabled:opacity-40 text-emerald-500 hover:text-red-400 border border-forest-800 rounded-lg transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Log Output Body */}
      <div
        ref={scrollRef}
        className="flex-1 p-4 font-mono text-xs overflow-y-auto space-y-1 terminal-scroll bg-forest-950 text-emerald-300 select-text"
      >
        {filteredLogs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-forest-600 space-y-2 py-12">
            <Terminal className="w-8 h-8 text-forest-700 stroke-[1.5]" />
            <p className="text-xs">No process logs to display.</p>
            <p className="text-[11px] text-forest-600">
              Fill in connection details and click Export to launch sqlpackage.
            </p>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isError = log.type === 'error' || log.type === 'stderr';
            const isInfo = log.type === 'info';

            return (
              <div
                key={log.id}
                className={`flex space-x-2 leading-relaxed hover:bg-forest-900/50 px-1 py-0.5 rounded transition ${
                  isError
                    ? 'text-red-400 bg-red-950/20 border-l-2 border-red-500 pl-2'
                    : isInfo
                    ? 'text-emerald-400 border-l-2 border-emerald-500/40 pl-2'
                    : 'text-emerald-200'
                }`}
              >
                <span className="text-forest-600 shrink-0 text-[10px] select-none">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className="whitespace-pre-wrap break-all">{log.content}</span>
              </div>
            );
          })
        )}

        {isRunning && (
          <div className="flex items-center space-x-2 text-emerald-400 pt-2 font-mono text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span>sqlpackage operation in progress...</span>
          </div>
        )}
      </div>
    </div>
  );
};
