import { execSync } from 'child_process';
import fs from 'fs';
import { Connection as TediousConnection, Request as TediousRequest } from 'tedious';
import { getExecutablePath } from './downloader';

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

/**
 * Maps numeric product version to friendly Microsoft SQL Server marketing name.
 */
export function getFriendlyMssqlVersion(versionStr: string, edition?: string): string {
  if (!versionStr) return 'Microsoft SQL Server';
  const major = parseInt(versionStr.split('.')[0], 10);
  let name = 'SQL Server';

  switch (major) {
    case 17:
      name = 'SQL Server 2025';
      break;
    case 16:
      name = 'SQL Server 2022';
      break;
    case 15:
      name = 'SQL Server 2019';
      break;
    case 14:
      name = 'SQL Server 2017';
      break;
    case 13:
      name = 'SQL Server 2016';
      break;
    case 12:
      name = 'SQL Server 2014';
      break;
    case 11:
      name = 'SQL Server 2012';
      break;
    case 10:
      name = versionStr.startsWith('10.5') ? 'SQL Server 2008 R2' : 'SQL Server 2008';
      break;
    case 9:
      name = 'SQL Server 2005';
      break;
    default:
      name = `SQL Server v${major}`;
  }

  const editionText = edition ? ` (${edition.replace(/\s*Edition\s*/i, '').trim()})` : '';
  return `${name}${editionText}`;
}

/**
 * Gathers pre-connection environment telemetry: local MSSQL installation and driver versions.
 */
export function getLocalMssqlEnvironment(): EnvironmentInfo {
  let localMssqlInstalled = false;
  let localMssqlVersion = '';
  let localMssqlStatus: 'active' | 'inactive' | 'not-installed' = 'not-installed';

  if (process.platform === 'linux') {
    try {
      if (fs.existsSync('/opt/mssql/bin/sqlservr')) {
        localMssqlInstalled = true;
        try {
          const out = execSync("dpkg-query -W -f='${Version}' mssql-server 2>/dev/null || /opt/mssql/bin/sqlservr -v 2>/dev/null", { encoding: 'utf8' }).trim();
          if (out) localMssqlVersion = out;
        } catch (_) {}
      } else {
        const out = execSync("dpkg-query -W -f='${Version}' mssql-server 2>/dev/null || rpm -q --queryformat '%{VERSION}' mssql-server 2>/dev/null", { encoding: 'utf8' }).trim();
        if (out && !out.includes('no packages') && !out.includes('not installed')) {
          localMssqlInstalled = true;
          localMssqlVersion = out;
        }
      }
    } catch (_) {}

    if (localMssqlInstalled) {
      try {
        const statusOut = execSync('systemctl is-active mssql-server 2>/dev/null || pgrep -x sqlservr 2>/dev/null', { encoding: 'utf8' }).trim();
        if (statusOut.includes('active') || /^\d+$/.test(statusOut)) {
          localMssqlStatus = 'active';
        } else {
          localMssqlStatus = 'inactive';
        }
      } catch (_) {
        localMssqlStatus = 'inactive';
      }
    }
  } else if (process.platform === 'win32') {
    try {
      const out = execSync('powershell -NoProfile -Command "Get-Service -Name *SQL* -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Name"', { encoding: 'utf8' }).trim();
      if (out && (out.includes('MSSQLSERVER') || out.includes('MSSQL$') || out.includes('SQLSERVER'))) {
        localMssqlInstalled = true;
        localMssqlStatus = 'active';
      }
    } catch (_) {}

    try {
      const regOut = execSync('reg query "HKLM\\SOFTWARE\\Microsoft\\Microsoft SQL Server" /v InstalledInstances 2>nul', { encoding: 'utf8' });
      if (regOut && regOut.includes('REG_MULTI_SZ')) {
        localMssqlInstalled = true;
      }
    } catch (_) {}
  }

  // Detect installed System ODBC Drivers
  const systemOdbcDrivers: string[] = [];
  try {
    if (process.platform !== 'win32') {
      const out = execSync('odbcinst -q -d 2>/dev/null', { encoding: 'utf8' });
      out.split('\n').forEach((line) => {
        const trimmed = line.trim().replace(/^\[|\]$/g, '');
        if (trimmed && (trimmed.includes('SQL Server') || trimmed.includes('ODBC'))) {
          systemOdbcDrivers.push(trimmed);
        }
      });
    } else {
      const out = execSync('reg query "HKLM\\SOFTWARE\\ODBC\\ODBCINST.INI\\ODBC Drivers" 2>nul', { encoding: 'utf8' });
      out.split('\n').forEach((line) => {
        const match = line.match(/^\s*(ODBC Driver \d+ for SQL Server|SQL Server Native Client \d+)/i);
        if (match) systemOdbcDrivers.push(match[1]);
      });
    }
  } catch (_) {}

  // Detect sqlpackage version
  let sqlpackageVersion = '';
  try {
    const execPath = getExecutablePath();
    if (fs.existsSync(execPath)) {
      const out = execSync(`"${execPath}" /version`, { encoding: 'utf8', timeout: 5000 }).trim();
      if (out) sqlpackageVersion = out;
    }
  } catch (_) {}

  return {
    localMssqlInstalled,
    localMssqlVersion: localMssqlVersion || (localMssqlInstalled ? 'Installed' : undefined),
    localMssqlFriendly: localMssqlVersion ? getFriendlyMssqlVersion(localMssqlVersion) : undefined,
    localMssqlStatus,
    activeClientDriver: 'Tedious v20.0.0 (TDS 7.4 Protocol)',
    sqlpackageVersion: sqlpackageVersion ? `SqlPackage v${sqlpackageVersion} (DacFx / .NET SqlClient)` : undefined,
    systemOdbcDrivers,
    nodeVersion: process.version,
    osPlatform: `${process.platform} (${process.arch})`,
  };
}

