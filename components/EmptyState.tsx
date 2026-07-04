"use client";

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center border-2 border-dashed border-outline-variant/30 rounded-2xl bg-surface-container-lowest/50 mt-4">
      <div className="w-20 h-20 bg-surface-variant/30 rounded-full flex items-center justify-center mb-6 text-primary">
        <span className="material-symbols-outlined text-4xl">travel_explore</span>
      </div>
      <h3 className="text-headline-md font-headline-md text-on-surface mb-2">
        활성화된 검색 없음
      </h3>
      <p className="text-body-md font-body-md text-on-surface-variant max-w-sm">
        검색어를 입력하여 로컬에 캐시된 드라이브 파일을 빠르게 탐색하세요.
      </p>
    </div>
  );
}
