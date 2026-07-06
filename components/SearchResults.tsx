"use client";

import { CachedRow } from "@/hooks/useDriveSync";
import { useMemo, useState, useRef } from "react";
import Papa from "papaparse";

import * as XLSX from "xlsx";

interface SearchResultsProps {
  results: CachedRow[];
  fullData: CachedRow[];
  query: string;
  lastSyncTime?: string | number | null;
}

const HighlightedText = ({ text, query }: { text: string; query: string }) => {
  if (!query.trim() || !text) return <>{text}</>;
  
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return <>{text}</>;

  const escapedTokens = tokens.map(t => t.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));
  const regex = new RegExp(`(${escapedTokens.join('|')})`, 'gi');
  
  const parts = String(text).split(regex);
  
  return (
    <>
      {parts.map((part, i) => {
        const isMatch = tokens.some(t => t === part.toLowerCase());
        return isMatch ? (
          <span key={i} className="font-bold text-primary dark:text-inverse-primary bg-primary/10 px-0.5 rounded-sm">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        );
      })}
    </>
  );
};

export function SearchResults({ results, fullData, query, lastSyncTime }: SearchResultsProps) {
  const [expandedFiles, setExpandedFiles] = useState<Record<string, boolean>>({});
  const [colWidths, setColWidths] = useState<Record<string, number>>({});
  const resizingCol = useRef<{ key: string, startX: number, startWidth: number } | null>(null);

  const handleExport = (e: React.MouseEvent, fileId: string, originalFileName: string) => {
    e.stopPropagation(); // 아코디언 토글 방지
    
    // 전체 데이터(fullData)에서 해당 파일의 모든 행 추출
    const fileRows = fullData.filter(r => r._fileId === fileId);
    if (fileRows.length === 0) return;

    // 시트별로 그룹화
    const sheets = new Map<string, any[]>();
    for (const row of fileRows) {
      const sheet = row._sheetName || 'Sheet1';
      if (!sheets.has(sheet)) sheets.set(sheet, []);
      
      // 검색용 내부 메타데이터 필드(_id, _fileId 등) 제외
      const cleanRow: any = {};
      for (const key of Object.keys(row)) {
        if (!key.startsWith('_')) {
          cleanRow[key] = row[key];
        }
      }
      sheets.get(sheet)!.push(cleanRow);
    }

    // 파일명 결정
    let exportName = originalFileName;
    const isCsv = exportName.toLowerCase().endsWith('.csv');
    
    if (!isCsv && !exportName.toLowerCase().endsWith('.xlsx')) {
      exportName += '.xlsx'; 
    }

    if (isCsv) {
      // CSV 전용 내보내기 (papaparse 사용)
      // CSV는 시트가 하나이므로 첫 번째 시트의 데이터를 가져옵니다.
      const firstSheetData = Array.from(sheets.values())[0] || [];
      const csvString = Papa.unparse(firstSheetData);
      
      const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' }); // BOM 추가 (엑셀에서 한글 깨짐 방지)
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = exportName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // 엑셀(.xlsx) 전용 내보내기
      const wb = XLSX.utils.book_new();
      for (const [sheetName, rows] of sheets.entries()) {
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      }
      XLSX.writeFile(wb, exportName);
    }
  };

  const startResize = (e: React.MouseEvent | React.TouchEvent, colKey: string) => {
    // Prevent default to stop scrolling on mobile, but e.preventDefault() in React 
    // passive touch event handlers might be ignored. We'll use CSS `touch-action: none` below.
    e.stopPropagation();
    const currentWidth = colWidths[colKey] || 150;
    
    // Get starting X coordinate from either mouse or touch
    const startX = 'touches' in e ? e.touches[0].pageX : (e as React.MouseEvent).pageX;
    resizingCol.current = { key: colKey, startX, startWidth: currentWidth };
    
    const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
      if (!resizingCol.current) return;
      const currentX = 'touches' in moveEvent ? moveEvent.touches[0].pageX : (moveEvent as MouseEvent).pageX;
      const diff = currentX - resizingCol.current.startX;
      const newWidth = Math.max(50, resizingCol.current.startWidth + diff);
      setColWidths(prev => ({ ...prev, [resizingCol.current!.key]: newWidth }));
    };
    
    const handleUp = () => {
      resizingCol.current = null;
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleUp);
    };
    
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleUp);
  };

  const grouped = useMemo(() => {
    const map = new Map<string, { fileId: string; sheetName: string; fileName: string; folderId: string; rows: CachedRow[] }>();
    for (const row of results) {
      const sheetName = row._sheetName || '';
      const groupKey = `${row._fileId}_${sheetName}`;
      if (!map.has(groupKey)) {
        const displayFileName = sheetName && sheetName !== 'CSV' ? `${row._fileName} (${sheetName})` : row._fileName;
        map.set(groupKey, { 
          fileId: groupKey, 
          sheetName: sheetName,
          fileName: displayFileName, 
          folderId: row._folderId, 
          rows: [] 
        });
      }
      map.get(groupKey)!.rows.push(row);
    }
    return Array.from(map.values());
  }, [results]);

  const toggleExpand = (fileId: string) => {
    setExpandedFiles(prev => ({
      ...prev,
      [fileId]: prev[fileId] !== undefined ? !prev[fileId] : false
    }));
  };

  if (results.length === 0) return null;

  return (
    <div className="mt-3 md:mt-4 space-y-3 md:space-y-4">
      <div className="flex flex-row justify-between items-end gap-2 w-full overflow-hidden">
        <h3 className="text-body-lg sm:text-headline-md font-headline-md text-on-surface flex flex-wrap sm:flex-nowrap items-baseline gap-1 sm:gap-2 min-w-0 truncate">
          <span className="shrink-0">검색 결과</span>
          {lastSyncTime && (
            <span className="text-[10px] sm:text-[11px] md:text-body-sm font-normal text-on-surface-variant truncate">
              (마지막 동기화: {new Date(lastSyncTime).toLocaleString()})
            </span>
          )}
        </h3>
        <span className="text-[11px] sm:text-label-sm font-label-sm text-on-surface-variant shrink-0 mb-0.5 sm:mb-0">
          {results.length}개 일치
        </span>
      </div>

      {grouped.map((group) => {
        const isExpanded = expandedFiles[group.fileId] !== false; // true by default
        
        // Extract columns from the first row of this group
        const columns = group.rows.length > 0 
          ? Object.keys(group.rows[0]).filter(k => !k.startsWith("_"))
          : [];

        return (
          <div key={group.fileId} className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden mb-3 md:mb-4">
            {/* Group Header */}
            <div 
              onClick={() => toggleExpand(group.fileId)}
              className="bg-surface-container-low px-4 py-2.5 md:px-5 md:py-3 border-b border-outline-variant/30 flex justify-between items-center cursor-pointer hover:bg-surface-container-highest transition-colors"
            >
              <div className="flex items-center gap-2 md:gap-3 min-w-0 pr-3">
                <button 
                  onClick={(e) => handleExport(e, group.rows[0]._fileId, group.rows[0]._fileName)}
                  className="shrink-0 p-1.5 -ml-1.5 rounded-full hover:bg-secondary/10 text-secondary transition-colors"
                  title="원본 파일 내보내기 (다운로드)"
                >
                  <span className="material-symbols-outlined text-[20px] icon-fill block">
                    {group.fileName.endsWith('.csv') || group.sheetName === 'CSV' ? 'data_table' : 'description'}
                  </span>
                </button>
                <div className="min-w-0 truncate">
                  <h4 className="text-body-sm md:text-body-md font-medium text-on-surface truncate">
                    {group.fileName}
                  </h4>
                </div>
              </div>
              <div className="flex items-center gap-2 md:gap-3 shrink-0">
                <span className="bg-secondary-container/30 text-secondary text-[11px] md:text-label-sm font-medium px-2 py-0.5 md:px-2.5 md:py-1 rounded-full">
                  {group.rows.length}개
                </span>
                <span className={`material-symbols-outlined text-[20px] text-outline transition-transform duration-200 ${isExpanded ? '' : 'rotate-180'}`}>
                  expand_less
                </span>
              </div>
            </div>

            {/* Data Area */}
            {isExpanded && (
              <div className="w-full">
                {/* Table View (Responsive with horizontal scrolling) */}
                <div className="w-full overflow-x-auto max-h-[500px] overflow-y-auto">
                  <table className="text-left border-collapse table-fixed bg-surface-lowest">
                    <thead className="sticky top-0 z-10 shadow-[0_1px_0_rgba(0,0,0,0.1)]">
                      <tr className="uppercase tracking-wider bg-surface-container-low border-b border-outline-variant/30">
                        {columns.map(col => {
                          const colKey = `${group.fileId}_${col}`;
                          const width = colWidths[colKey] || 150;
                          return (
                            <th 
                              key={col} 
                              className="relative p-0 font-medium whitespace-nowrap border-r border-outline-variant/30 group bg-surface-container-low select-none"
                              style={{ width, minWidth: width, maxWidth: width }}
                            >
                              <div className="px-3 py-2 truncate text-[13px] text-on-surface-variant text-left w-full">
                                {col}
                              </div>
                              <div 
                                onMouseDown={(e) => startResize(e, colKey)}
                                onTouchStart={(e) => startResize(e, colKey)}
                                className="absolute right-0 top-0 w-[12px] -mr-[6px] h-full cursor-col-resize bg-outline-variant/30 hover:bg-primary/60 transition-colors z-20 flex items-center justify-center opacity-70 hover:opacity-100 touch-none"
                              />
                            </th>
                          );
                        })}
                        <th className="w-full bg-surface-container-low border-b border-outline-variant/30"></th>
                      </tr>
                    </thead>
                    <tbody className="text-[13px] leading-tight">
                      {group.rows.map((row) => (
                        <tr key={row._id} className="border-b border-outline-variant/30 hover:bg-surface-container/30 transition-colors">
                          {columns.map(col => {
                            const colKey = `${group.fileId}_${col}`;
                            const width = colWidths[colKey] || 150;
                            return (
                              <td 
                                key={col} 
                                className="px-3 py-1.5 text-on-surface border-r border-outline-variant/20"
                                style={{ width, minWidth: width, maxWidth: width }}
                              >
                                <div className="truncate w-full">
                                  <HighlightedText text={String(row[col])} query={query} />
                                </div>
                              </td>
                            );
                          })}
                          <td className="w-full"></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
