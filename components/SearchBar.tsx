"use client";

interface SearchBarProps {
  query: string;
  setQuery: (val: string) => void;
  excludeQuery: string;
  setExcludeQuery: (val: string) => void;
  excludeEnabled: boolean;
  setExcludeEnabled: (val: boolean) => void;
  needsSync?: boolean;
  isSyncing?: boolean;
  syncProgress?: string;
  onStartSync?: () => void;
}

export function SearchBar({
  query,
  setQuery,
  excludeQuery,
  setExcludeQuery,
  excludeEnabled,
  setExcludeEnabled,
  needsSync = false,
  isSyncing = false,
  syncProgress = "",
  onStartSync,
}: SearchBarProps) {
  const handleSyncClick = () => {
    if (needsSync && !isSyncing && onStartSync) {
      onStartSync();
    }
  };

  return (
    <div 
      onClick={handleSyncClick}
      className={`rounded-xl p-1.5 md:p-2 shadow-sm border flex flex-col transition-all ${
        needsSync
          ? isSyncing
            ? "bg-primary-container/10 border-primary/40 cursor-wait"
            : "bg-surface-container-low border-primary/40 hover:border-primary hover:bg-primary-container/10 cursor-pointer group"
          : "bg-surface-container-low border-outline-variant/30 focus-within:border-primary/50"
      }`}
      title={
        needsSync
          ? isSyncing
            ? "동기화가 진행 중입니다..."
            : "클릭하면 폴더 동기화를 시작합니다"
          : undefined
      }
    >
      <div className="flex items-center w-full px-2 sm:px-3">
        <span 
          className={`material-symbols-outlined mr-2 shrink-0 text-[20px] ${
            needsSync
              ? isSyncing
                ? "text-primary animate-spin"
                : "text-primary group-hover:scale-110 transition-transform"
              : "text-outline"
          }`}
        >
          {needsSync ? "sync" : "search"}
        </span>
        <input
          className={`flex-1 min-w-0 bg-transparent border-none focus:ring-0 text-body-md font-medium px-0 h-9 focus:outline-none ${
            needsSync
              ? "cursor-pointer text-primary placeholder-primary/75 placeholder:text-primary/75 truncate select-none"
              : "placeholder-outline text-on-surface"
          }`}
          placeholder={
            needsSync
              ? isSyncing
                ? (syncProgress || "폴더 동기화 진행 중...")
                : "검색 전, 폴더 동기화가 필요합니다. 클릭하면 폴더 동기화를 시작합니다."
              : "검색어를 입력하세요..."
          }
          type="text"
          value={needsSync ? "" : query}
          onChange={(e) => !needsSync && setQuery(e.target.value)}
          onClick={handleSyncClick}
          readOnly={needsSync}
          tabIndex={needsSync ? -1 : 0}
        />
        <div className={`flex items-center pl-2.5 border-l border-outline-variant/30 ml-2 shrink-0 ${needsSync ? "opacity-30 pointer-events-none" : ""}`}>
          <label className="flex items-center gap-1.5 cursor-pointer group">
            <div className="relative">
              <input 
                className="sr-only peer" 
                type="checkbox" 
                checked={excludeEnabled}
                onChange={(e) => setExcludeEnabled(e.target.checked)}
                disabled={needsSync}
              />
              <div className="w-8 h-4 sm:w-9 sm:h-5 bg-surface-variant rounded-full peer peer-focus:ring-4 peer-focus:ring-primary/20 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 sm:after:h-4 sm:after:w-4 after:transition-all peer-checked:bg-error"></div>
            </div>
            <span className="text-label-sm font-label-sm text-on-surface-variant group-hover:text-on-surface transition-colors whitespace-nowrap">
              제외
            </span>
          </label>
        </div>
      </div>
      
      {!needsSync && excludeEnabled && (
        <div className="flex items-center w-full px-2 sm:px-3 mt-1.5 pt-1.5 border-t border-outline-variant/20">
          <span className="material-symbols-outlined text-error/70 mr-2 shrink-0 text-[18px]">remove_circle</span>
          <input
            className="flex-1 min-w-0 bg-transparent border-none focus:ring-0 text-body-sm font-medium placeholder-error/50 text-error px-0 h-7 focus:outline-none"
            placeholder="제외할 단어를 입력하세요..."
            type="text"
            value={excludeQuery}
            onChange={(e) => setExcludeQuery(e.target.value)}
          />
        </div>
      )}
    </div>
  );
}
