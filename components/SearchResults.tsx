"use client";

import { CachedRow } from "@/hooks/useDriveSync";
import { useMemo, useState } from "react";

interface SearchResultsProps {
  results: CachedRow[];
  query: string;
}

export function SearchResults({ results, query }: SearchResultsProps) {
  const [expandedFiles, setExpandedFiles] = useState<Record<string, boolean>>({});

  const grouped = useMemo(() => {
    const map = new Map<string, { fileId: string; fileName: string; folderId: string; rows: CachedRow[] }>();
    for (const row of results) {
      if (!map.has(row._fileId)) {
        map.set(row._fileId, { fileId: row._fileId, fileName: row._fileName, folderId: row._folderId, rows: [] });
      }
      map.get(row._fileId)!.rows.push(row);
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
    <div className="mt-8 space-y-4">
      <div className="flex justify-between items-end">
        <h3 className="text-headline-md font-headline-md text-on-surface">
          검색 결과
        </h3>
        <span className="text-label-sm font-label-sm text-on-surface-variant">
          {results.length}개의 일치하는 항목
        </span>
      </div>

      {grouped.map((group) => {
        const isExpanded = expandedFiles[group.fileId] !== false; // true by default
        
        // Extract columns from the first row of this group
        const columns = group.rows.length > 0 
          ? Object.keys(group.rows[0]).filter(k => !k.startsWith("_"))
          : [];

        return (
          <div key={group.fileId} className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden mb-4">
            {/* Group Header */}
            <div 
              onClick={() => toggleExpand(group.fileId)}
              className="bg-surface-container-low px-6 py-4 border-b border-outline-variant/30 flex justify-between items-center cursor-pointer hover:bg-surface-container-highest transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-secondary icon-fill">
                  {group.fileName.endsWith('.csv') ? 'data_table' : 'description'}
                </span>
                <div>
                  <h4 className="text-body-md font-body-md font-medium text-on-surface">
                    {group.fileName}
                  </h4>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="bg-secondary-container/30 text-secondary font-label-sm text-label-sm px-2.5 py-1 rounded-full">
                  {group.rows.length}개 항목
                </span>
                <span className={`material-symbols-outlined text-outline transition-transform duration-200 ${isExpanded ? '' : 'rotate-180'}`}>
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
                      <tr className="text-label-sm font-label-sm text-on-surface-variant border-b border-outline-variant/30 uppercase tracking-wider">
                        {columns.map(col => (
                          <th key={col} className="px-6 py-3 font-medium whitespace-nowrap">{col}</th>
                        ))}
                        <th className="px-6 py-3 font-medium whitespace-nowrap text-right">액션</th>
                      </tr>
                    </thead>
                    <tbody className="text-body-sm font-body-sm">
                      {group.rows.map((row) => (
                        <tr key={row._id} className="border-b border-outline-variant/20 hover:bg-surface-container/30 transition-colors">
                          {columns.map(col => (
                            <td key={col} className="px-6 py-4 text-on-surface whitespace-nowrap">
                              {row[col]}
                            </td>
                          ))}
                          <td className="px-6 py-4 text-right">
                            <button 
                              onClick={() => alert("데이터 수정 및 쓰기 기능은 향후 업데이트에 추가될 예정입니다.")}
                              className="text-primary hover:bg-primary-container/20 p-2 rounded-full transition-colors"
                              title="수정 (준비 중)"
                            >
                              <span className="material-symbols-outlined text-sm">edit</span>
                            </button>
                          </td>
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
