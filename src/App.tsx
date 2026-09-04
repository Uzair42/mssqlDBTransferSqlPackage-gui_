import { useState, useEffect, useCallback } from 'react';
import { Header, ThemeType } from './components/Header';
import { ConnectionForm } from './components/ConnectionForm';
import { LogConsole } from './components/LogConsole';
import { DependencyModal } from './components/DependencyModal';
import { StatusBanner } from './components/StatusBanner';
import { ProductTourModal } from './components/ProductTourModal';
import { InteractiveWalkthrough } from './components/InteractiveWalkthrough';
import { FileTransferModal } from './components/FileTransferModal';
import { SchemaViewerModal } from './components/SchemaViewerModal';
import {
  ConnectionConfig,
  ConnectionTestResult,
  LogItem,
  DownloadProgress,
  SqlpackageStatus,
  BakFileInfo,
  FileMove,
  EnvironmentInfo,
  ServerVersionInfo,
} from './types';

export function App() {
  const [currentTheme, setCurrentTheme] = useState<ThemeType>(() => {
    const saved = (localStorage.getItem('mssql_migrator_theme') || localStorage.getItem('nano_bana_theme')) as ThemeType;
    return saved || 'theme-lime-coral';
  });

  const handleThemeChange = (newTheme: ThemeType) => {
    setCurrentTheme(newTheme);
    localStorage.setItem('mssql_migrator_theme', newTheme);
  };

  const [engineStatus, setEngineStatus] = useState<SqlpackageStatus | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [isDownloadingModalOpen, setIsDownloadingModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isSchemaModalOpen, setIsSchemaModalOpen] = useState(false);
  const [lastCreatedBackupPath, setLastCreatedBackupPath] = useState<string>('');

  const [envInfo, setEnvInfo] = useState<EnvironmentInfo | null>(null);
  const [serverInfo, setServerInfo] = useState<ServerVersionInfo | null>(null);

  const [isRunning, setIsRunning] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);

  const [bannerStatus, setBannerStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const [logs, setLogs] = useState<LogItem[]>([]);

  // Restore .bak state
  const [bakFileList, setBakFileList] = useState<BakFileInfo[]>([]);
  const [fileMoves, setFileMoves] = useState<FileMove[]>([]);
  const [isFetchingFileList, setIsFetchingFileList] = useState(false);

  // Guidance & Onboarding State
  const [isTourModalOpen, setIsTourModalOpen] = useState(() => {
    return localStorage.getItem('sqlpackage_gui_has_seen_tour') !== 'true';
  });
  const [isWalkthroughActive, setIsWalkthroughActive] = useState(false);
  const [isGuideModeActive, setIsGuideModeActive] = useState(true);

  const [config, setConfig] = useState<ConnectionConfig>({
    action: 'Export',
    server: 'localhost',
    port: '1433',
    authType: 'sql',
    useCurrentWindowsUser: false,
    username: 'sa',
    password: '',
    database: '',
    targetFile: '',
    trustServerCertificate: true,
    compatibilityMode: 'legacy_downgrade',
    commandTimeout: 0,
    storage: 'Memory',
    allowIncompatiblePlatform: true,
    ignorePermissions: true,
    verifyExtraction: false,
  });

  const triggerDownload = async () => {
    if (!window.electronAPI) return;
    setIsDownloadingModalOpen(true);
    setDownloadProgress({ status: 'starting', percent: 0, message: 'Initializing engine acquisition...' });
    try {
      const res = await window.electronAPI.downloadSqlpackage();
      if (res.success) {
        const updatedStatus = await window.electronAPI.checkSqlpackageStatus();
        setEngineStatus(updatedStatus);
      }
    } catch (err) {
      setDownloadProgress({ status: 'error', percent: 0, message: `Download failed: ${(err as Error).message}` });
    }
  };

  const checkStatus = useCallback(async () => {
    try {
      if (!window.electronAPI || typeof window.electronAPI.checkSqlpackageStatus !== 'function') return;
      const status = await window.electronAPI.checkSqlpackageStatus();
      setEngineStatus(status);
      if (!status.exists) {
        setIsDownloadingModalOpen(true);
        triggerDownload();
      }
    } catch (err) {
      console.error('Failed to verify sqlpackage engine status:', err);
    }
  }, []);

  const fetchEnvInfo = useCallback(async () => {
    try {
      if (window.electronAPI?.getEnvironmentInfo) {
        const info = await window.electronAPI.getEnvironmentInfo();
        setEnvInfo(info);
      }
    } catch (err) {
      console.error('Failed to fetch environment info:', err);
    }
  }, []);

  useEffect(() => {
    checkStatus();
    fetchEnvInfo();

    if (!window.electronAPI) return;

    let unsubLog: (() => void) | undefined;
    if (typeof window.electronAPI.onLog === 'function') {
      unsubLog = window.electronAPI.onLog((item) => {
        const logEntry: LogItem = {
          id: (item as any).id || `${Date.now()}-${Math.random()}`,
          timestamp: item.timestamp,
          type: item.type,
          content: item.content,
        };
        setLogs((prev) => [...prev, logEntry]);
      });
    } else if (typeof window.electronAPI.onSqlpackageLog === 'function') {
      unsubLog = window.electronAPI.onSqlpackageLog((item) => {
        const logEntry: LogItem = {
          id: (item as any).id || `${Date.now()}-${Math.random()}`,
          timestamp: item.timestamp,
          type: item.type,
          content: item.content,
        };
        setLogs((prev) => [...prev, logEntry]);
      });
    }

    let unsubProgress: (() => void) | undefined;
    if (typeof window.electronAPI.onDownloadProgress === 'function') {
      unsubProgress = window.electronAPI.onDownloadProgress((p: DownloadProgress) => {
        setDownloadProgress(p);
        if (p.status === 'completed') {
          setTimeout(() => setIsDownloadingModalOpen(false), 1200);
        }
      });
    }

    return () => {
      if (typeof unsubLog === 'function') unsubLog();
      if (typeof unsubProgress === 'function') unsubProgress();
    };
  }, [checkStatus, fetchEnvInfo]);

  const handleConfigChange = (updated: Partial<ConnectionConfig>) => {
    setConfig((prev) => ({ ...prev, ...updated }));
  };

  const handleTestConnection = async () => {
    if (!window.electronAPI) return;
    setIsTestingConnection(true);
    setTestResult(null);
    setServerInfo(null);

    try {
      const res = await window.electronAPI.testConnection(config);
      setTestResult(res);

      if (res.success && res.serverInfo) {
        setServerInfo(res.serverInfo);
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: `Connection error: ${(err as Error).message}`,
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSelectSavePath = async () => {
    if (!window.electronAPI) return;
    const isBak = config.action === 'Backup';
    const defaultName = config.database
      ? `${config.database}_${new Date().toISOString().slice(0, 10)}.${isBak ? 'bak' : 'bacpac'}`
      : `export_${new Date().toISOString().slice(0, 10)}.${isBak ? 'bak' : 'bacpac'}`;
    const file = await window.electronAPI.selectSavePath(defaultName);
    if (file) {
      setConfig((prev) => ({ ...prev, targetFile: file }));
    }
  };

  const handleSelectBakFile = async () => {
    if (!window.electronAPI) return;
    const title = config.action === 'Import' ? 'Select .bacpac Archive File' : 'Select .bak Backup File';
    const filterExt = config.action === 'Import' ? 'bacpac' : 'bak';
    const file = await window.electronAPI.selectOpenPath(title, filterExt);
    if (file) {
      setConfig((prev) => ({ ...prev, targetFile: file }));
      if (config.action === 'Restore_Bak') {
        handleFetchFileList(file);
      }
    }
  };

  const handleFetchFileList = async (overrideBakPath?: string) => {
    const target = overrideBakPath || config.targetFile;
    if (!window.electronAPI || !target) return;
    setIsFetchingFileList(true);

    try {
      const res = await window.electronAPI.fetchBakFileList(config, target);
      if (res.success && res.files) {
        setBakFileList(res.files);
        setFileMoves(res.suggestedMoves || []);
      } else {
        setBannerStatus({
          type: 'error',
          message: `Failed to read .bak file list: ${res.message}`,
        });
      }
    } catch (err) {
      setBannerStatus({
        type: 'error',
        message: `Error reading .bak file list: ${(err as Error).message}`,
      });
    } finally {
      setIsFetchingFileList(false);
    }
  };

  const handleExport = async () => {
    if (!window.electronAPI) return;

    if ((config.action === 'Export' || config.action === 'Import') && !engineStatus?.exists) {
      setBannerStatus({
        type: 'error',
        message: 'sqlpackage CLI engine is not installed or configured on your system. Click "Acquire sqlpackage Engine" in the top bar to configure it.',
      });
      setIsDownloadingModalOpen(true);
      return;
    }

    setIsRunning(true);
    setLogs([]);
    setBannerStatus(null);

    try {
      const result = await window.electronAPI.runSqlpackage(config, fileMoves);
      if (result.success) {
        setBannerStatus({
          type: 'success',
          message: `${config.action} operation completed successfully! Output saved to: ${config.targetFile}`,
        });
        if (config.action === 'Backup' || config.action === 'Export') {
          setLastCreatedBackupPath(config.targetFile);
        }
      } else {
        setBannerStatus({
          type: 'error',
          message: `${config.action} failed: ${result.message || 'Check terminal log output below.'}`,
        });
      }
    } catch (err) {
      setBannerStatus({
        type: 'error',
        message: `Unexpected error: ${(err as Error).message}`,
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleCancel = async () => {
    if (!window.electronAPI) return;
    await window.electronAPI.cancelSqlpackage();
    setIsRunning(false);
    setBannerStatus({
      type: 'error',
      message: 'Operation cancelled by user.',
    });
  };

  return (
    <div className={`h-screen flex flex-col bg-theme-bg text-theme-text overflow-hidden font-sans relative ${currentTheme}`}>
      <Header
        status={engineStatus}
        onRedownload={triggerDownload}
        envInfo={envInfo}
        serverInfo={serverInfo}
        onOpenTour={() => setIsTourModalOpen(true)}
        onStartWalkthrough={() => {
          setIsTourModalOpen(false);
          setIsWalkthroughActive(true);
        }}
        isGuideModeActive={isGuideModeActive}
        onToggleGuideMode={() => setIsGuideModeActive(!isGuideModeActive)}
        onOpenTransferModal={() => setIsTransferModalOpen(true)}
        onOpenSchemaModal={() => setIsSchemaModalOpen(true)}
        currentTheme={currentTheme}
        onThemeChange={handleThemeChange}
      />

      <main className="flex-1 p-5 grid grid-cols-12 gap-5 min-h-0">
        <div className="col-span-12 lg:col-span-5 xl:col-span-4 flex flex-col min-h-0 space-y-3">
          {bannerStatus && (
            <StatusBanner status={bannerStatus} onDismiss={() => setBannerStatus(null)} />
          )}
          <div className="flex-1 min-h-0">
            <ConnectionForm
              config={config}
              onChange={handleConfigChange}
              onExport={handleExport}
              onCancel={handleCancel}
              onTestConnection={handleTestConnection}
              onSelectSavePath={handleSelectSavePath}
              onSelectBakFile={handleSelectBakFile}
              onFetchFileList={() => handleFetchFileList()}
              isRunning={isRunning}
              isTesting={isTestingConnection}
              testResult={testResult}
              onDismissTestResult={() => setTestResult(null)}
              bakFileList={bakFileList}
              fileMoves={fileMoves}
              onFileMoveChange={setFileMoves}
              isFetchingFileList={isFetchingFileList}
              envInfo={envInfo}
              serverInfo={serverInfo}
              isGuideModeActive={isGuideModeActive}
              onOpenSchemaModal={() => setIsSchemaModalOpen(true)}
            />
          </div>
        </div>

        <div className="col-span-12 lg:col-span-7 xl:col-span-8 flex flex-col min-h-0">
          <LogConsole logs={logs} onClear={() => setLogs([])} isRunning={isRunning} />
        </div>
      </main>

      <DependencyModal
        isOpen={isDownloadingModalOpen}
        progress={downloadProgress}
        onRetry={triggerDownload}
        onClose={() => setIsDownloadingModalOpen(false)}
      />

      <ProductTourModal
        isOpen={isTourModalOpen}
        onClose={() => setIsTourModalOpen(false)}
        onStartWalkthrough={() => {
          setIsTourModalOpen(false);
          setIsWalkthroughActive(true);
        }}
      />

      <FileTransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        defaultFilePath={lastCreatedBackupPath || config.targetFile}
      />

      <SchemaViewerModal
        isOpen={isSchemaModalOpen}
        onClose={() => setIsSchemaModalOpen(false)}
        config={config}
      />

      <InteractiveWalkthrough
        isActive={isWalkthroughActive}
        onComplete={() => setIsWalkthroughActive(false)}
      />
    </div>
  );
}

export default App;
