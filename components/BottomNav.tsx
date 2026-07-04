"use client";

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 py-2 lg:hidden bg-surface dark:bg-surface-dim shadow-lg border-t border-outline-variant/10">
      <a
        className="flex flex-col items-center justify-center bg-primary-container dark:bg-primary text-on-primary-container dark:text-on-primary rounded-full px-4 py-1 scale-90 duration-200"
        href="#"
      >
        <span className="material-symbols-outlined icon-fill">search</span>
        <span className="text-label-sm font-label-sm-mobile mt-1">검색</span>
      </a>
      <a
        className="flex flex-col items-center justify-center text-on-surface-variant dark:text-outline p-2 hover:bg-surface-variant/30 rounded-lg transition-colors"
        href="#"
      >
        <span className="material-symbols-outlined">folder</span>
        <span className="text-label-sm font-label-sm-mobile mt-1">폴더</span>
      </a>
      <a
        className="flex flex-col items-center justify-center text-on-surface-variant dark:text-outline p-2 hover:bg-surface-variant/30 rounded-lg transition-colors"
        href="#"
      >
        <span className="material-symbols-outlined">history</span>
        <span className="text-label-sm font-label-sm-mobile mt-1">최근 항목</span>
      </a>
      <a
        className="flex flex-col items-center justify-center text-on-surface-variant dark:text-outline p-2 hover:bg-surface-variant/30 rounded-lg transition-colors"
        href="#"
      >
        <span className="material-symbols-outlined">settings</span>
        <span className="text-label-sm font-label-sm-mobile mt-1">설정</span>
      </a>
    </nav>
  );
}
