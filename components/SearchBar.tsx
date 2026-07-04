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
    <div className="bg-surface-container-low rounded-xl p-2 md:p-3 shadow-md border border-outline-variant/30 flex flex-col sm:flex-row items-stretch sm:items-center focus-within:border-primary/50 transition-colors">
      <div className="flex-1 flex items-center px-4">
        <span className="material-symbols-outlined text-outline mr-3">search</span>
        <input
          className="w-full bg-transparent border-none focus:ring-0 text-body-lg font-body-lg placeholder-outline text-on-surface px-0 h-11 focus:outline-none"
          placeholder="검색어를 입력하세요..."
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center px-4 py-2 bg-surface-container-lowest sm:bg-transparent border-t sm:border-t-0 sm:border-l border-outline-variant/30 sm:ml-2 gap-3 sm:gap-4">
        <label className="flex items-center gap-2 cursor-pointer group">
          <div className="relative">
            <input 
              className="sr-only peer" 
              type="checkbox" 
              checked={excludeEnabled}
              onChange={(e) => setExcludeEnabled(e.target.checked)}
            />
            <div className="w-10 h-6 bg-surface-variant rounded-full peer peer-focus:ring-4 peer-focus:ring-primary/20 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-error"></div>
          </div>
          <span className="text-label-md font-label-md text-on-surface-variant group-hover:text-on-surface transition-colors whitespace-nowrap">
            제외할 단어
          </span>
        </label>
        
        {excludeEnabled && (
          <input
            className="w-full sm:w-32 bg-transparent border-none focus:ring-0 text-body-md font-body-md placeholder-error/50 text-error px-0 h-8 focus:outline-none"
            placeholder="제외어..."
            type="text"
            value={excludeQuery}
            onChange={(e) => setExcludeQuery(e.target.value)}
          />
        )}
      </div>
    </div>
  );
}
