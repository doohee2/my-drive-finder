"use client";

interface SideNavProps {
  currentTab: 'search' | 'favorites';
  onChangeTab: (tab: 'search' | 'favorites') => void;
}

export function SideNav({ currentTab, onChangeTab }: SideNavProps) {
  return (
    <nav className="h-screen w-64 hidden lg:flex flex-col bg-surface-container-low dark:bg-surface-container-low fixed left-0 top-0 pt-20 z-40 border-r border-outline-variant/30">
      <div className="p-6">
        <div className="text-headline-md font-bold font-headline-md text-primary dark:text-inverse-primary mb-8 mt-2 px-2 flex flex-col gap-1">
          <span>My Drive Finder</span>
          <span>마이 드라이브 파인더</span>
        </div>
      </div>
      <ul className="flex flex-col gap-1 px-4">
        <li>
          <button
            onClick={() => onChangeTab('search')}
            className={`w-full text-left p-4 flex items-center gap-4 rounded-l-lg transition-colors duration-150 ${
              currentTab === 'search' 
                ? 'text-primary dark:text-inverse-primary font-bold border-r-4 border-primary bg-primary-container/20' 
                : 'text-on-surface-variant dark:text-surface-variant hover:bg-surface-variant dark:hover:bg-surface-container-highest rounded-r-lg'
            }`}
          >
            <span className={`material-symbols-outlined ${currentTab === 'search' ? 'icon-fill' : ''}`}>search</span>
            검색
          </button>
        </li>
        <li>
          <button
            onClick={() => onChangeTab('favorites')}
            className={`w-full text-left p-4 flex items-center gap-4 rounded-l-lg transition-colors duration-150 ${
              currentTab === 'favorites' 
                ? 'text-primary dark:text-inverse-primary font-bold border-r-4 border-primary bg-primary-container/20' 
                : 'text-on-surface-variant dark:text-surface-variant hover:bg-surface-variant dark:hover:bg-surface-container-highest rounded-r-lg'
            }`}
          >
            <span className={`material-symbols-outlined ${currentTab === 'favorites' ? 'icon-fill' : ''}`}>star</span>
            즐겨찾기
          </button>
        </li>
      </ul>
    </nav>
  );
}
