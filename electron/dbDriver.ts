import { Connection as TediousConnection, Request as TediousRequest } from 'tedious';

export interface DbConnectionConfig {
  server: string;
  port?: string | number;
  database?: string;
  authType?: 'sql' | 'windows';
  useCurrentWindowsUser?: boolean;
  domain?: string;
  username?: string;
  password?: string;
  trustServerCertificate?: boolean;
  connectTimeout?: number;
  requestTimeout?: number;
}

export interface QueryResult<T = any> {
  success: boolean;
  rows?: T[];
  message?: string;
}

export interface StreamCallbacks {
  onRow?: (row: Record<string, any>) => void;
  onMessage?: (message: string) => void;
}

// ---------------------------------------------------------------------------
// Dynamic Driver Resolution
// ---------------------------------------------------------------------------

let cachedMsnodesqlv8: any = null;
let msnodesqlv8Checked = false;

/**
 * Dynamically resolves msnodesqlv8 on Windows.
 * Returns null if not on Windows or if native binary is unavailable.
 */
function getMsNodeSqlDriver(): any {
  if (process.platform !== 'win32') {
    return null;
  }

  if (msnodesqlv8Checked) {
    return cachedMsnodesqlv8;
  }

  msnodesqlv8Checked = true;
  try {
    // Dynamic require so non-Windows dev environments build without bundler issues
    const dynamicRequire = eval('require');
    cachedMsnodesqlv8 = dynamicRequire('msnodesqlv8');
    console.log('[dbDriver] Successfully loaded native msnodesqlv8 Windows driver');
  } catch (err: any) {
    console.warn('[dbDriver] msnodesqlv8 not available on Windows, falling back to Tedious:', err.message);
    cachedMsnodesqlv8 = null;
  }

  return cachedMsnodesqlv8;
}

/**
 * Returns a human-friendly description of the currently active driver.
 */
export function getActiveDriverName(): string {
  if (process.platform === 'win32' && getMsNodeSqlDriver()) {
    return 'msnodesqlv8 (Native Windows ODBC / SSPI)';
  }
  return 'Tedious v20.0.0 (Pure JS TDS 7.4)';
}

/**
 * Builds a native Windows ODBC Connection String for msnodesqlv8.
 */
export function buildOdbcConnectionString(cfg: DbConnectionConfig): string {
  const host = (cfg.server || 'localhost').trim();
  const port = cfg.port ? cfg.port.toString().trim() : '';
  const database = (cfg.database || 'master').trim();

  // Format server addressing:
  // If server already contains an instance (e.g. localhost\SQLEXPRESS or .\MSSQLSERVER) or port, keep as-is.
  let serverStr = host;
  if (port && port !== '1433' && !host.includes('\\') && !host.includes(',')) {
    serverStr = `${host},${port}`;
  }

  // Windows ODBC driver priority list
  // msnodesqlv8 will automatically match or fall back through standard installed drivers
  const driver = '{ODBC Driver 18 for SQL Server}';

  const parts: string[] = [
    `Driver=${driver}`,
    `Server=${serverStr}`,
    `Database=${database}`,
  ];

  const isWindowsAuth = cfg.authType === 'windows' || cfg.useCurrentWindowsUser || (!cfg.username && !cfg.password);

  if (isWindowsAuth) {
    // True Windows Authentication / SSPI
    parts.push('Trusted_Connection=Yes');
  } else {
    // SQL Server Authentication
    const user = (cfg.username || 'sa').trim();
    const pass = cfg.password || '';
    parts.push(`Uid=${user}`);
    parts.push(`Pwd=${pass}`);
  }

  if (cfg.trustServerCertificate ?? true) {
    parts.push('TrustServerCertificate=Yes');
  }

  return parts.join(';') + ';';
}

/**
 * Builds a Tedious configuration object.
 */
export function buildTediousConfig(cfg: DbConnectionConfig): any {
  const host = (cfg.server || 'localhost').trim();
  const port = parseInt(cfg.port ? cfg.port.toString().trim() : '1433', 10) || 1433;
  const database = (cfg.database || 'master').trim();

  const isWindowsAuth = cfg.authType === 'windows';

  const authOptions: any = isWindowsAuth
    ? {
        type: 'ntlm',
        options: {
          domain: cfg.domain || '',
          userName: cfg.username || '',
          password: cfg.password || '',
        },
      }
    : {
        type: 'default',
        options: {
          userName: cfg.username || 'sa',
          password: cfg.password || '',
        },
      };

  return {
    server: host,
    options: {
      port,
      database,
      trustServerCertificate: cfg.trustServerCertificate ?? true,
      connectTimeout: cfg.connectTimeout || 10000,
      requestTimeout: cfg.requestTimeout !== undefined ? cfg.requestTimeout : 30000,
      encrypt: false,
    },
    authentication: authOptions,
  };
}

