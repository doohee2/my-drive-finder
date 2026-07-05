"use client";

interface BottomNavProps {
  currentTab: 'search' | 'favorites';
  onChangeTab: (tab: 'search' | 'favorites') => void;
}

export function BottomNav({ currentTab, onChangeTab }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 py-2 lg:hidden bg-surface-container-lowest shadow-[0_-2px_10px_rgba(0,0,0,0.05)] dark:shadow-none border-t border-outline-variant/10 transition-colors duration-300">
      <button
        onClick={() => onChangeTab('search')}
        className={`flex flex-col items-center justify-center rounded-lg px-6 py-2 transition-colors ${
          currentTab === 'search'
            ? 'bg-primary-container dark:bg-primary text-on-primary-container dark:text-on-primary'
            : 'text-on-surface-variant dark:text-outline hover:bg-surface-variant/30'
        }`}
      >
        <span className={`material-symbols-outlined ${currentTab === 'search' ? 'icon-fill' : ''}`}>search</span>
        <span className="text-label-sm font-label-sm-mobile mt-1">검색</span>
      </button>
      <button
        onClick={() => onChangeTab('favorites')}
        className={`flex flex-col items-center justify-center rounded-lg px-6 py-2 transition-colors ${
          currentTab === 'favorites'
            ? 'bg-primary-container dark:bg-primary text-on-primary-container dark:text-on-primary'
            : 'text-on-surface-variant dark:text-outline hover:bg-surface-variant/30'
        }`}
      >
        <span className={`material-symbols-outlined ${currentTab === 'favorites' ? 'icon-fill' : ''}`}>star</span>
        <span className="text-label-sm font-label-sm-mobile mt-1">즐겨찾기</span>
      </button>
    </nav>
  );
}