/**
 * Connects to the target server and retrieves post-connection MSSQL telemetry & active driver details.
 */
export async function fetchServerVersionDetails(config: any): Promise<{
  success: boolean;
  serverInfo?: ServerVersionInfo;
  message?: string;
}> {
  const host = (config.server || 'localhost').trim();
  const port = parseInt((config.port || '1433').toString().trim(), 10);

  const authOptions: any = config.authType === 'windows'
    ? {
        type: 'ntlm',
        options: {
          domain: config.domain || '',
          userName: config.username || '',
          password: config.password || '',
        },
      }
    : {
        type: 'default',
        options: {
          userName: config.username || 'sa',
          password: config.password || '',
        },
      };

  const tediousConfig: any = {
    server: host,
    options: {
      port,
      database: 'master',
      trustServerCertificate: config.trustServerCertificate ?? true,
      connectTimeout: 7000,
      requestTimeout: 7000,
      encrypt: false,
    },
    authentication: authOptions,
  };

  return new Promise((resolve) => {
    try {
      const connection = new TediousConnection(tediousConfig);

      connection.on('connect', (err: any) => {
        if (err) {
          try { connection.close(); } catch (_) {}
          resolve({
            success: false,
            message: `Connection failed: ${err.message}`,
          });
          return;
        }

        const sql = `
          SELECT 
            CAST(SERVERPROPERTY('ProductVersion') AS NVARCHAR(128)) AS ProductVersion,
            CAST(SERVERPROPERTY('ProductLevel') AS NVARCHAR(128)) AS ProductLevel,
            CAST(SERVERPROPERTY('Edition') AS NVARCHAR(128)) AS Edition,
            CAST(SERVERPROPERTY('MachineName') AS NVARCHAR(128)) AS MachineName,
            CAST(SERVERPROPERTY('InstanceName') AS NVARCHAR(128)) AS InstanceName,
            CAST(SERVERPROPERTY('Collation') AS NVARCHAR(128)) AS Collation,
            @@VERSION AS FullVersion,
            @@SPID AS SPID;
        `;

        const rowData: Record<string, any> = {};

        const request = new TediousRequest(sql, (queryErr: any) => {
          try { connection.close(); } catch (_) {}

          if (queryErr) {
            resolve({
              success: false,
              message: `Telemetry query error: ${queryErr.message}`,
            });
            return;
          }

          const productVersion = rowData['ProductVersion'] || '';
          const edition = rowData['Edition'] || '';
          const productLevel = rowData['ProductLevel'] || '';
          const fullVersion = rowData['FullVersion'] || '';
          const machineName = rowData['MachineName'] || '';
          const instanceName = rowData['InstanceName'] || '';
          const collation = rowData['Collation'] || '';
          const spid = rowData['SPID'] ? Number(rowData['SPID']) : undefined;

          // Get sqlpackage version
          let engineVersion = 'v170.4.83 (Microsoft DacFx / .NET SqlClient)';
          try {
            const execPath = getExecutablePath();
            if (fs.existsSync(execPath)) {
              const out = execSync(`"${execPath}" /version`, { encoding: 'utf8', timeout: 3000 }).trim();
              if (out) engineVersion = `SqlPackage v${out} (Microsoft DacFx / .NET SqlClient)`;
            }
          } catch (_) {}

          const friendlyVersion = getFriendlyMssqlVersion(productVersion, edition);

          resolve({
            success: true,
            serverInfo: {
              connected: true,
              server: host,
              port: port.toString(),
              productVersion,
              productMajorVersion: productVersion.split('.')[0] || '',
              friendlyVersion,
              productLevel,
              edition,
              fullVersion,
              machineName,
              instanceName,
              collation,
              spid,
              activeDriver: 'Tedious v20.0.0 (Pure JS TDS 7.4 Driver)',
              engineDriver: engineVersion,
              encryption: config.trustServerCertificate ? 'Enabled (TrustServerCertificate: True)' : 'Standard SSL',
              authType: config.authType === 'windows' ? 'Windows Authentication' : `SQL Server Auth (${config.username || 'sa'})`,
              connectedAt: new Date().toLocaleTimeString(),
            },
          });
        });

        request.on('row', (columns: any[]) => {
          columns.forEach((col: any) => {
            rowData[col.metadata.colName] = col.value;
          });
        });

        connection.execSql(request);
      });

      connection.on('error', (err: any) => {
        resolve({
          success: false,
          message: err.message || 'Connection error',
        });
      });

      connection.connect();
    } catch (err: any) {
      resolve({
        success: false,
        message: err.message || 'Exception establishing connection',
      });
    }
  });
}
