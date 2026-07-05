"use client";

import { CachedRow } from "@/hooks/useDriveSync";
import { useMemo, useState } from "react";

interface SearchResultsProps {
  results: CachedRow[];
  query: string;
  lastSyncTime?: number | null;
}

export function SearchResults({ results, query, lastSyncTime }: SearchResultsProps) {
  const [expandedFiles, setExpandedFiles] = useState<Record<string, boolean>>({});

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
                <span className="material-symbols-outlined text-[20px] text-secondary icon-fill shrink-0">
                  {group.fileName.endsWith('.csv') || group.sheetName === 'CSV' ? 'data_table' : 'description'}
                </span>
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
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 z-10 bg-surface-bright">
                      <tr className="text-label-sm font-label-sm text-on-surface-variant border-b border-outline-variant/30 uppercase tracking-wider bg-surface-container-low">
                        {columns.map(col => (
                          <th key={col} className="px-4 py-2.5 font-medium whitespace-nowrap">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="text-[13px] leading-tight">
                      {group.rows.map((row) => (
                        <tr key={row._id} className="border-b border-outline-variant/20 hover:bg-surface-container/30 transition-colors">
                          {columns.map(col => (
                            <td key={col} className="px-4 py-2 text-on-surface whitespace-nowrap">
                              {row[col]}
                            </td>
                          ))}
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