// ---------------------------------------------------------------------------
// Unified Execution API
// ---------------------------------------------------------------------------

/**
 * Executes a T-SQL query and returns all result rows.
 */
export async function executeSqlQuery<T = any>(
  cfg: DbConnectionConfig,
  sql: string
): Promise<QueryResult<T>> {
  const nativeDriver = getMsNodeSqlDriver();

  if (nativeDriver) {
    return new Promise<QueryResult<T>>((resolve) => {
      const connStr = buildOdbcConnectionString(cfg);

      nativeDriver.open(connStr, (openErr: any, conn: any) => {
        if (openErr) {
          // If ODBC Driver 18 isn't found, retry with ODBC Driver 17 or standard SQL Server driver
          if (openErr.message && (openErr.message.includes('Data source name not found') || openErr.message.includes('Driver'))) {
            const fallbackConnStr = connStr.replace('ODBC Driver 18 for SQL Server', 'ODBC Driver 17 for SQL Server');
            nativeDriver.open(fallbackConnStr, (fallbackErr: any, fallbackConn: any) => {
              if (fallbackErr) {
                const legacyConnStr = connStr.replace(/Driver=\{[^}]+\}/, 'Driver={SQL Server}');
                nativeDriver.open(legacyConnStr, (legacyErr: any, legacyConn: any) => {
                  if (legacyErr) {
                    resolve({ success: false, message: `Windows ODBC connection failed: ${legacyErr.message}` });
                  } else {
                    runQueryOnMsNodeConn<T>(legacyConn, sql, resolve);
                  }
                });
              } else {
                runQueryOnMsNodeConn<T>(fallbackConn, sql, resolve);
              }
            });
            return;
          }

          resolve({ success: false, message: `Windows ODBC connection failed: ${openErr.message}` });
          return;
        }

        runQueryOnMsNodeConn<T>(conn, sql, resolve);
      });
    });
  }

  // Cross-Platform Tedious implementation
  return new Promise<QueryResult<T>>((resolve) => {
    try {
      const tediousConfig = buildTediousConfig(cfg);
      const connection = new TediousConnection(tediousConfig);

      connection.on('connect', (err: any) => {
        if (err) {
          try { connection.close(); } catch (_) {}
          resolve({ success: false, message: `Connection failed: ${err.message}` });
          return;
        }

        const rows: any[] = [];
        const request = new TediousRequest(sql, (queryErr: any) => {
          try { connection.close(); } catch (_) {}
          if (queryErr) {
            resolve({ success: false, message: queryErr.message });
          } else {
            resolve({ success: true, rows });
          }
        });

        request.on('row', (columns: any[]) => {
          const row: Record<string, any> = {};
          columns.forEach((col: any) => {
            row[col.metadata.colName] = col.value;
          });
          rows.push(row);
        });

        connection.execSql(request);
      });

      connection.on('error', (err: any) => {
        resolve({ success: false, message: err.message || 'Connection error' });
      });

      connection.connect();
    } catch (err: any) {
      resolve({ success: false, message: (err as Error).message });
    }
  });
}

function runQueryOnMsNodeConn<T>(conn: any, sql: string, resolve: (res: QueryResult<T>) => void) {
  conn.query(sql, (queryErr: any, results: any[]) => {
    try { conn.close(); } catch (_) {}
    if (queryErr) {
      resolve({ success: false, message: queryErr.message });
    } else {
      resolve({ success: true, rows: (results || []) as T[] });
    }
  });
}

/**
 * Executes a streaming T-SQL statement (such as BACKUP / RESTORE or schema inspection)
 * with real-time row and message notifications.
 */
