import { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { ConnectionForm } from './components/ConnectionForm';
import { LogConsole } from './components/LogConsole';
import { DependencyModal } from './components/DependencyModal';
import { StatusBanner } from './components/StatusBanner';
import { ProductTourModal } from './components/ProductTourModal';
import { InteractiveWalkthrough } from './components/InteractiveWalkthrough';
import { FileTransferModal } from './components/FileTransferModal';
import { SchemaViewerModal } from './components/SchemaViewerModal';
import { AuthSettingsModal } from './components/AuthSettingsModal';
import { DatabaseFilesModal } from './components/DatabaseFilesModal';
import { PostOperationModal } from './components/PostOperationModal';
import { AppearanceModal } from './components/AppearanceModal';
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
  ThemeType,
  TypographyType,
  FontSizeScale,
  AppearanceSettings,
} from './types';

export function App() {
  const [appearanceSettings, setAppearanceSettings] = useState<AppearanceSettings>(() => {
    const savedTheme = (localStorage.getItem('mssql_migrator_theme') || 'theme-pure-black') as ThemeType;
    const savedTypography = (localStorage.getItem('mssql_migrator_typography') || 'font-jakarta') as TypographyType;
    const savedFontSize = (localStorage.getItem('mssql_migrator_font_size') || 'scale-normal') as FontSizeScale;
    return {
      theme: savedTheme,
      typography: savedTypography,
      fontSize: savedFontSize,
    };
  });

  const handleUpdateAppearance = (newSettings: Partial<AppearanceSettings>) => {
    setAppearanceSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      if (newSettings.theme) localStorage.setItem('mssql_migrator_theme', newSettings.theme);
      if (newSettings.typography) localStorage.setItem('mssql_migrator_typography', newSettings.typography);
      if (newSettings.fontSize) localStorage.setItem('mssql_migrator_font_size', newSettings.fontSize);
      return updated;
    });
  };

  const handleResetAppearance = () => {
    const defaults: AppearanceSettings = {
      theme: 'theme-pure-black',
      typography: 'font-jakarta',
      fontSize: 'scale-normal',
    };
    setAppearanceSettings(defaults);
    localStorage.setItem('mssql_migrator_theme', defaults.theme);
    localStorage.setItem('mssql_migrator_typography', defaults.typography);
    localStorage.setItem('mssql_migrator_font_size', defaults.fontSize);
  };

  const [isAppearanceModalOpen, setIsAppearanceModalOpen] = useState(false);
  const [engineStatus, setEngineStatus] = useState<SqlpackageStatus | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [isDownloadingModalOpen, setIsDownloadingModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isSchemaModalOpen, setIsSchemaModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isFilesModalOpen, setIsFilesModalOpen] = useState(false);
  const [filesModalDb, setFilesModalDb] = useState<string>('');
  const [lastCreatedBackupPath, setLastCreatedBackupPath] = useState<string>('');

  const [postOpModal, setPostOpModal] = useState<{
    isOpen: boolean;
    type: 'restore' | 'backup';
    databaseName: string;
    filePath?: string;
  }>({
    isOpen: false,
    type: 'restore',
    databaseName: '',
  });

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
      unsubProgress = window.electronAPI.onDownloadProgress((prog) => {
        setDownloadProgress({
          status: prog.status as any,
          percent: prog.percent,
          message: prog.message,
        });
        if (prog.status === 'completed') {
          checkStatus();
        }
      });
    }

    return () => {
      if (unsubLog) unsubLog();
      if (unsubProgress) unsubProgress();
    };
  }, [checkStatus, fetchEnvInfo]);

  const handleConfigChange = (updated: Partial<ConnectionConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...updated };

      if (updated.database !== undefined && updated.database !== prev.database) {
        const ext = next.action === 'Backup' ? 'bak' : 'bacpac';
        if (next.action === 'Export' || next.action === 'Backup') {
          next.targetFile = updated.database
            ? `${updated.database}_${new Date().toISOString().slice(0, 10)}.${ext}`
            : '';
        }
      }

      if (updated.action !== undefined && updated.action !== prev.action) {
        const isBak = updated.action === 'Backup' || updated.action === 'Restore_Bak';
        const ext = isBak ? 'bak' : 'bacpac';

        if (updated.action === 'Restore_Bak' || updated.action === 'Import') {
          next.targetFile = '';
        } else if (next.database) {
          next.targetFile = `${next.database}_${new Date().toISOString().slice(0, 10)}.${ext}`;
        }
      }

      return next;
    });
  };

  const handleTestConnection = async () => {
    if (!window.electronAPI) return;
    setIsTestingConnection(true);
    setTestResult(null);
    try {
      const res = await window.electronAPI.testConnection(config);
      setTestResult(res);
      if (res.serverInfo) {
        setServerInfo(res.serverInfo);
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: 'Connection Test Failed',
        details: (err as Error).message,
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSelectSavePath = async () => {
    if (!window.electronAPI) return;
    const defaultExt = config.action === 'Backup' ? 'bak' : 'bacpac';
    const defaultName = config.database
      ? `${config.database}_${new Date().toISOString().slice(0, 10)}.${defaultExt}`
      : `DatabaseBackup_${new Date().toISOString().slice(0, 10)}.${defaultExt}`;

    const path = await window.electronAPI.selectSavePath(defaultName, defaultExt);
    if (path) {
      setConfig((prev) => ({ ...prev, targetFile: path }));
    }
  };

  const handleSelectBakFile = async () => {
    if (!window.electronAPI) return;
    const path = await window.electronAPI.selectOpenPath(
      config.action === 'Import' ? 'Select .bacpac Archive' : 'Select .bak Backup File'
    );
    if (path) {
      const baseName = path.split(/[\\/]/).pop()?.replace(/\.(bacpac|bak|zip)$/i, '').replace(/_\d{4}-\d{2}-\d{2}.*$/, '') || '';
      setConfig((prev) => ({
        ...prev,
        targetFile: path,
        database: prev.database || baseName,
      }));

      if (config.action === 'Restore_Bak') {
        handleFetchFileList(path);
      }
    }
  };

  const handleFetchFileList = async (filePathToRead?: string) => {
    const target = filePathToRead || config.targetFile;
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
        const isRestoreAction = config.action === 'Restore_Bak' || config.action === 'Import';
        setBannerStatus({
          type: 'success',
          message: `${config.action} operation completed successfully! Output: ${config.targetFile || config.database}`,
        });
        if (config.action === 'Backup' || config.action === 'Export') {
          setLastCreatedBackupPath(config.targetFile);
        }

        // Open Post-Operation Smart Action Modal
        setPostOpModal({
          isOpen: true,
          type: isRestoreAction ? 'restore' : 'backup',
          databaseName: config.database || 'Database',
          filePath: config.targetFile,
        });
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

  const handleRestoreTransferredFile = (downloadedPath: string) => {
    const isBak = downloadedPath.toLowerCase().endsWith('.bak');
    const baseName = downloadedPath.split(/[\\/]/).pop()?.replace(/\.(bacpac|bak|zip)$/i, '').replace(/_\d{4}-\d{2}-\d{2}.*$/, '') || '';
    setConfig((prev) => ({
      ...prev,
      action: isBak ? 'Restore_Bak' : 'Import',
      targetFile: downloadedPath,
      database: baseName || prev.database,
    }));
    setIsTransferModalOpen(false);
    setBannerStatus({
      type: 'success',
      message: `Transferred backup file loaded: ${downloadedPath}. Ready to execute restore.`,
    });
    if (isBak) {
      handleFetchFileList(downloadedPath);
    }
  };

  return (
    <div
      className={`h-screen flex flex-col bg-theme-bg text-theme-text overflow-hidden relative transition-colors duration-200 ${appearanceSettings.theme} ${appearanceSettings.typography} ${appearanceSettings.fontSize}`}
      style={{
        backgroundColor: 'var(--theme-bg)',
        color: 'var(--theme-text)',
      }}
    >
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
        onOpenAppearanceModal={() => setIsAppearanceModalOpen(true)}
        currentTheme={appearanceSettings.theme}
        onThemeChange={(theme) => handleUpdateAppearance({ theme })}
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
              onOpenAuthModal={() => setIsAuthModalOpen(true)}
              onOpenFilesModal={(db) => {
                setFilesModalDb(db || config.database);
                setIsFilesModalOpen(true);
              }}
            />
          </div>
        </div>

        <div className="col-span-12 lg:col-span-7 xl:col-span-8 flex flex-col min-h-0">
          <LogConsole logs={logs} onClear={() => setLogs([])} isRunning={isRunning} />
        </div>
      </main>

      <AppearanceModal
        isOpen={isAppearanceModalOpen}
        onClose={() => setIsAppearanceModalOpen(false)}
        settings={appearanceSettings}
        onUpdateSettings={handleUpdateAppearance}
        onResetDefaults={handleResetAppearance}
      />

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
        onRestoreTransferredFile={handleRestoreTransferredFile}
      />

      <SchemaViewerModal
        isOpen={isSchemaModalOpen}
        onClose={() => setIsSchemaModalOpen(false)}
        config={config}
      />

      <AuthSettingsModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        config={config}
        onChange={handleConfigChange}
        onTestConnection={handleTestConnection}
        isTesting={isTestingConnection}
        testResult={testResult}
        onDismissTestResult={() => setTestResult(null)}
      />

      <DatabaseFilesModal
        isOpen={isFilesModalOpen}
        onClose={() => setIsFilesModalOpen(false)}
        config={config}
        databaseName={filesModalDb || config.database}
      />

      <PostOperationModal
        isOpen={postOpModal.isOpen}
        onClose={() => setPostOpModal((prev) => ({ ...prev, isOpen: false }))}
        operationType={postOpModal.type}
        databaseName={postOpModal.databaseName}
        filePath={postOpModal.filePath}
        onOpenSchemaModal={() => setIsSchemaModalOpen(true)}
        onOpenFileTransfer={(file) => {
          setLastCreatedBackupPath(file);
          setIsTransferModalOpen(true);
        }}
        onOpenFilesModal={() => {
          setFilesModalDb(postOpModal.databaseName);
          setIsFilesModalOpen(true);
        }}
      />

      <InteractiveWalkthrough
        isActive={isWalkthroughActive}
        onComplete={() => setIsWalkthroughActive(false)}
      />
    </div>
  );
}

export default App;
