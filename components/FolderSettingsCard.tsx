"use client";

import { useState } from "react";
import { FolderPickerModal } from "./FolderPickerModal";
import { useSelectedFolder } from "@/hooks/useSelectedFolder";
import { useFavorites } from "@/hooks/useFavorites";

export function FolderSettingsCard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFolder, setSelectedFolder] = useSelectedFolder();
  const { toggleFavorite, isFavorite } = useFavorites();

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
            onClick={() => setIsModalOpen(true)}
            className="text-label-md font-label-md text-primary border border-primary/30 hover:bg-primary-container/10 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0"
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
          <span className="material-symbols-outlined text-primary shrink-0 mr-2 text-[20px]">
            folder_open
          </span>
          {selectedFolder ? (
            <>
              <div className="flex min-w-0 items-center text-body-sm font-medium flex-1">
                {parentPath && (
                  <>
                    <div className="min-w-0 truncate text-outline-variant shrink">
                      {parentPath}
                    </div>
                    <span className="text-outline-variant mx-1.5 shrink-0">/</span>
                  </>
                )}
                <div className="shrink-0 text-on-surface truncate max-w-[50%]">
                  {lastFolder}
                </div>
              </div>
              <button
                onClick={() => toggleFavorite({ id: selectedFolder.id, name: selectedFolder.name, fullPath: selectedFolder.fullPath })}
                className="ml-2 text-primary hover:text-primary-container p-1 rounded-full hover:bg-surface-variant/50 transition-colors flex items-center justify-center shrink-0"
                title={isFavorite(selectedFolder.id) ? "즐겨찾기 해제" : "즐겨찾기 추가"}
              >
                <span className={`material-symbols-outlined text-[20px] ${isFavorite(selectedFolder.id) ? 'icon-fill' : ''}`}>
                  star
                </span>
              </button>
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
