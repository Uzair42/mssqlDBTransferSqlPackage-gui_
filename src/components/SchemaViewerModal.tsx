import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ConnectionConfig, TableSchemaInfo, TableRelationshipInfo } from '../types';
import {
  CloseIcon,
  RefreshIcon,
  SearchFilterIcon,
  DatabaseScannerIcon,
  ListIcon,
  EyeIcon,
  KeyIcon,
  LoaderIcon,
  ZoomInIcon,
  ZoomOutIcon,
  FitScreenIcon,
  LayoutGridIcon,
  NetworkLinkIcon,
  CameraIcon,
  MaximizeIcon,
  MinimizeIcon,
  DownloadDocIcon,
  PrinterIcon,
  CopyClipboardIcon,
} from './icons/FeatureIcons';

interface SchemaViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ConnectionConfig;
}

export const SchemaViewerModal: React.FC<SchemaViewerModalProps> = ({
  isOpen,
  onClose,
  config,
}) => {
  const [tables, setTables] = useState<TableSchemaInfo[]>([]);
  const [relationships, setRelationships] = useState<TableRelationshipInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<TableSchemaInfo | null>(null);
  const [filterText, setFilterText] = useState('');
  const [activeTab, setActiveTab] = useState<'columns' | 'data' | 'erd'>('columns');
  
  const [isLoadingSchema, setIsLoadingSchema] = useState(false);
  const [schemaError, setSchemaError] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Table Data State
  const [tableData, setTableData] = useState<{ columns: string[]; rows: any[] } | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  // ─── ERD CANVAS STATE ───────────────────────────────────────────────
  const [zoomScale, setZoomScale] = useState(0.85);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 40, y: 40 });
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});
  
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [nodeDragOffset, setNodeDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  
  const [isCanvasPanning, setIsCanvasPanning] = useState(false);
  const [canvasPanStart, setCanvasPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const [hoveredTable, setHoveredTable] = useState<string | null>(null);
  const erdCanvasRef = useRef<HTMLDivElement>(null);

  // Auto Grid Positioning
  const arrangeDiagramGrid = useCallback((tableList: TableSchemaInfo[]) => {
    const colsCount = Math.max(2, Math.ceil(Math.sqrt(tableList.length)));
    const positions: Record<string, { x: number; y: number }> = {};
    tableList.forEach((t, index) => {
      const col = index % colsCount;
      const row = Math.floor(index / colsCount);
      const approxHeight = Math.min(280, 80 + t.columns.length * 22);
      positions[t.fullName] = {
        x: 60 + col * 320,
        y: 60 + row * (approxHeight + 60),
      };
    });
    setNodePositions(positions);
  }, []);

  const fetchSchema = useCallback(async () => {
    if (!window.electronAPI || !config.database) return;
    setIsLoadingSchema(true);
    setSchemaError(null);
    setTables([]);
    setRelationships([]);
    setSelectedTable(null);

    try {
      const res = await window.electronAPI.fetchDatabaseSchema(config, config.database);
      if (res.success && res.tables) {
        setTables(res.tables);
        if (res.relationships) {
          setRelationships(res.relationships);
        }
        if (res.tables.length > 0) {
          setSelectedTable(res.tables[0]);
          arrangeDiagramGrid(res.tables);
        }
      } else {
        setSchemaError(res.message || 'Failed to query database schema.');
      }
    } catch (err: any) {
      setSchemaError(err.message || 'Error connecting for schema visualization.');
    } finally {
      setIsLoadingSchema(false);
    }
  }, [config, arrangeDiagramGrid]);

  const fetchTableData = useCallback(async (table: TableSchemaInfo) => {
    if (!window.electronAPI) return;
    setIsLoadingData(true);
    setDataError(null);
    setTableData(null);

    try {
      const res = await window.electronAPI.fetchTableData(
        config,
        table.schemaName,
        table.tableName,
        config.database,
        50
      );
      if (res.success && res.columns && res.rows) {
        setTableData({ columns: res.columns, rows: res.rows });
      } else {
        setDataError(res.message || 'Failed to fetch table preview data.');
      }
    } catch (err: any) {
      setDataError(err.message || 'Error fetching data rows.');
    } finally {
      setIsLoadingData(false);
    }
  }, [config]);

  useEffect(() => {
    if (isOpen) {
      fetchSchema();
    }
  }, [isOpen, fetchSchema]);

  useEffect(() => {
    if (selectedTable && activeTab === 'data') {
      fetchTableData(selectedTable);
    }
  }, [selectedTable, activeTab, fetchTableData]);

  // Toast Helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // ─── ERD EXPORT & PHOTO CAPTURE HANDLERS ────────────────────────────

  // 1. High-Res PNG Capture
  const exportHighResPng = () => {
    if (tables.length === 0) return;

    // Calculate canvas size bounds
    let maxX = 800;
    let maxY = 600;
    tables.forEach((t) => {
      const pos = nodePositions[t.fullName] || { x: 0, y: 0 };
      const cardWidth = 280;
      const cardHeight = Math.min(320, 70 + t.columns.length * 22);
      maxX = Math.max(maxX, pos.x + cardWidth + 100);
      maxY = Math.max(maxY, pos.y + cardHeight + 100);
    });

    const canvas = document.createElement('canvas');
    const scale = 2; // 2x high DPI crisp rendering
    canvas.width = maxX * scale;
    canvas.height = maxY * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(scale, scale);

    // Background
    ctx.fillStyle = '#0b111e';
    ctx.fillRect(0, 0, maxX, maxY);

    // Grid dots
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    for (let x = 0; x < maxX; x += 30) {
      for (let y = 0; y < maxY; y += 30) {
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw Relationship Connector Lines
    relationships.forEach((rel) => {
      const fkPos = nodePositions[rel.fkFullName];
      const pkPos = nodePositions[rel.pkFullName];
      if (!fkPos || !pkPos) return;

      const startX = fkPos.x + 280;
      const startY = fkPos.y + 45;
      const endX = pkPos.x;
      const endY = pkPos.y + 45;
      const dx = Math.abs(endX - startX) * 0.5;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.bezierCurveTo(
        startX + Math.max(60, dx),
        startY,
        endX - Math.max(60, dx),
        endY,
        endX,
        endY
      );
      ctx.strokeStyle = '#A9FF68';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // Draw Table Cards
    tables.forEach((t) => {
      const pos = nodePositions[t.fullName] || { x: 50, y: 50 };
      const width = 280;
      const headerHeight = 36;
      const rowHeight = 22;
      const cardHeight = headerHeight + Math.min(220, t.columns.length * rowHeight) + 10;

      // Card Body Box
      ctx.fillStyle = '#141c2e';
      ctx.strokeStyle = '#27354f';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(pos.x, pos.y, width, cardHeight, 10);
      ctx.fill();
      ctx.stroke();

      // Card Header Box
      ctx.fillStyle = '#1c283f';
      ctx.beginPath();
      ctx.roundRect(pos.x, pos.y, width, headerHeight, [10, 10, 0, 0]);
      ctx.fill();

      // Header Text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(`${t.schemaName}.${t.tableName}`, pos.x + 12, pos.y + 22);

      // Columns List
      ctx.font = '11px monospace';
      t.columns.slice(0, 10).forEach((col, idx) => {
        const lineY = pos.y + headerHeight + 18 + idx * rowHeight;
        if (col.isPrimaryKey) {
          ctx.fillStyle = '#fbbf24';
          ctx.fillText('🔑 ' + col.columnName, pos.x + 12, lineY);
        } else if (col.isForeignKey) {
          ctx.fillStyle = '#22d3ee';
          ctx.fillText('🔗 ' + col.columnName, pos.x + 12, lineY);
        } else {
          ctx.fillStyle = '#cbd5e1';
          ctx.fillText(col.columnName, pos.x + 12, lineY);
        }

        ctx.fillStyle = '#64748b';
        ctx.fillText(col.dataType, pos.x + width - 80, lineY);
      });
    });

    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${config.database || 'Database'}_ERD_HighRes.png`;
    a.click();
    showToast('High-Resolution PNG ERD Screenshot Exported!');
  };

  // 2. Scalable Vector Graphic SVG Export
  const exportSvg = () => {
    let maxX = 800;
    let maxY = 600;
    tables.forEach((t) => {
      const pos = nodePositions[t.fullName] || { x: 0, y: 0 };
      maxX = Math.max(maxX, pos.x + 350);
      maxY = Math.max(maxY, pos.y + 400);
    });

    let svgStr = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${maxX} ${maxY}" width="${maxX}" height="${maxY}" style="background:#0b111e; font-family: monospace;">\n`;
    svgStr += `  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#A9FF68" />
    </marker>
  </defs>\n`;

    // Connections
    relationships.forEach((rel) => {
      const fkPos = nodePositions[rel.fkFullName];
      const pkPos = nodePositions[rel.pkFullName];
      if (!fkPos || !pkPos) return;

      const startX = fkPos.x + 280;
      const startY = fkPos.y + 45;
      const endX = pkPos.x;
      const endY = pkPos.y + 45;
      const dx = Math.abs(endX - startX) * 0.5;

      svgStr += `  <path d="M ${startX} ${startY} C ${startX + Math.max(60, dx)} ${startY}, ${endX - Math.max(60, dx)} ${endY}, ${endX} ${endY}" fill="none" stroke="#A9FF68" stroke-width="2" stroke-dasharray="4 4" marker-end="url(#arrow)" />\n`;
    });

    // Table Cards
    tables.forEach((t) => {
      const pos = nodePositions[t.fullName] || { x: 50, y: 50 };
      const width = 280;
      const cardHeight = 40 + Math.min(240, t.columns.length * 22);

      svgStr += `  <g transform="translate(${pos.x}, ${pos.y})">
    <rect width="${width}" height="${cardHeight}" rx="10" fill="#141c2e" stroke="#27354f" stroke-width="1.5" />
    <rect width="${width}" height="36" rx="10" fill="#1c283f" />
    <text x="12" y="23" fill="#ffffff" font-size="13" font-weight="bold">${t.schemaName}.${t.tableName}</text>\n`;

      t.columns.slice(0, 12).forEach((col, idx) => {
        const lineY = 56 + idx * 22;
        const keyPrefix = col.isPrimaryKey ? '🔑 ' : col.isForeignKey ? '🔗 ' : '  ';
        const color = col.isPrimaryKey ? '#fbbf24' : col.isForeignKey ? '#22d3ee' : '#cbd5e1';
        svgStr += `    <text x="12" y="${lineY}" fill="${color}" font-size="11">${keyPrefix}${col.columnName}</text>\n`;
        svgStr += `    <text x="${width - 12}" y="${lineY}" fill="#64748b" font-size="10" text-anchor="end">${col.dataType}</text>\n`;
      });

      svgStr += `  </g>\n`;
    });

    svgStr += `</svg>`;

    const blob = new Blob([svgStr], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.database || 'Database'}_ERD_Diagram.svg`;
    a.click();
    showToast('Vector SVG ERD Diagram Exported!');
  };

  // 3. Markdown Documentation (.md) & Mermaid Generator
  const generateMermaidMarkdown = (): string => {
    const dbName = config.database || 'Database';
    let md = `# Database Schema Documentation: \`${dbName}\`\n\n`;
    md += `> Generated by **MSSQL Database Migrator & Visualizer (by mu42)** on ${new Date().toLocaleDateString()}\n\n`;
    md += `## 📊 Entity Relationship Diagram (Mermaid)\n\n`;
    md += `\`\`\`mermaid\nerDiagram\n`;

    relationships.forEach((rel) => {
      const fkName = rel.fkFullName.replace('.', '_');
      const pkName = rel.pkFullName.replace('.', '_');
      md += `    ${pkName} ||--o{ ${fkName} : "${rel.constraintName}"\n`;
    });

    md += `\`\`\`\n\n`;
    md += `## 📋 Database Tables & Column Definitions\n\n`;

    tables.forEach((t) => {
      md += `### Table: \`${t.fullName}\` (~${t.rowCount.toLocaleString()} Rows)\n\n`;
      md += `| Ordinal | Column Name | Data Type | Max Length | Nullable | Primary Key | Foreign Key |\n`;
      md += `| :---: | :--- | :--- | :---: | :---: | :---: | :---: |\n`;
      t.columns.forEach((col) => {
        md += `| ${col.ordinalPosition} | **${col.columnName}** | \`${col.dataType}\` | ${col.maxLength ?? '-'} | ${col.isNullable ? 'Yes' : 'No'} | ${col.isPrimaryKey ? '🔑 YES' : '-'} | ${col.isForeignKey ? '🔗 YES' : '-'} |\n`;
      });
      md += `\n`;
    });

    return md;
  };

  const exportMarkdownDoc = () => {
    const mdText = generateMermaidMarkdown();
    const blob = new Blob([mdText], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.database || 'Database'}_Schema_Documentation.md`;
    a.click();
    showToast('Markdown (.md) Schema & Mermaid Doc Exported!');
  };

  const copyMermaidToClipboard = () => {
    const mdText = generateMermaidMarkdown();
    navigator.clipboard.writeText(mdText);
    showToast('Mermaid ERD Markdown Copied to Clipboard!');
  };

  // 4. Print / PDF Export
  const printErd = () => {
    window.print();
  };

  // ─── ERD DRAG & PAN HANDLERS ───────────────────────────────────────
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target === erdCanvasRef.current || (e.target as HTMLElement).tagName === 'svg') {
      setIsCanvasPanning(true);
      setCanvasPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isCanvasPanning) {
      setPanOffset({
        x: e.clientX - canvasPanStart.x,
        y: e.clientY - canvasPanStart.y,
      });
    } else if (draggingNode) {
      setNodePositions((prev) => ({
        ...prev,
        [draggingNode]: {
          x: Math.max(0, (e.clientX - nodeDragOffset.x - panOffset.x) / zoomScale),
          y: Math.max(0, (e.clientY - nodeDragOffset.y - panOffset.y) / zoomScale),
        },
      }));
    }
  };

  const handleMouseUp = () => {
    setIsCanvasPanning(false);
    setDraggingNode(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (activeTab !== 'erd') return;
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setZoomScale((prev) => Math.min(2.5, Math.max(0.3, prev * zoomFactor)));
  };

  if (!isOpen) return null;

  const filteredTables = tables.filter(
    (t) =>
      t.fullName.toLowerCase().includes(filterText.toLowerCase()) ||
      t.columns.some((c) => c.columnName.toLowerCase().includes(filterText.toLowerCase()))
  );

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md animate-in fade-in ${isFullScreen ? 'p-0' : 'p-3 sm:p-5'}`}>
      <div className={`bg-theme-surface border border-theme-border flex flex-col shadow-2xl overflow-hidden transition-all duration-300 ${isFullScreen ? 'w-full h-full rounded-none border-0' : 'w-full max-w-7xl h-[92vh] rounded-2xl'}`}>
        
        {/* TOAST FEEDBACK NOTIFICATION */}
        {toastMessage && (
          <div className="absolute top-16 right-6 z-50 bg-emerald-500 text-slate-950 px-4 py-2 rounded-xl shadow-2xl font-mono text-xs font-bold animate-in fade-in flex items-center space-x-2 border border-white/20">
            <span>✨ {toastMessage}</span>
          </div>
        )}

        {/* MODAL HEADER */}
        <div className="bg-theme-card px-6 py-3 border-b border-theme-border flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-theme-bg border border-theme-accentPrimary/40 rounded-xl text-theme-accentPrimary shadow-sm">
              <DatabaseScannerIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-aladin text-2xl text-theme-text font-bold leading-none">
                  Database Schema & ERD Visualizer
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-theme-accentPrimary/20 text-theme-accentPrimary border border-theme-accentPrimary/40 rounded-md">
                  {config.database || 'master'}
                </span>
                <span className="px-2 py-0.5 text-[10px] font-mono text-theme-muted bg-theme-bg border border-theme-border rounded-md">
                  Host: {config.server || 'localhost'}
                </span>
              </div>
              <p className="font-annie text-base text-theme-muted tracking-wide -mt-0.5">
                Interactive ERD diagram with high-res export, pan/zoom, table schemas & sample record preview
              </p>
            </div>
          </div>

          {/* Modal Top Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="p-1.5 text-theme-text bg-theme-bg hover:bg-theme-cardHover border border-theme-border rounded-xl transition"
              title={isFullScreen ? 'Exit Full Screen' : 'Full Screen Preview'}
            >
              {isFullScreen ? <MinimizeIcon className="w-4 h-4" /> : <MaximizeIcon className="w-4 h-4" />}
            </button>

            <button
              onClick={fetchSchema}
              disabled={isLoadingSchema}
              className="px-3 py-1.5 bg-theme-bg hover:bg-theme-cardHover text-theme-text border border-theme-border rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition disabled:opacity-50"
              title="Refresh database schema & foreign keys"
            >
              <RefreshIcon className={`w-3.5 h-3.5 ${isLoadingSchema ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-theme-muted hover:text-white bg-theme-bg hover:bg-red-500/20 hover:border-red-500/40 border border-theme-border rounded-xl transition"
            >
              <CloseIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 flex overflow-hidden">
          {/* LEFT SIDEBAR: Table Tree / Selector */}
          <div className="w-72 border-r border-theme-border bg-theme-surface/50 flex flex-col shrink-0">
            {/* Search Filter */}
            <div className="p-3 border-b border-theme-border">
              <div className="relative">
                <input
                  type="text"
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  placeholder="Search tables & columns..."
                  className="w-full bg-theme-bg border border-theme-border focus:border-theme-accentPrimary text-xs font-mono rounded-lg pl-8 pr-3 py-1.5 text-theme-text placeholder-theme-muted focus:outline-none"
                />
                <SearchFilterIcon className="w-3.5 h-3.5 text-theme-muted absolute left-2.5 top-2.5" />
              </div>
            </div>

            {/* Tables List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {isLoadingSchema ? (
                <div className="p-6 text-center text-theme-muted space-y-2">
                  <LoaderIcon className="w-6 h-6 animate-spin mx-auto text-theme-accentPrimary" />
                  <p className="font-mono text-xs">Querying database schema...</p>
                </div>
              ) : schemaError ? (
                <div className="p-4 text-center text-red-400 font-mono text-xs bg-red-950/20 border border-red-500/30 rounded-xl">
                  {schemaError}
                </div>
              ) : filteredTables.length === 0 ? (
                <div className="p-4 text-center text-theme-muted font-mono text-xs">
                  No tables found matching filter.
                </div>
              ) : (
                filteredTables.map((t) => {
                  const isSelected = selectedTable?.fullName === t.fullName;
                  return (
                    <button
                      key={t.fullName}
                      onClick={() => setSelectedTable(t)}
                      className={`w-full text-left px-3 py-2 rounded-xl transition flex items-center justify-between font-mono text-xs ${
                        isSelected
                          ? 'bg-theme-card text-theme-accentPrimary font-bold border border-theme-accentPrimary/40 shadow-sm'
                          : 'text-theme-text hover:bg-theme-card/60'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <span className="text-theme-muted">{t.schemaName}.</span>
                        <span className="font-semibold">{t.tableName}</span>
                      </div>
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-theme-bg border border-theme-border shrink-0 text-theme-muted">
                        {t.rowCount.toLocaleString()}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            {/* Sidebar Summary Footer */}
            <div className="p-3 border-t border-theme-border bg-theme-card/40 text-[11px] font-mono text-theme-muted flex justify-between">
              <span>Tables: {tables.length}</span>
              <span>Relations: {relationships.length}</span>
            </div>
          </div>

          {/* RIGHT MAIN AREA: Tab Selection & Views */}
          <div className="flex-1 flex flex-col overflow-hidden bg-theme-bg">
            {/* VIEW MODE TABS BAR */}
            <div className="bg-theme-card px-6 py-2.5 border-b border-theme-border flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2">
                {selectedTable ? (
                  <>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-theme-surface border border-theme-border text-theme-muted uppercase">
                      {selectedTable.schemaName}
                    </span>
                    <h3 className="font-aladin text-2xl text-theme-text font-bold">
                      {selectedTable.tableName}
                    </h3>
                  </>
                ) : (
                  <h3 className="font-aladin text-2xl text-theme-text font-bold">
                    Database Schema Explorer
                  </h3>
                )}
              </div>

              {/* View Tabs Toggle */}
              <div className="flex bg-theme-bg p-1 rounded-xl border border-theme-border space-x-1">
                <button
                  onClick={() => setActiveTab('columns')}
                  className={`px-3 py-1 rounded-lg text-xs font-aladin tracking-wider transition flex items-center space-x-1.5 ${
                    activeTab === 'columns'
                      ? 'bg-theme-card text-theme-accentPrimary font-bold shadow-xs border border-theme-border'
                      : 'text-theme-muted hover:text-theme-text'
                  }`}
                >
                  <ListIcon className="w-3.5 h-3.5" />
                  <span>Columns ({selectedTable?.columns.length || 0})</span>
                </button>

                <button
                  onClick={() => setActiveTab('data')}
                  className={`px-3 py-1 rounded-lg text-xs font-aladin tracking-wider transition flex items-center space-x-1.5 ${
                    activeTab === 'data'
                      ? 'bg-theme-card text-theme-accentPrimary font-bold shadow-xs border border-theme-border'
                      : 'text-theme-muted hover:text-theme-text'
                  }`}
                >
                  <EyeIcon className="w-3.5 h-3.5" />
                  <span>Data Preview</span>
                </button>

                <button
                  onClick={() => setActiveTab('erd')}
                  className={`px-3 py-1 rounded-lg text-xs font-aladin tracking-wider transition flex items-center space-x-1.5 ${
                    activeTab === 'erd'
                      ? 'bg-theme-card text-theme-accentPrimary font-bold shadow-xs border border-theme-border'
                      : 'text-theme-muted hover:text-theme-text'
                  }`}
                >
                  <NetworkLinkIcon className="w-3.5 h-3.5" />
                  <span>📊 ERD Diagram</span>
                </button>
              </div>
            </div>

            {/* MAIN TAB CONTENT */}
            <div className="flex-1 overflow-hidden relative">
              {activeTab === 'columns' && selectedTable ? (
                /* TAB 1: SCHEMA COLUMNS VIEW */
                <div className="h-full overflow-auto p-4 select-text space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-theme-card border border-theme-border rounded-xl">
                      <span className="text-[10px] font-mono uppercase text-theme-muted">Total Columns</span>
                      <p className="font-aladin text-2xl text-theme-text font-bold">{selectedTable.columns.length}</p>
                    </div>
                    <div className="p-3 bg-theme-card border border-theme-border rounded-xl">
                      <span className="text-[10px] font-mono uppercase text-theme-muted">Primary Keys</span>
                      <p className="font-aladin text-2xl text-amber-400 font-bold">
                        {selectedTable.columns.filter((c) => c.isPrimaryKey).length}
                      </p>
                    </div>
                    <div className="p-3 bg-theme-card border border-theme-border rounded-xl">
                      <span className="text-[10px] font-mono uppercase text-theme-muted">Foreign Keys</span>
                      <p className="font-aladin text-2xl text-cyan-400 font-bold">
                        {selectedTable.columns.filter((c) => c.isForeignKey).length}
                      </p>
                    </div>
                  </div>

                  {/* Columns Table */}
                  <div className="bg-theme-card border border-theme-border rounded-xl overflow-hidden shadow-lg">
                    <table className="w-full text-left font-mono text-xs border-collapse">
                      <thead>
                        <tr className="bg-theme-surface/80 border-b border-theme-border text-theme-muted text-[11px]">
                          <th className="py-2.5 px-4 w-12 text-center">#</th>
                          <th className="py-2.5 px-4">Column Name</th>
                          <th className="py-2.5 px-4">Data Type</th>
                          <th className="py-2.5 px-4">Nullable</th>
                          <th className="py-2.5 px-4 text-right">Key Constraints</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-theme-border/60">
                        {selectedTable.columns.map((col) => (
                          <tr key={col.columnName} className="hover:bg-theme-surface/60 transition">
                            <td className="py-2 px-4 text-center text-theme-muted text-[11px]">{col.ordinalPosition}</td>
                            <td className="py-2 px-4 font-semibold text-theme-text flex items-center space-x-2">
                              {col.isPrimaryKey && <KeyIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                              <span>{col.columnName}</span>
                            </td>
                            <td className="py-2 px-4 text-cyan-300 font-semibold">
                              {col.dataType}
                              {col.maxLength !== null && col.maxLength > 0 && (
                                <span className="text-theme-muted">({col.maxLength === 2147483647 ? 'MAX' : col.maxLength})</span>
                              )}
                            </td>
                            <td className="py-2 px-4">
                              {col.isNullable ? (
                                <span className="text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-1.5 py-0.5 rounded text-[10px]">
                                  NULL
                                </span>
                              ) : (
                                <span className="text-red-400 bg-red-950/40 border border-red-500/30 px-1.5 py-0.5 rounded text-[10px]">
                                  NOT NULL
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-4 text-right space-x-1">
                              {col.isPrimaryKey && (
                                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded text-[10px] font-bold">
                                  PRIMARY KEY
                                </span>
                              )}
                              {col.isForeignKey && (
                                <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded text-[10px] font-bold">
                                  FOREIGN KEY
                                </span>
                              )}
                              {!col.isPrimaryKey && !col.isForeignKey && (
                                <span className="text-theme-muted text-[10px]">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : activeTab === 'data' && selectedTable ? (
                /* TAB 2: LIVE DATA PREVIEW GRID */
                <div className="h-full overflow-auto p-4 select-text flex flex-col space-y-3">
                  {isLoadingData ? (
                    <div className="h-full flex flex-col items-center justify-center p-12 text-theme-muted space-y-2">
                      <LoaderIcon className="w-8 h-8 animate-spin text-theme-accentPrimary" />
                      <p className="font-mono text-xs">Fetching top 50 records from [{selectedTable.fullName}]...</p>
                    </div>
                  ) : dataError ? (
                    <div className="p-4 bg-red-950/30 border border-red-500/40 text-red-300 font-mono text-xs rounded-xl">
                      {dataError}
                    </div>
                  ) : tableData && tableData.rows.length > 0 ? (
                    <div className="flex-1 bg-theme-card border border-theme-border rounded-xl overflow-auto shadow-lg">
                      <table className="w-full text-left font-mono text-xs border-collapse min-w-max">
                        <thead className="sticky top-0 bg-theme-surface border-b border-theme-border shadow-sm z-10">
                          <tr>
                            <th className="py-2 px-3 bg-theme-surface border-r border-theme-border text-center text-theme-muted w-10 text-[10px]">
                              #
                            </th>
                            {tableData.columns.map((col) => (
                              <th key={col} className="py-2 px-3 text-theme-text font-bold border-r border-theme-border whitespace-nowrap">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-theme-border/40">
                          {tableData.rows.map((row, idx) => (
                            <tr key={idx} className="hover:bg-theme-surface/50 transition">
                              <td className="py-1.5 px-3 border-r border-theme-border text-center text-theme-muted text-[10px] bg-theme-surface/30">
                                {idx + 1}
                              </td>
                              {tableData.columns.map((col) => {
                                const val = row[col];
                                return (
                                  <td key={col} className="py-1.5 px-3 border-r border-theme-border/60 whitespace-nowrap text-theme-text max-w-xs truncate">
                                    {val === null ? (
                                      <span className="text-theme-muted italic text-[10px]">null</span>
                                    ) : (
                                      <span>{val}</span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center p-12 text-theme-muted space-y-2">
                      <p className="font-aladin text-xl text-theme-text">No records stored in table.</p>
                    </div>
                  )}
                </div>
              ) : activeTab === 'erd' ? (
                /* TAB 3: INTERACTIVE ERD DIAGRAM VIEW */
                <div
                  ref={erdCanvasRef}
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onWheel={handleWheel}
                  className="w-full h-full bg-theme-bg overflow-hidden relative cursor-grab active:cursor-grabbing select-none"
                >
                  {/* ERD CANVAS CONTROLS & EXPORT TOOLBAR */}
                  <div className="absolute top-4 left-4 z-20 bg-theme-card/90 backdrop-blur border border-theme-border p-1.5 rounded-xl shadow-xl flex items-center space-x-1.5 flex-wrap">
                    {/* Zoom & View Controls */}
                    <button
                      onClick={() => setZoomScale((prev) => Math.min(2.5, prev + 0.15))}
                      className="p-1.5 text-theme-text hover:bg-theme-surface rounded-lg transition"
                      title="Zoom In (+)"
                    >
                      <ZoomInIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setZoomScale((prev) => Math.max(0.3, prev - 0.15))}
                      className="p-1.5 text-theme-text hover:bg-theme-surface rounded-lg transition"
                      title="Zoom Out (-)"
                    >
                      <ZoomOutIcon className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => {
                        setZoomScale(0.85);
                        setPanOffset({ x: 40, y: 40 });
                      }}
                      className="px-2 py-1 text-xs font-mono font-bold text-theme-text hover:bg-theme-surface rounded-lg transition"
                      title="Reset Zoom & Pan"
                    >
                      {Math.round(zoomScale * 100)}%
                    </button>

                    <button
                      onClick={() => {
                        setZoomScale(0.85);
                        setPanOffset({ x: 40, y: 40 });
                      }}
                      className="p-1.5 text-theme-text hover:bg-theme-surface rounded-lg transition"
                      title="Fit to Screen"
                    >
                      <FitScreenIcon className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => arrangeDiagramGrid(tables)}
                      className="p-1.5 text-theme-accentPrimary hover:bg-theme-surface rounded-lg transition flex items-center space-x-1"
                      title="Auto-arrange Grid Layout"
                    >
                      <LayoutGridIcon className="w-4 h-4" />
                      <span className="text-[11px] font-mono font-semibold hidden sm:inline">Auto Layout</span>
                    </button>

                    <div className="h-4 w-px bg-theme-border mx-1" />

                    {/* EXPORT & CAPTURE TOOLBAR */}
                    <button
                      onClick={exportHighResPng}
                      className="px-2.5 py-1.5 bg-user-gradient text-white rounded-lg text-xs font-bold transition flex items-center space-x-1 shadow-sm hover:brightness-110"
                      title="Export High-Resolution PNG Screenshot for Documentation"
                    >
                      <CameraIcon className="w-3.5 h-3.5" />
                      <span>PNG Photo</span>
                    </button>

                    <button
                      onClick={exportSvg}
                      className="px-2.5 py-1.5 bg-theme-surface hover:bg-theme-card border border-theme-border text-theme-text rounded-lg text-xs font-semibold transition flex items-center space-x-1"
                      title="Export Vector SVG File for Docs & Scaling"
                    >
                      <NetworkLinkIcon className="w-3.5 h-3.5 text-cyan-400" />
                      <span>SVG Vector</span>
                    </button>

                    <button
                      onClick={exportMarkdownDoc}
                      className="px-2.5 py-1.5 bg-theme-surface hover:bg-theme-card border border-theme-border text-theme-text rounded-lg text-xs font-semibold transition flex items-center space-x-1"
                      title="Export Full Markdown (.md) Document & Mermaid Syntax"
                    >
                      <DownloadDocIcon className="w-3.5 h-3.5 text-amber-400" />
                      <span>Markdown (.md)</span>
                    </button>

                    <button
                      onClick={copyMermaidToClipboard}
                      className="p-1.5 text-theme-text hover:bg-theme-surface rounded-lg transition"
                      title="Copy Mermaid ERD Syntax to Clipboard"
                    >
                      <CopyClipboardIcon className="w-4 h-4 text-emerald-400" />
                    </button>

                    <button
                      onClick={printErd}
                      className="p-1.5 text-theme-text hover:bg-theme-surface rounded-lg transition"
                      title="Print / Save as PDF"
                    >
                      <PrinterIcon className="w-4 h-4" />
                    </button>
                  </div>

                  {/* ERD DIAGRAM INNER TRANSFORM CANVAS */}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomScale})`,
                      transformOrigin: '0 0',
                    }}
                  >
                    {/* SVG CONNECTOR LINES FOR RELATIONSHIPS */}
                    <svg className="absolute inset-0 w-[5000px] h-[5000px] pointer-events-none overflow-visible">
                      <defs>
                        <marker
                          id="erd-arrow"
                          viewBox="0 0 10 10"
                          refX="8"
                          refY="5"
                          markerWidth="6"
                          markerHeight="6"
                          orient="auto-start-reverse"
                        >
                          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--theme-accentPrimary, #A9FF68)" />
                        </marker>
                      </defs>

                      {relationships.map((rel, idx) => {
                        const fkPos = nodePositions[rel.fkFullName];
                        const pkPos = nodePositions[rel.pkFullName];
                        if (!fkPos || !pkPos) return null;

                        const isRelated =
                          hoveredTable === rel.fkFullName ||
                          hoveredTable === rel.pkFullName ||
                          selectedTable?.fullName === rel.fkFullName ||
                          selectedTable?.fullName === rel.pkFullName;

                        // Calculate connector anchor coordinates
                        const startX = fkPos.x + 280;
                        const startY = fkPos.y + 45;
                        const endX = pkPos.x;
                        const endY = pkPos.y + 45;

                        // Cubic Bezier curve control points
                        const dx = Math.abs(endX - startX) * 0.5;
                        const pathD = `M ${startX} ${startY} C ${startX + Math.max(60, dx)} ${startY}, ${endX - Math.max(60, dx)} ${endY}, ${endX} ${endY}`;

                        return (
                          <g key={`${rel.constraintName}-${idx}`}>
                            <path
                              d={pathD}
                              fill="none"
                              stroke={isRelated ? 'var(--theme-accentPrimary, #A9FF68)' : 'rgba(255,255,255,0.2)'}
                              strokeWidth={isRelated ? 3 : 1.5}
                              strokeDasharray={isRelated ? undefined : '4 4'}
                              markerEnd="url(#erd-arrow)"
                              className="transition-all duration-300"
                            />
                          </g>
                        );
                      })}
                    </svg>

                    {/* TABLE CARDS NODES */}
                    {tables.map((t) => {
                      const pos = nodePositions[t.fullName] || { x: 50, y: 50 };
                      const isSelected = selectedTable?.fullName === t.fullName;
                      const isHovered = hoveredTable === t.fullName;

                      return (
                        <div
                          key={t.fullName}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            setSelectedTable(t);
                            setDraggingNode(t.fullName);
                            setNodeDragOffset({
                              x: e.clientX - pos.x * zoomScale - panOffset.x,
                              y: e.clientY - pos.y * zoomScale - panOffset.y,
                            });
                          }}
                          onMouseEnter={() => setHoveredTable(t.fullName)}
                          onMouseLeave={() => setHoveredTable(null)}
                          className={`absolute w-70 bg-theme-surface/95 backdrop-blur border rounded-xl shadow-xl transition-shadow pointer-events-auto cursor-move overflow-hidden ${
                            isSelected
                              ? 'border-theme-accentPrimary shadow-theme-accentPrimary/20 shadow-2xl ring-1 ring-theme-accentPrimary'
                              : isHovered
                              ? 'border-theme-accentSecondary/80 shadow-lg'
                              : 'border-theme-border'
                          }`}
                          style={{
                            left: `${pos.x}px`,
                            top: `${pos.y}px`,
                          }}
                        >
                          {/* Node Table Header */}
                          <div className="bg-theme-card px-3 py-2 border-b border-theme-border flex items-center justify-between">
                            <div className="truncate pr-2">
                              <span className="text-[10px] font-mono text-emerald-300 font-semibold uppercase block">
                                {t.schemaName}
                              </span>
                              <span className="font-aladin text-lg text-theme-text font-bold leading-tight">
                                {t.tableName}
                              </span>
                            </div>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-theme-bg border border-theme-border text-emerald-400">
                              {t.rowCount.toLocaleString()}
                            </span>
                          </div>

                          {/* Node Columns List */}
                          <div className="p-2 space-y-1 font-mono text-[11px] max-h-52 overflow-y-auto">
                            {t.columns.map((col) => (
                              <div
                                key={col.columnName}
                                className="flex items-center justify-between px-1.5 py-0.5 rounded hover:bg-theme-card/60"
                              >
                                <div className="flex items-center space-x-1.5 truncate">
                                  {col.isPrimaryKey ? (
                                    <KeyIcon className="w-3 h-3 text-amber-400 shrink-0" />
                                  ) : col.isForeignKey ? (
                                    <NetworkLinkIcon className="w-3 h-3 text-cyan-400 shrink-0" />
                                  ) : (
                                    <div className="w-3 h-3" />
                                  )}
                                  <span className={col.isPrimaryKey ? 'font-bold text-theme-text' : 'text-theme-text'}>
                                    {col.columnName}
                                  </span>
                                </div>
                                <span className="text-[10px] text-cyan-300 font-medium shrink-0 ml-2">
                                  {col.dataType}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-theme-muted space-y-2 p-12">
                  <DatabaseScannerIcon className="w-12 h-12 stroke-[1.2]" />
                  <p className="font-aladin text-2xl text-theme-text font-bold">Select a database table</p>
                  <p className="font-annie text-lg text-theme-muted">
                    Choose any table from the left sidebar or switch to 📊 ERD Diagram mode.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