export async function executeSqlStreaming(
  cfg: DbConnectionConfig,
  sql: string,
  callbacks: StreamCallbacks
): Promise<{ success: boolean; message?: string }> {
  const nativeDriver = getMsNodeSqlDriver();

  if (nativeDriver) {
    return new Promise((resolve) => {
      const connStr = buildOdbcConnectionString(cfg);

      nativeDriver.open(connStr, (openErr: any, conn: any) => {
        if (openErr) {
          // If ODBC 18 isn't present, try ODBC 17 or generic SQL Server
          if (openErr.message && (openErr.message.includes('Data source name not found') || openErr.message.includes('Driver'))) {
            const fallbackConnStr = connStr.replace('ODBC Driver 18 for SQL Server', 'ODBC Driver 17 for SQL Server');
            nativeDriver.open(fallbackConnStr, (fbErr: any, fbConn: any) => {
              if (fbErr) {
                const legacyConnStr = connStr.replace(/Driver=\{[^}]+\}/, 'Driver={SQL Server}');
                nativeDriver.open(legacyConnStr, (legErr: any, legConn: any) => {
                  if (legErr) {
                    resolve({ success: false, message: `Windows ODBC connection failed: ${legErr.message}` });
                  } else {
                    runStreamingOnMsNodeConn(legConn, sql, callbacks, resolve);
                  }
                });
              } else {
                runStreamingOnMsNodeConn(fbConn, sql, callbacks, resolve);
              }
            });
            return;
          }

          resolve({ success: false, message: `Windows ODBC connection failed: ${openErr.message}` });
          return;
        }

        runStreamingOnMsNodeConn(conn, sql, callbacks, resolve);
      });
    });
  }

  // Cross-Platform Tedious Streaming
  return new Promise((resolve) => {
    try {
      const tediousConfig = buildTediousConfig({
        ...cfg,
        requestTimeout: 0, // Infinite timeout for backup/restore
      });
      const connection = new TediousConnection(tediousConfig);

      connection.on('connect', (err: any) => {
        if (err) {
          try { connection.close(); } catch (_) {}
          resolve({ success: false, message: `Connection failed: ${err.message}` });
          return;
        }

        const request = new TediousRequest(sql, (queryErr: any) => {
          try { connection.close(); } catch (_) {}
          if (queryErr) {
            resolve({ success: false, message: queryErr.message });
          } else {
            resolve({ success: true });
          }
        });

        request.on('row', (columns: any[]) => {
          if (callbacks.onRow) {
            const row: Record<string, any> = {};
            columns.forEach((col: any) => {
              row[col.metadata.colName] = col.value;
            });
            callbacks.onRow(row);
          }
        });

        request.on('message' as any, (msg: any) => {
          if (msg && msg.message && callbacks.onMessage) {
            callbacks.onMessage(msg.message);
          }
        });

        connection.on('infoMessage', (info: any) => {
          if (info && info.message && callbacks.onMessage) {
            callbacks.onMessage(info.message);
          }
        });

        connection.execSql(request);
      });

      connection.on('error', (err: any) => {
        resolve({ success: false, message: err.message || 'Connection error' });
      });

      connection.connect();
    } catch (err: any) {
      resolve({ success: false, message: (err as Error).message });
    }
  });
}

function runStreamingOnMsNodeConn(
  conn: any,
  sql: string,
  callbacks: StreamCallbacks,
  resolve: (res: { success: boolean; message?: string }) => void
) {
  try {
    // Listen for informational print messages from SQL Server (e.g. backup progress percent)
    if (typeof conn.on === 'function') {
      conn.on('info', (info: any) => {
        if (info && info.message && callbacks.onMessage) {
          callbacks.onMessage(info.message);
        }
      });
      conn.on('error', (err: any) => {
        if (err && err.message && callbacks.onMessage) {
          callbacks.onMessage(`Warning: ${err.message}`);
        }
      });
    }

    const queryStream = conn.queryRaw(sql);

    if (queryStream && typeof queryStream.on === 'function') {
      let meta: any = null;

      queryStream.on('meta', (m: any) => {
        meta = m;
      });

      queryStream.on('row', (rowArr: any[]) => {
        if (callbacks.onRow) {
          const rowObj: Record<string, any> = {};
          if (meta && Array.isArray(meta)) {
            meta.forEach((col: any, idx: number) => {
              rowObj[col.name] = rowArr[idx];
            });
          } else {
            rowArr.forEach((val, idx) => {
              rowObj[`col_${idx}`] = val;
            });
          }
          callbacks.onRow(rowObj);
        }
      });

      queryStream.on('info', (info: any) => {
        if (info && info.message && callbacks.onMessage) {
          callbacks.onMessage(info.message);
        }
      });

      queryStream.on('error', (err: any) => {
        try { conn.close(); } catch (_) {}
        resolve({ success: false, message: err.message });
      });

      queryStream.on('done', () => {
        try { conn.close(); } catch (_) {}
        resolve({ success: true });
      });
    } else {
      // Fallback to standard query if streaming is not directly supported
      conn.query(sql, (err: any, rows: any[]) => {
        try { conn.close(); } catch (_) {}
        if (err) {
          resolve({ success: false, message: err.message });
        } else {
          if (callbacks.onRow && Array.isArray(rows)) {
            rows.forEach((r) => callbacks.onRow!(r));
          }
          resolve({ success: true });
        }
      });
    }
  } catch (err: any) {
    try { conn.close(); } catch (_) {}
    resolve({ success: false, message: err.message });
  }
}
