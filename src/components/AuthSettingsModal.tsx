import React, { useState } from 'react';
import { ConnectionConfig, ConnectionTestResult } from '../types';
import {
  CloseIcon,
  WindowsSecurityIcon,
  SqlAuthIcon,
  TrustCertIcon,
  UserIcon,
  LockIcon,
  HashIcon,
  ServerHostIcon,
  EyeIcon,
  EyeOffIcon,
  ActivityPulseIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  LoaderIcon,
} from './icons/FeatureIcons';

interface AuthSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ConnectionConfig;
  onChange: (updated: Partial<ConnectionConfig>) => void;
  onTestConnection: () => void;
  isTesting: boolean;
  testResult: ConnectionTestResult | null;
  onDismissTestResult: () => void;
}

export const AuthSettingsModal: React.FC<AuthSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onChange,
  onTestConnection,
  isTesting,
  testResult,
  onDismissTestResult,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [specifyDomainUser, setSpecifyDomainUser] = useState(
    Boolean(config.domain || (config.authType === 'windows' && config.username))
  );

  if (!isOpen) return null;

  const handleAuthTypeChange = (type: 'sql' | 'windows') => {
    onChange({
      authType: type,
      useCurrentWindowsUser: type === 'windows' && !specifyDomainUser,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-theme-surface border border-theme-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-theme-card border-b border-theme-border p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-theme-bg border border-theme-accentPrimary/40 rounded-xl text-theme-accentPrimary shadow-sm">
              <SqlAuthIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-aladin text-xl text-theme-text font-bold">
                MSSQL Authentication & Connection Settings
              </h2>
              <p className="font-annie text-base text-theme-muted tracking-wide -mt-0.5">
                Configure SQL credentials, Windows SSPI, server ports & SSL certificates
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-theme-muted hover:text-white bg-theme-bg hover:bg-red-500/20 hover:border-red-500/40 border border-theme-border rounded-xl transition"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Server Host & Port */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1">
              <label className="block text-[11px] font-medium text-theme-text flex items-center space-x-1.5">
                <ServerHostIcon className="w-3.5 h-3.5 text-theme-accentPrimary" />
                <span>Server Host / IP Address <strong className="text-emerald-400">*</strong></span>
              </label>
              <input
                type="text"
                value={config.server}
                onChange={(e) => onChange({ server: e.target.value })}
                placeholder="localhost, 127.0.0.1 or 192.168.1.100"
                className="w-full bg-theme-bg border border-theme-border focus:border-theme-accentPrimary rounded-xl px-3 py-2 text-xs text-theme-text placeholder-theme-muted focus:outline-none font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-theme-text flex items-center space-x-1.5">
                <HashIcon className="w-3.5 h-3.5 text-theme-muted" />
                <span>TCP Port</span>
              </label>
              <input
                type="text"
                value={config.port}
                onChange={(e) => onChange({ port: e.target.value })}
                placeholder="1433"
                className="w-full bg-theme-bg border border-theme-border focus:border-theme-accentPrimary rounded-xl px-3 py-2 text-xs text-theme-text placeholder-theme-muted focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* Authentication Mode Tabs */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-medium text-theme-text">
              Authentication Protocol
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-theme-bg border border-theme-border rounded-xl">
              <button
                type="button"
                onClick={() => handleAuthTypeChange('sql')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold transition flex items-center justify-center space-x-2 ${
                  config.authType === 'sql'
                    ? 'bg-theme-card text-theme-accentPrimary font-bold border border-theme-accentPrimary/50 shadow-sm'
                    : 'text-theme-muted hover:text-theme-text font-medium'
                }`}
              >
                <SqlAuthIcon className="w-4 h-4" />
                <span>SQL Server Authentication</span>
              </button>
              <button
                type="button"
                onClick={() => handleAuthTypeChange('windows')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold transition flex items-center justify-center space-x-2 ${
                  config.authType === 'windows'
                    ? 'bg-theme-card text-theme-accentPrimary font-bold border border-theme-accentPrimary/50 shadow-sm'
                    : 'text-theme-muted hover:text-theme-text font-medium'
                }`}
              >
                <WindowsSecurityIcon className="w-4 h-4" />
                <span>Windows Auth (SSPI / NTLM)</span>
              </button>
            </div>
          </div>

          {/* SQL Server Auth Form */}
          {config.authType === 'sql' && (
            <div className="p-3 bg-theme-card/60 border border-theme-border rounded-xl space-y-3 animate-in fade-in duration-150">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-theme-text flex items-center space-x-1.5">
                    <UserIcon className="w-3.5 h-3.5 text-theme-muted" />
                    <span>Login Username <strong className="text-emerald-400">*</strong></span>
                  </label>
                  <input
                    type="text"
                    value={config.username}
                    onChange={(e) => onChange({ username: e.target.value })}
                    placeholder="sa"
                    className="w-full bg-theme-bg border border-theme-border focus:border-theme-accentPrimary rounded-xl px-3 py-2 text-xs text-theme-text placeholder-theme-muted focus:outline-none font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-theme-text flex items-center space-x-1.5">
                    <LockIcon className="w-3.5 h-3.5 text-theme-muted" />
                    <span>Password <strong className="text-emerald-400">*</strong></span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={config.password}
                      onChange={(e) => onChange({ password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full bg-theme-bg border border-theme-border focus:border-theme-accentPrimary rounded-xl pl-3 pr-8 py-2 text-xs text-theme-text placeholder-theme-muted focus:outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-2.5 text-theme-muted hover:text-theme-text"
                    >
                      {showPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Windows Auth Form */}
          {config.authType === 'windows' && (
            <div className="p-3 bg-theme-card/60 border border-theme-border rounded-xl space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <WindowsSecurityIcon className="w-4 h-4 text-theme-accentPrimary shrink-0" />
                  <span className="font-semibold text-theme-text">
                    {specifyDomainUser ? 'Domain / Explicit Windows Account' : 'Integrated Security (Active Windows User)'}
                  </span>
                </div>
                <label className="flex items-center space-x-1.5 text-xs text-theme-muted cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={specifyDomainUser}
                    onChange={(e) => {
                      setSpecifyDomainUser(e.target.checked);
                      onChange({
                        useCurrentWindowsUser: !e.target.checked,
                        domain: e.target.checked ? config.domain || '' : undefined,
                      });
                    }}
                    className="rounded bg-theme-bg border-theme-border text-theme-accentPrimary focus:ring-0"
                  />
                  <span>Specify Domain User</span>
                </label>
              </div>

              {!specifyDomainUser ? (
                <p className="font-annie text-base text-theme-muted leading-snug">
                  Uses native SSPI / Kerberos token from your current Windows operating system session. No password needed.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div className="space-y-1">
                    <label className="text-[10px] text-theme-muted font-mono">Domain / Host</label>
                    <input
                      type="text"
                      value={config.domain || ''}
                      onChange={(e) => onChange({ domain: e.target.value })}
                      placeholder="CORP"
                      className="w-full bg-theme-bg border border-theme-border rounded-lg px-2 py-1.5 text-xs text-theme-text font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-theme-muted font-mono">Username</label>
                    <input
                      type="text"
                      value={config.username || ''}
                      onChange={(e) => onChange({ username: e.target.value })}
                      placeholder="john.doe"
                      className="w-full bg-theme-bg border border-theme-border rounded-lg px-2 py-1.5 text-xs text-theme-text font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-theme-muted font-mono">Password</label>
                    <input
                      type="password"
                      value={config.password || ''}
                      onChange={(e) => onChange({ password: e.target.value })}
                      placeholder="••••••"
                      className="w-full bg-theme-bg border border-theme-border rounded-lg px-2 py-1.5 text-xs text-theme-text font-mono"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SSL Certificate & Compatibility Flags */}
          <div className="p-3 bg-theme-bg border border-theme-border rounded-xl space-y-2">
            <label className="flex items-center justify-between cursor-pointer select-none">
              <div className="flex items-center space-x-2">
                <TrustCertIcon className="w-4 h-4 text-emerald-400" />
                <div>
                  <span className="font-semibold text-theme-text">Trust Server Certificate</span>
                  <p className="font-annie text-sm text-theme-muted">
                    Bypasses self-signed SSL/TLS certificate warnings (Recommended for local / internal servers)
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={config.trustServerCertificate}
                onChange={(e) => onChange({ trustServerCertificate: e.target.checked })}
                className="rounded bg-theme-card border-theme-border text-theme-accentPrimary focus:ring-0 w-4 h-4"
              />
            </label>
          </div>

          {/* Test Connection Banner */}
          {testResult && (
            <div
              className={`p-3 rounded-xl border space-y-1 relative animate-in fade-in duration-150 ${
                testResult.success
                  ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                  : 'bg-red-950/30 border-red-500/40 text-red-300'
              }`}
            >
              <button
                type="button"
                onClick={onDismissTestResult}
                className="absolute top-2 right-2 text-theme-muted hover:text-white"
              >
                <CloseIcon className="w-3.5 h-3.5" />
              </button>
              <div className="flex items-center space-x-2 font-aladin text-base font-bold">
                {testResult.success ? (
                  <CheckCircleIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangleIcon className="w-4 h-4 text-red-400 shrink-0" />
                )}
                <span>{testResult.message}</span>
              </div>
              {testResult.details && (
                <p className="font-mono text-[10px] text-theme-muted whitespace-pre-wrap leading-tight pt-1">
                  {testResult.details}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-theme-card border-t border-theme-border p-4 flex items-center justify-between">
          <button
            type="button"
            onClick={onTestConnection}
            disabled={isTesting || !config.server}
            className="px-4 py-2 bg-theme-bg hover:bg-theme-surface border border-theme-border text-theme-text rounded-xl font-bold transition flex items-center space-x-2 disabled:opacity-50"
          >
            {isTesting ? (
              <LoaderIcon className="w-4 h-4 animate-spin text-theme-accentPrimary" />
            ) : (
              <ActivityPulseIcon className="w-4 h-4 text-theme-accentPrimary" />
            )}
            <span>{isTesting ? 'Testing Connection...' : 'Test Connection'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-user-gradient text-white rounded-xl font-bold shadow-md hover:brightness-110 active:scale-95 transition"
          >
            Save & Apply Settings
          </button>
        </div>
      </div>
    </div>
  );
};
