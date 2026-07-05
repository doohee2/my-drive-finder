"use client";

interface SearchBarProps {
  query: string;
  setQuery: (val: string) => void;
  excludeQuery: string;
  setExcludeQuery: (val: string) => void;
  excludeEnabled: boolean;
  setExcludeEnabled: (val: boolean) => void;
}

export function SearchBar({
  query,
  setQuery,
  excludeQuery,
  setExcludeQuery,
  excludeEnabled,
  setExcludeEnabled,
}: SearchBarProps) {
  return (
    <div className="bg-surface-container-low rounded-xl p-1.5 md:p-2 shadow-sm border border-outline-variant/30 flex flex-col focus-within:border-primary/50 transition-colors">
      <div className="flex items-center w-full px-2 sm:px-3">
        <span className="material-symbols-outlined text-outline mr-2 shrink-0 text-[20px]">search</span>
        <input
          className="flex-1 min-w-0 bg-transparent border-none focus:ring-0 text-body-md font-medium placeholder-outline text-on-surface px-0 h-9 focus:outline-none"
          placeholder="검색어를 입력하세요..."
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="flex items-center pl-2.5 border-l border-outline-variant/30 ml-2 shrink-0">
          <label className="flex items-center gap-1.5 cursor-pointer group">
            <div className="relative">
              <input 
                className="sr-only peer" 
                type="checkbox" 
                checked={excludeEnabled}
                onChange={(e) => setExcludeEnabled(e.target.checked)}
              />
              <div className="w-8 h-4 sm:w-9 sm:h-5 bg-surface-variant rounded-full peer peer-focus:ring-4 peer-focus:ring-primary/20 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 sm:after:h-4 sm:after:w-4 after:transition-all peer-checked:bg-error"></div>
            </div>
            <span className="text-label-sm font-label-sm text-on-surface-variant group-hover:text-on-surface transition-colors whitespace-nowrap">
              제외
            </span>
          </label>
        </div>
      </div>
      
      {excludeEnabled && (
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
