import { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { ConnectionForm } from './components/ConnectionForm';
import { LogConsole } from './components/LogConsole';
import { DependencyModal } from './components/DependencyModal';
import { StatusBanner } from './components/StatusBanner';
import {
  ConnectionConfig,
  ConnectionTestResult,
  LogItem,
  DownloadProgress,
  SqlpackageStatus,
  BakFileInfo,
  FileMove,
} from './types';

export function App() {
  const [engineStatus, setEngineStatus] = useState<SqlpackageStatus | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [isDownloadingModalOpen, setIsDownloadingModalOpen] = useState(false);

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

  const [config, setConfig] = useState<ConnectionConfig>({
    action: 'Export',
    server: 'localhost',
    port: '1433',
    authType: 'sql',
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

  useEffect(() => {
    checkStatus();
    if (!window.electronAPI) return;

    const unsubscribeLog = window.electronAPI.onSqlpackageLog((log) => {
      setLogs((prev) => [...prev, {
        id: Math.random().toString(36).substring(2, 9),
        type: log.type as any,
        timestamp: log.timestamp,
        content: log.content,
      }]);
    });

    const unsubscribeProgress = window.electronAPI.onDownloadProgress((prog) => {
      setDownloadProgress(prog);
      if (prog.status === 'completed') {
        setTimeout(() => setIsDownloadingModalOpen(false), 1500);
      }
    });

    return () => {
      if (unsubscribeLog) unsubscribeLog();
      if (unsubscribeProgress) unsubscribeProgress();
    };
  }, [checkStatus]);

  const handleConfigChange = (updated: Partial<ConnectionConfig>) => {
    setConfig((prev) => ({ ...prev, ...updated }));
    if (testResult) setTestResult(null);
  };

  const handleSelectSavePath = async () => {
    if (!window.electronAPI) return;
    const isBak = config.action === 'Backup';
    const ext = isBak ? 'bak' : 'bacpac';
    const defaultName = config.database
      ? `${config.database}_${new Date().toISOString().slice(0, 10)}.${ext}`
      : `export.${ext}`;
    const chosenPath = await window.electronAPI.selectSavePath(defaultName, ext);
    if (chosenPath) setConfig((prev) => ({ ...prev, targetFile: chosenPath }));
  };

  const handleSelectBakFile = async () => {
    if (!window.electronAPI) return;
    const chosenPath = await window.electronAPI.selectOpenPath('Select .bak Backup File to Restore');
    if (chosenPath) {
      setConfig((prev) => ({ ...prev, targetFile: chosenPath }));
      // Auto-fetch file list
      await handleFetchFileList(chosenPath);
    }
  };

  const handleFetchFileList = async (bakPath?: string) => {
    if (!window.electronAPI) return;
    const filePath = bakPath || config.targetFile;
    if (!filePath) return;

    setIsFetchingFileList(true);
    setBakFileList([]);
    setFileMoves([]);

    try {
      const connConfig = {
        server: config.server,
        port: config.port,
        authType: config.authType,
        username: config.username,
        password: config.password,
        trustServerCertificate: config.trustServerCertificate,
      };

      const res = await window.electronAPI.sqlcmdFileList(connConfig, filePath);
      if (res.success && res.files && res.files.length > 0) {
        setBakFileList(res.files);

        // Auto-detect server default paths
        const pathRes = await window.electronAPI.sqlcmdServerPaths(connConfig);
        const dataDir = pathRes.dataPath || '/var/opt/mssql/data/';
        const logDir = pathRes.logPath || dataDir;

        // Auto-generate file move targets
        const dbName = config.database || 'restored_db';
        const moves: FileMove[] = res.files.map((f) => {
          const ext = f.type === 'L' ? '_log.ldf' : '.mdf';
          const dir = f.type === 'L' ? logDir : dataDir;
          return {
            logicalName: f.logicalName,
            targetPath: `${dir}${dbName}${ext}`,
          };
        });
        setFileMoves(moves);
      } else {
        setBannerStatus({ type: 'error', message: res.message || 'Could not read .bak file list.' });
      }
    } catch (err) {
      setBannerStatus({ type: 'error', message: (err as Error).message });
    } finally {
      setIsFetchingFileList(false);
    }
  };

  const handleTestConnection = async () => {
    if (!window.electronAPI) return;
    setIsTestingConnection(true);
    setTestResult(null);
    try {
      // For Backup/Restore_Bak, use Export action for testing since they use tedious directly
      const testConfig = { ...config, action: 'Export' as const };
      const res = await window.electronAPI.testConnection(testConfig);
      setTestResult(res);
    } catch (err) {
      setTestResult({ success: false, message: 'Connection Test Failed', details: (err as Error).message });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleExport = async () => {
    if (!window.electronAPI) return;
    let activeConfig = { ...config };

    // ─── BACKUP .bak ───────────────────────────────────────────────
    if (activeConfig.action === 'Backup') {
      const ext = 'bak';
      const defaultName = activeConfig.database
        ? `${activeConfig.database}_${new Date().toISOString().slice(0, 10)}.${ext}`
        : `backup.${ext}`;
      const chosenPath = await window.electronAPI.selectSavePath(activeConfig.targetFile || defaultName, ext);
      if (!chosenPath) return;

      activeConfig = { ...activeConfig, targetFile: chosenPath };
      setConfig(activeConfig);
      setIsRunning(true);
      setBannerStatus(null);
      setLogs([]);

      try {
        const res = await window.electronAPI.sqlcmdBackup({
          server: activeConfig.server,
          port: activeConfig.port,
          authType: activeConfig.authType,
          username: activeConfig.username,
          password: activeConfig.password,
          trustServerCertificate: activeConfig.trustServerCertificate,
          database: activeConfig.database,
          backupPath: chosenPath,
        });
        setBannerStatus({
          type: res.success ? 'success' : 'error',
          message: res.message,
        });
      } catch (err) {
        setBannerStatus({ type: 'error', message: (err as Error).message });
      } finally {
        setIsRunning(false);
      }
      return;
    }

    // ─── RESTORE .bak ──────────────────────────────────────────────
    if (activeConfig.action === 'Restore_Bak') {
      if (!activeConfig.targetFile) {
        const chosenPath = await window.electronAPI.selectOpenPath('Select .bak File to Restore');
        if (!chosenPath) return;
        activeConfig = { ...activeConfig, targetFile: chosenPath };
        setConfig(activeConfig);
        await handleFetchFileList(chosenPath);
        return; // User needs to review file list first
      }

      if (fileMoves.length === 0) {
        setBannerStatus({ type: 'error', message: 'Please select a .bak file and wait for logical file detection before restoring.' });
        return;
      }

      setIsRunning(true);
      setBannerStatus(null);
      setLogs([]);

      try {
        const res = await window.electronAPI.sqlcmdRestore({
          server: activeConfig.server,
          port: activeConfig.port,
          authType: activeConfig.authType,
          username: activeConfig.username,
          password: activeConfig.password,
          trustServerCertificate: activeConfig.trustServerCertificate,
          bakFilePath: activeConfig.targetFile,
          targetDatabase: activeConfig.database,
          fileMoves,
        });
        setBannerStatus({
          type: res.success ? 'success' : 'error',
          message: res.message,
        });
      } catch (err) {
        setBannerStatus({ type: 'error', message: (err as Error).message });
      } finally {
        setIsRunning(false);
      }
      return;
    }

    // ─── EXPORT / IMPORT .bacpac ───────────────────────────────────
    if (activeConfig.action === 'Export') {
      const defaultName = activeConfig.database
        ? `${activeConfig.database}_${new Date().toISOString().slice(0, 10)}.bacpac`
        : 'export.bacpac';
      const chosenPath = await window.electronAPI.selectSavePath(activeConfig.targetFile || defaultName, 'bacpac');
      if (!chosenPath) return;
      activeConfig = { ...activeConfig, targetFile: chosenPath };
      setConfig(activeConfig);
    } else if (activeConfig.action === 'Import') {
      if (!activeConfig.targetFile) {
        const chosenPath = await window.electronAPI.selectSavePath('source_restore.bacpac', 'bacpac');
        if (!chosenPath) return;
        activeConfig = { ...activeConfig, targetFile: chosenPath };
        setConfig(activeConfig);
      }
    }

    setIsRunning(true);
    setBannerStatus(null);
    setLogs([]);

    const actionLabel = activeConfig.action === 'Export' ? 'Export .bacpac' : 'Import / Restore';

    try {
      const res = await window.electronAPI.exportDatabase(activeConfig);
      setBannerStatus({
        type: res.success ? 'success' : 'error',
        message: res.success
          ? `Success! Database ${actionLabel} completed for ${activeConfig.database}.`
          : res.message || `${actionLabel} failed.`,
      });
    } catch (err) {
      setBannerStatus({ type: 'error', message: `Execution exception: ${(err as Error).message}` });
    } finally {
      setIsRunning(false);
    }
  };

  const handleCancel = async () => {
    if (!window.electronAPI) return;
    try {
      await window.electronAPI.cancelExport();
      setBannerStatus({ type: 'error', message: 'Cancellation signal dispatched.' });
    } catch (err) {
      console.error('Failed to cancel:', err);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-forest-950 text-emerald-50 overflow-hidden font-sans">
      <Header status={engineStatus} onRedownload={triggerDownload} />

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
    </div>
  );
}

export default App;
