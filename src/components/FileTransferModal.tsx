import React, { useState, useEffect } from 'react';
import { WiFiServerInfo } from '../types';
import {
  CloseIcon,
  FolderOpenIcon,
  DownloadDocIcon,
  CheckCircleIcon,
  LoaderIcon,
  AlertTriangleIcon,
} from './icons/FeatureIcons';

interface FileTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultFilePath?: string;
  onRestoreTransferredFile?: (filePath: string) => void;
}

export const FileTransferModal: React.FC<FileTransferModalProps> = ({
  isOpen,
  onClose,
  defaultFilePath = '',
  onRestoreTransferredFile,
}) => {
  const [activeTab, setActiveTab] = useState<'wifi_send' | 'wifi_receive' | 'bluetooth'>('wifi_send');
  const [filePath, setFilePath] = useState<string>(defaultFilePath);
  const [wifiStatus, setWifiStatus] = useState<WiFiServerInfo | null>(null);
  const [isStartingServer, setIsStartingServer] = useState<boolean>(false);
  const [bluetoothResult, setBluetoothResult] = useState<{ success?: boolean; message?: string } | null>(null);
  const [isLaunchingBluetooth, setIsLaunchingBluetooth] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Receiver State
  const [remoteAddress, setRemoteAddress] = useState<string>('');
  const [securityPin, setSecurityPin] = useState<string>('');
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadResult, setDownloadResult] = useState<{
    success: boolean;
    filePath?: string;
    fileName?: string;
    sizeBytes?: number;
    message?: string;
  } | null>(null);

  useEffect(() => {
    if (defaultFilePath) {
      setFilePath(defaultFilePath);
    }
  }, [defaultFilePath]);

  useEffect(() => {
    if (!isOpen) return;

    // Check initial status
    if (window.electronAPI?.getWiFiStatus) {
      window.electronAPI.getWiFiStatus().then((status) => {
        if (status) {
          setWifiStatus(status);
          if (status.filePath) setFilePath(status.filePath);
        }
      });
    }

    // Subscribe to transfer progress updates
    let unsubscribe: (() => void) | undefined;
    if (typeof window.electronAPI?.onTransferStatusUpdate === 'function') {
      unsubscribe = window.electronAPI.onTransferStatusUpdate((status) => {
        setWifiStatus(status);
      });
    }

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBrowseFile = async () => {
    const selected = await window.electronAPI?.selectOpenPath('Select Backup File to Transfer (.bacpac or .bak)');
    if (selected) {
      setFilePath(selected);
    }
  };

  const handleStartWiFiServer = async () => {
    if (!filePath || !window.electronAPI) return;
    setIsStartingServer(true);
    try {
      const res = await window.electronAPI.startWiFiServer(filePath);
      if (res.success && res.info) {
        setWifiStatus(res.info);
      } else {
        alert(res.message || 'Failed to start Wi-Fi transfer server.');
      }
    } catch (err: any) {
      alert(`Error starting server: ${err.message}`);
    } finally {
      setIsStartingServer(false);
    }
  };

  const handleStopWiFiServer = async () => {
    if (window.electronAPI) {
      await window.electronAPI.stopWiFiServer();
    }
    setWifiStatus(null);
  };

  const handleTriggerBluetooth = async () => {
    if (!filePath || !window.electronAPI) return;
    setIsLaunchingBluetooth(true);
    setBluetoothResult(null);
    try {
      const res = await window.electronAPI.triggerBluetooth(filePath);
      setBluetoothResult(res);
    } catch (err: any) {
      setBluetoothResult({ success: false, message: err.message });
    } finally {
      setIsLaunchingBluetooth(false);
    }
  };

  const handleCopyLink = () => {
    if (wifiStatus?.url) {
      navigator.clipboard.writeText(wifiStatus.url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleDownloadFromRemote = async () => {
    if (!remoteAddress.trim() || !window.electronAPI) return;
    setIsDownloading(true);
    setDownloadResult(null);

    try {
      const res = await window.electronAPI.downloadFromRemote(remoteAddress.trim(), securityPin.trim());
      setDownloadResult(res);
    } catch (err: any) {
      setDownloadResult({
        success: false,
        message: `Download failed: ${err.message}`,
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-theme-surface border border-theme-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-theme-card border-b border-theme-border p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-theme-bg border border-theme-border rounded-xl text-theme-text font-bold text-lg">
              📡
            </div>
            <div>
              <h2 className="font-aladin text-xl text-theme-text font-bold flex items-center space-x-2">
                <span>Database Backup Transfer & Receiver Engine</span>
                <span className="text-[10px] uppercase font-mono font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-user-gradient text-white shadow-xs">
                  Wi-Fi & Bluetooth
                </span>
              </h2>
              <p className="font-annie text-base text-theme-muted tracking-wide -mt-0.5">
                Send or receive multi-GB .bacpac and .bak backups directly over your local network
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

        {/* Tab Navigation */}
        <div className="grid grid-cols-3 bg-theme-bg border-b border-theme-border px-4 pt-2 gap-1.5 text-xs font-aladin">
          <button
            onClick={() => setActiveTab('wifi_send')}
            className={`py-2 px-2 text-center text-xs font-semibold rounded-t-lg transition border-b-2 flex items-center justify-center space-x-1.5 ${
              activeTab === 'wifi_send'
                ? 'border-theme-text text-theme-text bg-theme-card font-bold'
                : 'border-transparent text-theme-muted hover:text-theme-text'
            }`}
          >
            <span>📶 Send via Wi-Fi</span>
          </button>
          <button
            onClick={() => setActiveTab('wifi_receive')}
            className={`py-2 px-2 text-center text-xs font-semibold rounded-t-lg transition border-b-2 flex items-center justify-center space-x-1.5 ${
              activeTab === 'wifi_receive'
                ? 'border-theme-text text-theme-text bg-theme-card font-bold'
                : 'border-transparent text-theme-muted hover:text-theme-text'
            }`}
          >
            <span>📥 Receive via IP:Port</span>
          </button>
          <button
            onClick={() => setActiveTab('bluetooth')}
            className={`py-2 px-2 text-center text-xs font-semibold rounded-t-lg transition border-b-2 flex items-center justify-center space-x-1.5 ${
              activeTab === 'bluetooth'
                ? 'border-theme-text text-theme-text bg-theme-card font-bold'
                : 'border-transparent text-theme-muted hover:text-theme-text'
            }`}
          >
            <span>ᛡ Bluetooth Wizard</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-theme-text flex-1">
          {/* TAB 1: WI-FI SEND */}
          {activeTab === 'wifi_send' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-theme-text">Select Backup File to Send (.bacpac or .bak)</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={filePath}
                    onChange={(e) => setFilePath(e.target.value)}
                    placeholder="/path/to/my_database.bacpac"
                    className="flex-1 bg-theme-bg border border-theme-border focus:border-theme-accentPrimary rounded-xl px-3 py-2 text-xs text-theme-text font-mono focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleBrowseFile}
                    className="px-3 py-2 bg-theme-bg hover:bg-theme-cardHover text-theme-text rounded-xl font-semibold flex items-center space-x-1 border border-theme-border shrink-0 transition"
                  >
                    <FolderOpenIcon className="w-4 h-4 text-theme-text" />
                    <span>Browse...</span>
                  </button>
                </div>
              </div>

              {!wifiStatus || !wifiStatus.active ? (
                <div className="p-4 bg-theme-card border border-theme-border rounded-xl space-y-3">
                  <div className="flex items-center space-x-2 font-aladin text-base text-theme-text">
                    <span className="text-base">🚀</span>
                    <span>Direct Wi-Fi / LAN Network Streaming</span>
                  </div>
                  <p className="font-annie text-base text-theme-muted leading-relaxed">
                    Spins up a high-speed local stream server on your Wi-Fi network. Other computers on your network can connect and download the backup directly without cloud limits or WhatsApp renaming.
                  </p>
                  <button
                    type="button"
                    disabled={!filePath || isStartingServer}
                    onClick={handleStartWiFiServer}
                    className={`w-full py-2.5 px-4 rounded-xl text-base font-aladin tracking-wider transition flex items-center justify-center space-x-2 shadow-lg ${
                      filePath && !isStartingServer
                        ? 'bg-user-gradient text-white font-bold border border-white/20 drop-shadow-sm hover:brightness-110 active:scale-98'
                        : 'bg-theme-bg text-theme-muted cursor-not-allowed border border-theme-border'
                    }`}
                  >
                    {isStartingServer ? <LoaderIcon className="w-4 h-4 animate-spin" /> : <span>⚡ Start Wi-Fi Transfer Server</span>}
                  </button>
                </div>
              ) : (
                <div className="space-y-3 p-4 bg-theme-card border border-theme-border rounded-xl shadow-lg">
                  <div className="flex items-center justify-between border-b border-theme-border pb-2">
                    <div className="flex items-center space-x-2">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                      </span>
                      <span className="font-aladin text-base text-theme-text uppercase tracking-wider">Wi-Fi Server Live</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleStopWiFiServer}
                      className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[10px] font-bold transition"
                    >
                      Stop Server
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div className="col-span-2 space-y-1">
                      <label className="text-[10px] text-theme-muted font-semibold uppercase">Receiver Download URL (Wi-Fi)</label>
                      <div className="flex items-center space-x-1.5">
                        <input
                          type="text"
                          readOnly
                          value={wifiStatus.url}
                          className="flex-1 bg-theme-bg border border-theme-border text-theme-text font-mono text-xs px-2.5 py-2 rounded-xl select-all"
                        />
                        <button
                          onClick={handleCopyLink}
                          className="px-3 py-2 bg-user-gradient text-white font-bold border border-white/20 rounded-xl text-xs shrink-0"
                        >
                          {copiedLink ? '✓ Copied' : 'Copy'}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1 text-center">
                      <label className="text-[10px] text-theme-muted font-semibold uppercase">Security PIN</label>
                      <div className="bg-theme-bg border border-theme-border text-theme-text font-mono font-bold text-base py-1.5 rounded-xl tracking-widest text-emerald-400">
                        {wifiStatus.pin}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: RECEIVE VIA IP:PORT & PIN */}
          {activeTab === 'wifi_receive' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 bg-theme-card border border-theme-border rounded-xl space-y-3">
                <div className="flex items-center space-x-2 font-aladin text-base text-theme-text">
                  <span className="text-base">📥</span>
                  <span>Receive Backup from Sender Computer</span>
                </div>
                <p className="font-annie text-base text-theme-muted leading-relaxed">
                  Enter the Sender's IP:Port and 4-Digit Security PIN shown on their screen to download the backup file directly into your local machine.
                </p>

                <div className="grid grid-cols-3 gap-2.5">
                  <div className="col-span-2 space-y-1">
                    <label className="block text-[11px] font-medium text-theme-text">
                      Sender IP:Port or URL <strong className="text-emerald-400">*</strong>
                    </label>
                    <input
                      type="text"
                      value={remoteAddress}
                      onChange={(e) => setRemoteAddress(e.target.value)}
                      placeholder="e.g. 192.168.1.15:8080 or http://192.168.1.15:8080"
                      className="w-full bg-theme-bg border border-theme-border focus:border-theme-accentPrimary rounded-xl px-3 py-2 text-xs text-theme-text placeholder-theme-muted font-mono focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-medium text-theme-text">
                      4-Digit PIN <strong className="text-emerald-400">*</strong>
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      value={securityPin}
                      onChange={(e) => setSecurityPin(e.target.value)}
                      placeholder="1234"
                      className="w-full bg-theme-bg border border-theme-border focus:border-theme-accentPrimary rounded-xl px-3 py-2 text-xs text-theme-text font-mono text-center tracking-widest font-bold focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!remoteAddress.trim() || !securityPin.trim() || isDownloading}
                  onClick={handleDownloadFromRemote}
                  className={`w-full py-2.5 px-4 rounded-xl text-base font-aladin tracking-wider transition flex items-center justify-center space-x-2 shadow-lg ${
                    remoteAddress.trim() && securityPin.trim() && !isDownloading
                      ? 'bg-user-gradient text-white font-bold border border-white/20 drop-shadow-sm hover:brightness-110 active:scale-98'
                      : 'bg-theme-bg text-theme-muted cursor-not-allowed border border-theme-border'
                  }`}
                >
                  {isDownloading ? (
                    <>
                      <LoaderIcon className="w-4 h-4 animate-spin text-white" />
                      <span>Downloading Backup Stream...</span>
                    </>
                  ) : (
                    <>
                      <DownloadDocIcon className="w-4 h-4 text-white" />
                      <span>📥 Download & Save Backup</span>
                    </>
                  )}
                </button>
              </div>

              {/* Download Result Banner */}
              {downloadResult && (
                <div
                  className={`p-4 rounded-xl border space-y-3 animate-in fade-in duration-150 ${
                    downloadResult.success
                      ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                      : 'bg-red-950/30 border-red-500/40 text-red-300'
                  }`}
                >
                  <div className="flex items-center space-x-2 font-aladin text-base font-bold">
                    {downloadResult.success ? (
                      <CheckCircleIcon className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangleIcon className="w-5 h-5 text-red-400 shrink-0" />
                    )}
                    <span>{downloadResult.message}</span>
                  </div>

                  {downloadResult.success && downloadResult.filePath && (
                    <div className="space-y-2 pt-1 border-t border-emerald-500/30">
                      <div className="text-xs font-mono text-theme-text break-all">
                        Saved File: <strong className="text-emerald-400">{downloadResult.filePath}</strong>
                      </div>

                      {onRestoreTransferredFile && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onRestoreTransferredFile(downloadResult.filePath!);
                          }}
                          className="w-full py-2 px-3 bg-user-gradient text-white rounded-xl text-xs font-bold shadow-md hover:brightness-110 active:scale-98 transition flex items-center justify-center space-x-2 border border-white/20"
                        >
                          <span>⚡ Direct Restore This Transferred Backup</span>
                          <span className="font-mono text-sm">→</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: BLUETOOTH */}
          {activeTab === 'bluetooth' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-theme-text">Select Backup File for Bluetooth (.bacpac or .bak)</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={filePath}
                    onChange={(e) => setFilePath(e.target.value)}
                    placeholder="/path/to/my_database.bacpac"
                    className="flex-1 bg-theme-bg border border-theme-border focus:border-theme-accentPrimary rounded-xl px-3 py-2 text-xs text-theme-text font-mono focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleBrowseFile}
                    className="px-3 py-2 bg-theme-bg hover:bg-theme-cardHover text-theme-text rounded-xl font-semibold flex items-center space-x-1 border border-theme-border shrink-0 transition"
                  >
                    <FolderOpenIcon className="w-4 h-4 text-theme-text" />
                    <span>Browse...</span>
                  </button>
                </div>
              </div>

              <div className="p-4 bg-theme-card border border-theme-border rounded-xl space-y-3">
                <div className="flex items-center space-x-2 font-aladin text-base text-theme-text">
                  <span className="text-base">ᛡ</span>
                  <span>Hardware Bluetooth File Transfer</span>
                </div>
                <p className="font-annie text-base text-theme-muted leading-relaxed">
                  Triggers your operating system's native Bluetooth OBEX File Transfer wizard to push files wirelessly to paired computers or Android phones.
                </p>

                <button
                  type="button"
                  disabled={!filePath || isLaunchingBluetooth}
                  onClick={handleTriggerBluetooth}
                  className={`w-full py-2.5 px-4 rounded-xl text-base font-aladin tracking-wider transition flex items-center justify-center space-x-2 shadow-lg ${
                    filePath && !isLaunchingBluetooth
                      ? 'bg-user-gradient text-white font-bold border border-white/20 drop-shadow-sm hover:brightness-110 active:scale-98'
                      : 'bg-theme-bg text-theme-muted cursor-not-allowed border border-theme-border'
                  }`}
                >
                  <span>ᛡ Launch OS Bluetooth Transfer Wizard</span>
                </button>

                {bluetoothResult && (
                  <div className={`p-2.5 rounded-xl text-xs font-mono border ${bluetoothResult.success ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300' : 'bg-red-950/40 border-red-500/50 text-red-300'}`}>
                    {bluetoothResult.message}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-theme-card border-t border-theme-border px-5 py-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-theme-bg hover:bg-theme-surface text-theme-text border border-theme-border rounded-xl text-xs font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
