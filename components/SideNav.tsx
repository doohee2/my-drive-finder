"use client";

export function SideNav() {
  return (
    <nav className="h-screen w-64 hidden lg:flex flex-col bg-surface-container-low dark:bg-surface-container-low fixed left-0 top-0 pt-20 z-40 border-r border-outline-variant/30">
      <div className="p-6">
        <div className="text-label-sm font-label-sm text-on-surface-variant mb-1 uppercase tracking-wider">
          파일 관리
        </div>
        <div className="text-headline-md font-headline-md text-primary dark:text-inverse-primary mb-6">
          마이 드라이브 파인더
        </div>
        <button className="w-full flex items-center justify-center gap-2 bg-primary text-on-primary font-label-md text-label-md py-3 px-4 rounded-lg hover:opacity-90 transition-opacity mb-8 shadow-sm">
          <span className="material-symbols-outlined text-lg">add</span>
          새 검색
        </button>
      </div>
      <ul className="flex flex-col gap-1 px-4">
        <li>
          <a
            className="text-primary dark:text-inverse-primary font-bold border-r-4 border-primary bg-primary-container/20 p-4 flex items-center gap-4 rounded-l-lg scale-98 duration-150"
            href="#"
          >
            <span className="material-symbols-outlined icon-fill">search</span>
            검색
          </a>
        </li>
        <li>
          <a
            className="text-on-surface-variant dark:text-surface-variant p-4 flex items-center gap-4 hover:bg-surface-variant dark:hover:bg-surface-container-highest rounded-lg transition-colors"
            href="#"
          >
            <span className="material-symbols-outlined">folder</span>
            폴더
          </a>
        </li>
        <li>
          <a
            className="text-on-surface-variant dark:text-surface-variant p-4 flex items-center gap-4 hover:bg-surface-variant dark:hover:bg-surface-container-highest rounded-lg transition-colors"
            href="#"
          >
            <span className="material-symbols-outlined">history</span>
            최근 항목
          </a>
        </li>
        <li>
          <a
            className="text-on-surface-variant dark:text-surface-variant p-4 flex items-center gap-4 hover:bg-surface-variant dark:hover:bg-surface-container-highest rounded-lg transition-colors"
            href="#"
          >
            <span className="material-symbols-outlined">settings</span>
            설정
          </a>
        </li>
      </ul>
    </nav>
  );
}
