"use client";

import { useFavorites } from "@/hooks/useFavorites";

interface FavoritesViewProps {
  onSelectFolder: (folder: { id: string; name: string; fullPath?: string }) => void;
}

import { useQuery, useQueryClient } from "@tanstack/react-query";
import localforage from "localforage";
import { useCallback, useEffect, useState } from "react";

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 KB';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function FavoriteItem({ 
  folder, 
  onSelect, 
  onRemove,
  onSizeLoad
}: { 
  folder: { id: string; name: string; fullPath?: string }; 
  onSelect: () => void; 
  onRemove: () => void;
  onSizeLoad: (id: string, size: number) => void;
}) {
  const { data: lastSyncTime } = useQuery({
    queryKey: [`lastSync_${folder.id}`],
    queryFn: async () => await localforage.getItem<string>(`lastSync_${folder.id}`),
  });

  const { data: cacheSize } = useQuery({
    queryKey: [`cacheSize_${folder.id}`],
    queryFn: async () => {
      let size = await localforage.getItem<number>(`cacheSize_${folder.id}`);
      if (size === null) {
        // Fallback calculation for old data
        const data = await localforage.getItem<any[]>(`driveData_${folder.id}`);
        size = data ? new Blob([JSON.stringify(data)]).size : 0;
        await localforage.setItem(`cacheSize_${folder.id}`, size);
      }
      return size;
    },
  });

  useEffect(() => {
    if (cacheSize !== undefined) {
      onSizeLoad(folder.id, cacheSize);
    }
  }, [cacheSize, folder.id, onSizeLoad]);

  const pathParts = folder.fullPath 
    ? folder.fullPath.split(' / ') 
    : ['내 드라이브', folder.name];
  const lastFolder = pathParts.pop();
  const parentPath = pathParts.join(' / ');

  return (
    <li className="group">
      <div className="w-full flex items-center justify-between p-4 bg-surface-container-low hover:bg-surface-variant rounded-xl border border-outline-variant/20 transition-colors">
        <button
          onClick={onSelect}
          className="flex-1 flex items-center gap-4 text-left min-w-0"
        >
          <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined">folder</span>
          </div>
          <div className="flex flex-col min-w-0 flex-1 pr-4">
            <div className="flex min-w-0 items-center text-body-lg font-medium text-on-surface group-hover:text-primary transition-colors">
              {parentPath && (
                <>
                  <div className="min-w-0 truncate text-outline-variant shrink">
                    {parentPath}
                  </div>
                  <span className="text-outline-variant mx-1.5 shrink-0">/</span>
                </>
              )}
              <div className="shrink-0 truncate max-w-[60%]">
                {lastFolder}
              </div>
            </div>
            <span className="text-[10px] md:text-[11px] text-on-surface-variant mt-0.5 shrink-0">
              {lastSyncTime ? `마지막 동기화: ${new Date(lastSyncTime).toLocaleString()} · 사용 용량: ${cacheSize !== undefined ? formatBytes(cacheSize) : '계산 중...'}` : "동기화 기록 없음"}
            </span>
          </div>
        </button>
        <button
          onClick={onRemove}
          className="shrink-0 p-2 text-on-surface-variant hover:text-error hover:bg-error-container/30 rounded-full transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100"
          title="즐겨찾기에서 제거"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>
    </li>
  );
}

export function FavoritesView({ onSelectFolder }: FavoritesViewProps) {
  const { favorites, removeFavorite, isLoaded, clearAllCache } = useFavorites();
  const [sizes, setSizes] = useState<Record<string, number>>({});
  const queryClient = useQueryClient();

  const handleSizeLoad = useCallback((id: string, size: number) => {
    setSizes(prev => ({ ...prev, [id]: size }));
  }, []);

  const handleRemove = async (id: string) => {
    await removeFavorite(id);
    setSizes(prev => {
      const newSizes = { ...prev };
      delete newSizes[id];
      return newSizes;
    });
    queryClient.invalidateQueries();
  };

  const handleClearAll = async () => {
    if (window.confirm("모든 캐시 데이터를 삭제하시겠습니까? (즐겨찾기 목록은 유지됩니다)")) {
      await clearAllCache();
      setSizes({});
      queryClient.invalidateQueries();
      alert("모든 로컬 캐시 데이터가 삭제되었습니다.");
    }
  };

  const totalSize = Object.values(sizes).reduce((acc, curr) => acc + curr, 0);

  if (!isLoaded) {
    return (
      <div className="w-full h-64 flex items-center justify-center text-on-surface-variant">
        <span className="material-symbols-outlined animate-spin mr-2">refresh</span>
        로딩 중...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant/30">
        <h2 className="text-headline-sm font-headline-sm text-on-surface flex items-center gap-2 mb-6">
          <span className="material-symbols-outlined text-primary">star</span>
          즐겨찾기 폴더
        </h2>

        {favorites.length === 0 ? (
          <div className="text-center py-12 text-on-surface-variant flex flex-col items-center">
            <span className="material-symbols-outlined text-5xl text-outline mb-4">star_border</span>
            <p>즐겨찾기에 등록된 폴더가 없습니다.</p>
            <p className="text-sm mt-2">검색 탭에서 폴더를 선택한 뒤 별 모양 아이콘을 눌러 추가해 보세요.</p>
          </div>
        ) : (
          <>
            <ul className="space-y-3">
              {favorites.map((folder) => (
                <FavoriteItem 
                  key={folder.id} 
                  folder={folder} 
                  onSelect={() => onSelectFolder(folder)} 
                  onRemove={() => handleRemove(folder.id)} 
                  onSizeLoad={handleSizeLoad}
                />
              ))}
            </ul>
            <div className="mt-8 pt-6 border-t border-outline-variant/20 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex flex-col">
                <span className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">현재 사용 중인 전체 캐시 용량</span>
                <span className="text-headline-sm font-headline-sm text-on-surface mt-1">{formatBytes(totalSize)}</span>
              </div>
              <button
                onClick={handleClearAll}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-error text-on-error hover:bg-error/90 px-6 py-2.5 rounded-lg text-label-md font-medium transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">delete</span>
                전체 캐시 초기화
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
