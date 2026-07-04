"use client";

import { useState } from "react";
import { FolderPickerModal } from "./FolderPickerModal";
import { useSelectedFolder } from "@/hooks/useSelectedFolder";

export function FolderSettingsCard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFolder, setSelectedFolder] = useSelectedFolder();

  return (
    <>
      <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider mb-2">
            검색 대상 폴더
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-body-md font-body-md font-medium">
              <span className="material-symbols-outlined text-primary">
                folder_open
              </span>
              내 드라이브 <span className="text-outline-variant mx-1">/</span>{" "}
              {selectedFolder ? selectedFolder.name : "폴더를 선택하세요"}
            </div>
            <div className="flex gap-2">
              <span className="bg-surface-container text-on-surface text-label-sm font-label-sm px-2.5 py-1 rounded-md border border-outline-variant/50">
                .xlsx
              </span>
              <span className="bg-surface-container text-on-surface text-label-sm font-label-sm px-2.5 py-1 rounded-md border border-outline-variant/50">
                .csv
              </span>
            </div>
          </div>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="text-label-md font-label-md text-primary border border-primary/30 hover:bg-primary-container/10 px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
        >
          폴더 변경
        </button>
      </div>

      <FolderPickerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelectFolder={(folder) => setSelectedFolder(folder)}
      />
    </>
  );
}
