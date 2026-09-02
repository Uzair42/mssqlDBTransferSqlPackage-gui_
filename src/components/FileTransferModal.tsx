import React, { useState, useEffect } from 'react';
import { WiFiServerInfo } from '../types';
import { CloseIcon, FolderOpenIcon } from './icons/FeatureIcons';

interface FileTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultFilePath?: string;
}

export const FileTransferModal: React.FC<FileTransferModalProps> = ({
  isOpen,
  onClose,
  defaultFilePath = '',
}) => {
  const [activeTab, setActiveTab] = useState<'wifi' | 'bluetooth'>('wifi');
  const [filePath, setFilePath] = useState<string>(defaultFilePath);
  const [wifiStatus, setWifiStatus] = useState<WiFiServerInfo | null>(null);
  const [isStartingServer, setIsStartingServer] = useState<boolean>(false);
  const [bluetoothResult, setBluetoothResult] = useState<{ success?: boolean; message?: string } | null>(null);
  const [isLaunchingBluetooth, setIsLaunchingBluetooth] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

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
                <span>Backup File Transfer Engine</span>
                <span className="text-[10px] uppercase font-mono font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-user-gradient text-white shadow-xs">
                  Wi-Fi & Bluetooth
                </span>
              </h2>
              <p className="font-ballet text-sm text-theme-muted">
                Transfer .bacpac / .bak files directly to another computer or phone
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-theme-muted hover:text-theme-text rounded-lg hover:bg-theme-bg transition"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-2 bg-theme-bg border-b border-theme-border px-4 pt-2 gap-2 text-xs font-aladin">
          <button
            onClick={() => setActiveTab('wifi')}
            className={`py-2 px-3 text-center text-sm font-semibold rounded-t-lg transition border-b-2 flex items-center justify-center space-x-2 ${
              activeTab === 'wifi'
                ? 'border-theme-text text-theme-text bg-theme-card'
                : 'border-transparent text-theme-muted hover:text-theme-text'
            }`}
          >
            <span>📶 High-Speed Wi-Fi Network</span>
          </button>
          <button
            onClick={() => setActiveTab('bluetooth')}
            className={`py-2 px-3 text-center text-sm font-semibold rounded-t-lg transition border-b-2 flex items-center justify-center space-x-2 ${
              activeTab === 'bluetooth'
                ? 'border-theme-text text-theme-text bg-theme-card'
                : 'border-transparent text-theme-muted hover:text-theme-text'
            }`}
          >
            <span>ᛡ Laptop Bluetooth</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-theme-text flex-1">
          {/* Selected File Section */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-theme-text">Select Backup File to Transfer (.bacpac or .bak)</label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={filePath}
                onChange={(e) => setFilePath(e.target.value)}
                placeholder="/path/to/my_database.bacpac"
                className="flex-1 bg-theme-bg border border-theme-border focus:border-theme-text rounded-lg px-3 py-1.5 text-xs text-theme-text font-mono focus:outline-none"
              />
              <button
                type="button"
                onClick={handleBrowseFile}
                className="px-3 py-1.5 bg-theme-bg hover:bg-theme-border text-theme-text rounded-lg font-semibold flex items-center space-x-1 border border-theme-border shrink-0"
              >
                <FolderOpenIcon className="w-4 h-4 text-theme-text" />
                <span>Browse...</span>
              </button>
            </div>
          </div>

          {/* TAB 1: WI-FI NETWORK TRANSFER */}
          {activeTab === 'wifi' && (
            <div className="space-y-4 animate-in fade-in">
              {!wifiStatus || !wifiStatus.active ? (
                <div className="p-4 bg-theme-card border border-theme-border rounded-xl space-y-3">
                  <div className="flex items-center space-x-2 font-aladin text-base text-theme-text">
                    <span className="text-base">🚀</span>
                    <span>Direct Wi-Fi / LAN Network Sharing</span>
                  </div>
                  <p className="font-ballet text-sm text-theme-muted leading-relaxed">
                    Spins up a secure in-memory HTTP stream server on your local Wi-Fi network. Any computer or phone on the same Wi-Fi can download at high speeds.
                  </p>
                  <button
                    type="button"
                    disabled={!filePath || isStartingServer}
                    onClick={handleStartWiFiServer}
                    className={`w-full py-2.5 px-4 rounded-xl text-base font-aladin tracking-wider transition flex items-center justify-center space-x-2 shadow-lg ${
                      filePath && !isStartingServer
                        ? 'bg-user-gradient text-white font-bold border border-white/20 drop-shadow-sm hover:brightness-110'
                        : 'bg-theme-bg text-theme-muted cursor-not-allowed border border-theme-border'
                    }`}
                  >
                    <span>⚡ Start Wi-Fi Transfer Server</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3 p-4 bg-theme-card border border-theme-border rounded-xl">
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
                          className="flex-1 bg-theme-bg border border-theme-border text-theme-text font-mono text-xs px-2 py-1.5 rounded-lg select-all"
                        />
                        <button
                          onClick={handleCopyLink}
                          className="px-2.5 py-1.5 bg-user-gradient text-white font-bold border border-white/20 rounded-lg text-[10px] shrink-0"
                        >
                          {copiedLink ? '✓ Copied' : 'Copy'}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1 text-center">
                      <label className="text-[10px] text-theme-muted font-semibold uppercase">Security PIN</label>
                      <div className="bg-theme-bg border border-theme-border text-theme-text font-mono font-bold text-base py-1 rounded-lg tracking-widest">
                        {wifiStatus.pin}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: BLUETOOTH WIRELESS TRANSFER */}
          {activeTab === 'bluetooth' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 bg-theme-card border border-theme-border rounded-xl space-y-3">
                <div className="flex items-center space-x-2 font-aladin text-base text-theme-text">
                  <span className="text-base">ᛡ</span>
                  <span>Hardware Bluetooth File Transfer</span>
                </div>
                <p className="font-ballet text-sm text-theme-muted leading-relaxed">
                  Triggers your laptop's native OS Bluetooth File Transfer wizard. Ideal for direct wireless file sending when Wi-Fi is unavailable.
                </p>

                <button
                  type="button"
                  disabled={!filePath || isLaunchingBluetooth}
                  onClick={handleTriggerBluetooth}
                  className={`w-full py-2.5 px-4 rounded-xl text-base font-aladin tracking-wider transition flex items-center justify-center space-x-2 shadow-lg ${
                    filePath && !isLaunchingBluetooth
                      ? 'bg-user-gradient text-white font-bold border border-white/20 drop-shadow-sm hover:brightness-110'
                      : 'bg-theme-bg text-theme-muted cursor-not-allowed border border-theme-border'
                  }`}
                >
                  <span>ᛡ Launch OS Bluetooth Transfer Wizard</span>
                </button>

                {bluetoothResult && (
                  <div className={`p-2 rounded-lg text-xs font-mono border ${bluetoothResult.success ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300' : 'bg-red-950/40 border-red-500/50 text-red-300'}`}>
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
            className="px-4 py-1.5 bg-theme-bg hover:bg-theme-border text-theme-text border border-theme-border rounded-xl text-xs font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
