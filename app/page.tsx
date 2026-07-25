"use client";

import { useState, useRef } from "react";
import { Header } from "@/components/Header";
import { SideNav } from "@/components/SideNav";
import { BottomNav } from "@/components/BottomNav";
import { FolderSettingsCard } from "@/components/FolderSettingsCard";
import { SearchBar } from "@/components/SearchBar";
import { FileExplorerModal } from "@/components/FileExplorerModal";
import { FolderPickerModal } from "@/components/FolderPickerModal";
import { FileUploadModal } from "@/components/FileUploadModal";
import { SearchResults } from "@/components/SearchResults";
import { EmptyState } from "@/components/EmptyState";
import { FavoritesView } from "@/components/FavoritesView";
import { useSelectedFolder } from "@/hooks/useSelectedFolder";
import { useDriveSync } from "@/hooks/useDriveSync";
import { useSearch } from "@/hooks/useSearch";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { APP_CONFIG } from "@/lib/config";

export default function Home() {
  const [selectedFolder, setSelectedFolder] = useSelectedFolder();
  const { cachedData, lastSyncTime } = useDriveSync(selectedFolder?.id);
  const { isOnline } = useNetworkStatus();

  const [query, setQuery] = useState("");
  const [excludeQuery, setExcludeQuery] = useState("");
  const [excludeEnabled, setExcludeEnabled] = useState(false);
  const [isFolderPickerOpen, setIsFolderPickerOpen] = useState(false);
  const [isFileExplorerOpen, setIsFileExplorerOpen] = useState(false);
  const [folderPickerTab, setFolderPickerTab] = useState<'favorites' | 'browse'>('favorites');
  const [currentTab, setCurrentTab] = useState<'search' | 'favorites'>('search');

  // Upload Feature State
  const [isUploadFolderPickerOpen, setIsUploadFolderPickerOpen] = useState(false);
  const [uploadTargetFolder, setUploadTargetFolder] = useState<{ id: string; name: string } | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isFileUploadModalOpen, setIsFileUploadModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const results = useSearch(cachedData, query, excludeQuery, excludeEnabled);

  const handleSelectFavorite = (folder: { id: string; name: string }) => {
    setSelectedFolder(folder);
    setCurrentTab('search');
  };

  const handleUploadFolderSelect = (folder: { id: string; name: string }) => {
    setUploadTargetFolder(folder);
    setIsUploadFolderPickerOpen(false);
    // 폴더 선택 후 로컬 파일 탐색기 열기
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 100);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadFile(e.target.files[0]);
      setIsFileUploadModalOpen(true);
    }
    // 동일 파일 선택 가능하도록 value 리셋
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleEasterEggClick = () => {
    if (!isOnline) {
      alert("오프라인 상태에서는 드라이브 파일 탐색 및 업로드 기능을 사용할 수 없습니다.");
      return;
    }
    if (currentTab === 'search') {
      setIsFileExplorerOpen(true);
    } else {
      setIsUploadFolderPickerOpen(true);
    }
  };

  return (
    <>
      <Header />
      <div className="flex flex-1 overflow-hidden relative">
        <SideNav currentTab={currentTab} onChangeTab={setCurrentTab} />
        <main className="flex-1 lg:ml-64 p-2 sm:p-3 md:p-margin-desktop overflow-y-auto w-full max-w-container-max mx-auto pb-24 lg:pb-margin-desktop flex flex-col">
          <div className="flex-1">
            {currentTab === 'search' ? (
              <div className="max-w-4xl mx-auto space-y-2 sm:space-y-3 md:space-y-6">
                <FolderSettingsCard />
                <SearchBar 
                  query={query} 
                  setQuery={setQuery} 
                  excludeQuery={excludeQuery} 
                  setExcludeQuery={setExcludeQuery} 
                  excludeEnabled={excludeEnabled} 
                  setExcludeEnabled={setExcludeEnabled} 
                />
                {query.trim() === "" ? (
                  <EmptyState />
                ) : (
                  <SearchResults results={results} query={query} lastSyncTime={lastSyncTime} />
                )}
              </div>
            ) : (
              <FavoritesView onSelectFolder={handleSelectFavorite} />
            )}
          </div>

          {/* Footer Information */}
          <div className="text-center text-[12px] text-on-surface-variant/70 pt-8 pb-4 mt-auto">
            {APP_CONFIG.lastModifiedText.includes("by doohee2") ? (
              <>
                {APP_CONFIG.lastModifiedText.split("by doohee2")[0]}
                <span 
                  onClick={handleEasterEggClick} 
                  className="cursor-default hover:text-on-surface-variant"
                >
                  by doohee2
                </span>
                {APP_CONFIG.lastModifiedText.split("by doohee2")[1]}
              </>
            ) : (
              <span 
                onClick={handleEasterEggClick} 
                className="cursor-default hover:text-on-surface-variant"
              >
                {APP_CONFIG.lastModifiedText}
              </span>
            )}
          </div>
        </main>
      </div>
      <BottomNav currentTab={currentTab} onChangeTab={setCurrentTab} />
      
      {/* Hidden File Input for Upload */}
      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
      
      {/* Modals */}
      <FileExplorerModal isOpen={isFileExplorerOpen} onClose={() => setIsFileExplorerOpen(false)} />
      
      <FolderPickerModal 
        isOpen={isUploadFolderPickerOpen} 
        onClose={() => setIsUploadFolderPickerOpen(false)} 
        onSelectFolder={handleUploadFolderSelect} 
      />
      
      {uploadFile && uploadTargetFolder && (
        <FileUploadModal
          isOpen={isFileUploadModalOpen}
          onClose={() => setIsFileUploadModalOpen(false)}
          file={uploadFile}
          targetFolder={uploadTargetFolder}
        />
      )}
    </>
  );
}
