"use client";

import { useState } from "react";
import { Header } from "@/components/Header";
import { SideNav } from "@/components/SideNav";
import { BottomNav } from "@/components/BottomNav";
import { FolderSettingsCard } from "@/components/FolderSettingsCard";
import { SearchBar } from "@/components/SearchBar";
import { SearchResults } from "@/components/SearchResults";
import { EmptyState } from "@/components/EmptyState";
import { FavoritesView } from "@/components/FavoritesView";
import { useSelectedFolder } from "@/hooks/useSelectedFolder";
import { useDriveSync } from "@/hooks/useDriveSync";
import { useSearch } from "@/hooks/useSearch";

export default function Home() {
  const [selectedFolder, setSelectedFolder] = useSelectedFolder();
  const { cachedData, lastSyncTime } = useDriveSync(selectedFolder?.id);

  const [query, setQuery] = useState("");
  const [excludeQuery, setExcludeQuery] = useState("");
  const [excludeEnabled, setExcludeEnabled] = useState(false);
  const [currentTab, setCurrentTab] = useState<'search' | 'favorites'>('search');

  const results = useSearch(cachedData, query, excludeQuery, excludeEnabled);

  const handleSelectFavorite = (folder: { id: string; name: string }) => {
    setSelectedFolder(folder);
    setCurrentTab('search');
  };

  return (
    <>
      <Header />
      <div className="flex flex-1 overflow-hidden relative">
        <SideNav currentTab={currentTab} onChangeTab={setCurrentTab} />
        <main className="flex-1 lg:ml-64 p-2 sm:p-3 md:p-margin-desktop overflow-y-auto w-full max-w-container-max mx-auto pb-24 lg:pb-margin-desktop">
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
        </main>
      </div>
      <BottomNav currentTab={currentTab} onChangeTab={setCurrentTab} />
    </>
  );
}
