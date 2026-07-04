"use client";

import { useState } from "react";
import { Header } from "@/components/Header";
import { SideNav } from "@/components/SideNav";
import { BottomNav } from "@/components/BottomNav";
import { FolderSettingsCard } from "@/components/FolderSettingsCard";
import { SearchBar } from "@/components/SearchBar";
import { SearchResults } from "@/components/SearchResults";
import { EmptyState } from "@/components/EmptyState";
import { useSelectedFolder } from "@/hooks/useSelectedFolder";
import { useDriveSync } from "@/hooks/useDriveSync";
import { useSearch } from "@/hooks/useSearch";

export default function Home() {
  const [selectedFolder] = useSelectedFolder();
  const { cachedData } = useDriveSync(selectedFolder?.id);

  const [query, setQuery] = useState("");
  const [excludeQuery, setExcludeQuery] = useState("");
  const [excludeEnabled, setExcludeEnabled] = useState(false);

  const results = useSearch(cachedData, query, excludeQuery, excludeEnabled);

  return (
    <>
      <Header />
      <div className="flex flex-1 overflow-hidden relative">
        <SideNav />
        <main className="flex-1 lg:ml-64 p-margin-mobile md:p-margin-desktop overflow-y-auto w-full max-w-container-max mx-auto pb-24 lg:pb-margin-desktop">
          <div className="max-w-4xl mx-auto space-y-6">
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
              <SearchResults results={results} query={query} />
            )}
          </div>
        </main>
      </div>
      <BottomNav />
    </>
  );
}
