"use client";

import { useState } from "react";
import { FolderPickerModal } from "./FolderPickerModal";
import { useSelectedFolder } from "@/hooks/useSelectedFolder";
import { useFavorites } from "@/hooks/useFavorites";
import { useDriveSync } from "@/hooks/useDriveSync";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useQuery } from "@tanstack/react-query";
import localforage from "localforage";

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 KB';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export function FolderSettingsCard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFolder, setSelectedFolder] = useSelectedFolder();
  const { toggleFavorite, isFavorite } = useFavorites();
  const { isOnline } = useNetworkStatus();
  const { isSyncing, syncProgress, lastSyncTime, sync } = useDriveSync(selectedFolder?.id);

  const { data: cacheSize } = useQuery({
    queryKey: [`cacheSize_${selectedFolder?.id}`],
    queryFn: async () => {
      if (!selectedFolder?.id) return 0;
      let size = await localforage.getItem<number>(`cacheSize_${selectedFolder.id}`);
      if (size === null) {
        const data = await localforage.getItem<any[]>(`driveData_${selectedFolder.id}`);
        size = data ? new Blob([JSON.stringify(data)]).size : 0;
        await localforage.setItem(`cacheSize_${selectedFolder.id}`, size);
      }
      return size;
    },
    enabled: !!selectedFolder?.id,
  });

  const pathParts = selectedFolder?.fullPath 
    ? selectedFolder.fullPath.split(' / ') 
    : ['내 드라이브', selectedFolder?.name || '폴더를 선택하세요'];
  const lastFolder = selectedFolder ? pathParts.pop() : '폴더를 선택하세요';
  const parentPath = selectedFolder ? pathParts.join(' / ') : '';

  return (
    <>
      <div className="bg-surface-container-lowest rounded-xl p-2 md:p-4 shadow-sm border border-outline-variant/30 flex flex-col gap-1 md:gap-3">
        <div className="flex items-center gap-2 md:gap-3 overflow-x-auto no-scrollbar">
          <button 
            onClick={() => {
              if (!isOnline) {
                alert("오프라인 상태에서는 폴더 변경을 사용할 수 없습니다. 즐겨찾기에 캐시된 폴더만 검색 가능합니다.");
                return;
              }
              setIsModalOpen(true);
            }}
            disabled={!isOnline}
            title={!isOnline ? "오프라인 모드에서는 기존 저장된 즐겨찾기 폴더만 검색할 수 있습니다." : "구글 드라이브에서 변경할 폴더를 선택합니다"}
            className="text-label-md font-label-md text-primary border border-primary/30 hover:bg-primary-container/10 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:border-outline"
          >
            폴더 변경
          </button>
          <div className="flex gap-2 shrink-0">
            <span className="bg-surface-container text-on-surface text-[11px] font-medium px-2 py-1 rounded-md border border-outline-variant/50 leading-none flex items-center">
              .xlsx
            </span>
            <span className="bg-surface-container text-on-surface text-[11px] font-medium px-2 py-1 rounded-md border border-outline-variant/50 leading-none flex items-center">
              .csv
            </span>
          </div>
        </div>
        
        <div className="flex items-center min-w-0 bg-surface-container-low py-1.5 px-2.5 md:py-2 md:px-3 rounded-lg border border-outline-variant/20">
          <span className="material-symbols-outlined text-primary shrink-0 mr-2 md:mr-2.5 text-[20px] md:text-[22px]">
            folder_open
          </span>
          {selectedFolder ? (
            <>
              <div className="flex flex-col min-w-0 flex-1 justify-center">
                <div className="flex min-w-0 items-center text-body-sm font-medium">
                  {parentPath && (
                    <>
                      <div className="min-w-0 truncate text-outline-variant shrink">
                        {parentPath}
                      </div>
                      <span className="text-outline-variant mx-1.5 shrink-0">/</span>
                    </>
                  )}
                  <div className="shrink-0 text-on-surface truncate max-w-[60%]">
                    {lastFolder}
                  </div>
                </div>
                <span className="text-[10px] md:text-[11px] text-on-surface-variant mt-0.5 shrink-0 truncate">
                  {lastSyncTime ? `마지막 동기화: ${new Date(lastSyncTime).toLocaleString()} · 사용 용량: ${cacheSize !== undefined ? formatBytes(cacheSize) : '계산 중...'}` : "동기화 기록 없음"}
                </span>
              </div>
              <div className="flex items-center gap-0.5 md:gap-1 shrink-0 ml-2">
                <button
                  onClick={() => isOnline && sync()}
                  disabled={!selectedFolder || isSyncing || !isOnline}
                  title={!isOnline ? "오프라인 상태에서는 동기화할 수 없습니다" : (isSyncing ? (syncProgress || "동기화 중...") : "데이터 동기화")}
                  aria-label="데이터 동기화"
                  className="text-primary hover:text-primary-container p-1 rounded-full hover:bg-surface-variant/50 transition-colors flex items-center justify-center shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <span className={`material-symbols-outlined text-[20px] ${isSyncing ? "animate-spin" : ""}`} data-icon="sync">
                    sync
                  </span>
                </button>
                <button
                  onClick={() => toggleFavorite({ id: selectedFolder.id, name: selectedFolder.name, fullPath: selectedFolder.fullPath })}
                  className="text-primary hover:text-primary-container p-1 rounded-full hover:bg-surface-variant/50 transition-colors flex items-center justify-center shrink-0"
                  title={isFavorite(selectedFolder.id) ? "즐겨찾기 해제" : "즐겨찾기 추가"}
                  aria-label={isFavorite(selectedFolder.id) ? "즐겨찾기 해제" : "즐겨찾기 추가"}
                >
                  <span className={`material-symbols-outlined text-[20px] ${isFavorite(selectedFolder.id) ? 'icon-fill' : ''}`}>
                    star
                  </span>
                </button>
              </div>
            </>
          ) : (
            <span className="text-on-surface-variant text-body-sm font-medium">폴더를 선택하세요</span>
          )}
        </div>
      </div>

      <FolderPickerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelectFolder={(folder) => setSelectedFolder(folder)}
      />
    </>
  );
}
