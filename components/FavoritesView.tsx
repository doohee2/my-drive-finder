"use client";

import { useFavorites } from "@/hooks/useFavorites";

interface FavoritesViewProps {
  onSelectFolder: (folder: { id: string; name: string }) => void;
}

export function FavoritesView({ onSelectFolder }: FavoritesViewProps) {
  const { favorites, removeFavorite, isLoaded } = useFavorites();

  if (!isLoaded) {
    return (
      <div className="w-full h-64 flex items-center justify-center text-on-surface-variant">
        <span className="material-symbols-outlined animate-spin mr-2">refresh</span>
        로딩 중...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant/30">
        <h2 className="text-headline-sm font-headline-sm text-on-surface flex items-center gap-2 mb-6">
          <span className="material-symbols-outlined text-primary">star</span>
          즐겨찾기 폴더
        </h2>

        {favorites.length === 0 ? (
          <div className="text-center py-12 text-on-surface-variant flex flex-col items-center">
            <span className="material-symbols-outlined text-5xl text-outline mb-4">star_border</span>
            <p>즐겨찾기에 등록된 폴더가 없습니다.</p>
            <p className="text-sm mt-2">검색 탭에서 폴더를 선택한 뒤 별 모양 아이콘을 눌러 추가해 보세요.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {favorites.map((folder) => (
              <li key={folder.id} className="group">
                <div className="w-full flex items-center justify-between p-4 bg-surface-container-low hover:bg-surface-variant rounded-xl border border-outline-variant/20 transition-colors">
                  <button
                    onClick={() => onSelectFolder(folder)}
                    className="flex-1 flex items-center gap-4 text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined">folder</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-body-lg font-medium text-on-surface group-hover:text-primary transition-colors">
                        {folder.name}
                      </span>
                    </div>
                  </button>
                  <button
                    onClick={() => removeFavorite(folder.id)}
                    className="shrink-0 p-2 text-on-surface-variant hover:text-error hover:bg-error-container/30 rounded-full transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100"
                    title="즐겨찾기에서 제거"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
