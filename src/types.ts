export interface ConnectionConfig {
  action: 'Export' | 'Import' | 'Backup' | 'Restore_Bak';
  server: string;
  port: string;
  authType: 'sql' | 'windows';
  useCurrentWindowsUser?: boolean; // When true, uses Integrated Security / SSPI
  domain?: string;                // Active Directory domain for NTLM
  username: string;
  password: string;
  database: string;
  targetFile: string;
  trustServerCertificate: boolean;

  // Cross-version & Legacy Downgrade Controls
  compatibilityMode: 'standard' | 'legacy_downgrade' | 'custom';
  commandTimeout: number;
  storage: 'File' | 'Memory';
  allowIncompatiblePlatform: boolean;
  ignorePermissions: boolean;
  verifyExtraction: boolean;
}

export interface WalkthroughStep {
  target: string;
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export interface BakFileInfo {
  logicalName: string;
  physicalName: string;
  type: string;   // 'D' = Data, 'L' = Log
  size: number;
}

export interface FileMove {
  logicalName: string;
  targetPath: string;
}

export interface EnvironmentInfo {
  localMssqlInstalled: boolean;
  localMssqlVersion?: string;
  localMssqlFriendly?: string;
  localMssqlStatus: 'active' | 'inactive' | 'not-installed';
  activeClientDriver: string;
  sqlpackageVersion?: string;
  systemOdbcDrivers: string[];
  nodeVersion: string;
  osPlatform: string;
}

export interface ServerVersionInfo {
  connected: boolean;
  server: string;
  port: string;
  productVersion: string;
  productMajorVersion: string;
  friendlyVersion: string;
  productLevel: string;
  edition: string;
  fullVersion: string;
  machineName?: string;
  instanceName?: string;
  collation?: string;
  spid?: number;
  activeDriver: string;
  engineDriver: string;
  encryption: string;
  authType: string;
  connectedAt: string;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  details?: string;
  serverInfo?: ServerVersionInfo;
}

export interface LogItem {
  id: string;
  type: 'info' | 'stdout' | 'stderr' | 'error';
  timestamp: string;
  content: string;
}

export interface DownloadProgress {
  status: 'starting' | 'downloading' | 'extracting' | 'completed' | 'error';
  percent: number;
  message: string;
}

export interface SqlpackageStatus {
  exists: boolean;
  executablePath: string;
  os: string;
}

export interface NetworkIPInfo {
  name: string;
  ip: string;
}

export interface WiFiServerInfo {
  active: boolean;
  filePath: string;
  fileName: string;
  fileSizeBytes: number;
  fileSizeFormatted: string;
  ips: NetworkIPInfo[];
  port: number;
  pin: string;
  url: string;
  transferredBytes: number;
  transferSpeedMBs: number;
  clientIp?: string;
  status: 'idle' | 'listening' | 'transferring' | 'completed' | 'error';
  errorMessage?: string;
}

export interface TableColumnDetails {
  columnName: string;
  dataType: string;
  maxLength: number | null;
  isNullable: boolean;
  ordinalPosition: number;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
}

export interface TableRelationshipInfo {
  constraintName: string;
  fkSchema: string;
  fkTable: string;
  fkColumn: string;
  fkFullName: string;
  pkSchema: string;
  pkTable: string;
  pkColumn: string;
  pkFullName: string;
}

export interface TableSchemaInfo {
  schemaName: string;
  tableName: string;
  fullName: string;
  rowCount: number;
  columns: TableColumnDetails[];
}

declare global {
  interface Window {
    electronAPI?: {
      // System & Environment
      getEnvironmentInfo: () => Promise<EnvironmentInfo>;
      fetchServerVersion: (config: ConnectionConfig) => Promise<{ success: boolean; serverInfo?: ServerVersionInfo; message?: string }>;

      // sqlpackage engine
      checkSqlpackageStatus: () => Promise<SqlpackageStatus>;
      downloadSqlpackage: () => Promise<{ success: boolean; executablePath?: string; message?: string }>;
      testConnection: (config: ConnectionConfig) => Promise<ConnectionTestResult>;
      fetchDatabases: (config: ConnectionConfig) => Promise<{ success: boolean; databases?: string[]; serverInfo?: ServerVersionInfo; message?: string }>;
      fetchDatabaseSchema: (config: ConnectionConfig, databaseName?: string) => Promise<{ success: boolean; tables?: TableSchemaInfo[]; relationships?: TableRelationshipInfo[]; message?: string }>;
      fetchTableData: (config: ConnectionConfig, schemaName: string, tableName: string, databaseName?: string, limit?: number) => Promise<{ success: boolean; columns?: string[]; rows?: any[]; message?: string }>;
      exportDatabase: (config: ConnectionConfig) => Promise<{ success: boolean; message: string }>;
      cancelExport: () => Promise<{ success: boolean; message: string }>;

      // App runner helpers
      runSqlpackage: (config: ConnectionConfig, fileMoves?: FileMove[]) => Promise<{ success: boolean; message: string }>;
      cancelSqlpackage: () => Promise<{ success: boolean; message: string }>;
      fetchBakFileList: (connConfig: ConnectionConfig, bakFilePath: string) => Promise<{ success: boolean; files?: BakFileInfo[]; suggestedMoves?: FileMove[]; message?: string }>;

      // SQLCMD native backup/restore
      sqlcmdBackup: (config: any) => Promise<{ success: boolean; message: string }>;
      sqlcmdRestore: (config: any) => Promise<{ success: boolean; message: string }>;
      sqlcmdFileList: (connConfig: any, bakFilePath: string) => Promise<{ success: boolean; files?: BakFileInfo[]; message?: string }>;
      sqlcmdServerPaths: (connConfig: any) => Promise<{ success: boolean; dataPath?: string; logPath?: string; message?: string }>;

      // Dialogs
      selectSavePath: (defaultName: string, defaultExt?: string) => Promise<string | null>;
      selectOpenPath: (title?: string, filterExt?: string) => Promise<string | null>;

      // File Transfer (Wi-Fi & Bluetooth)
      startWiFiServer: (filePath: string, port?: number) => Promise<{ success: boolean; info?: WiFiServerInfo; message?: string }>;
      stopWiFiServer: () => Promise<boolean>;
      getWiFiStatus: () => Promise<WiFiServerInfo | null>;
      getNetworkIPs: () => Promise<NetworkIPInfo[]>;
      triggerBluetooth: (filePath: string) => Promise<{ success: boolean; message: string }>;

      // Event listeners
      onLog?: (callback: (log: { type: 'info' | 'stdout' | 'stderr' | 'error'; timestamp: string; content: string }) => void) => () => void;
      onSqlpackageLog?: (callback: (log: { type: 'info' | 'stdout' | 'stderr' | 'error'; timestamp: string; content: string }) => void) => () => void;
      onDownloadProgress?: (callback: (progress: DownloadProgress) => void) => () => void;
      onTransferStatusUpdate?: (callback: (status: WiFiServerInfo) => void) => () => void;
    };
  }
}
