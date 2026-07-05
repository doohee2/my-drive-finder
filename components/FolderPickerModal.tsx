"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

interface Folder {
  id: string;
  name: string;
  path?: string;
  parentId: string;
}

interface FolderPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFolder: (folder: Folder) => void;
}

export function FolderPickerModal({ isOpen, onClose, onSelectFolder }: FolderPickerModalProps) {
  const { data: session } = useSession();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Navigation state
  const [pathStack, setPathStack] = useState<{id: string, name: string}[]>([{ id: 'root', name: '내 드라이브' }]);

  useEffect(() => {
    if (isOpen && session) {
      fetchFolders();
      setPathStack([{ id: 'root', name: '내 드라이브' }]); // reset on open
    }
  }, [isOpen, session]);

  const fetchFolders = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/drive/folders");
      if (!res.ok) {
        throw new Error("Failed to fetch folders");
      }
      const data = await res.json();
      // Sort alphabetically by name within the same level
      const sortedFolders = (data.folders || []).sort((a: Folder, b: Folder) => a.name.localeCompare(b.name));
      setFolders(sortedFolders);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const currentParentId = pathStack[pathStack.length - 1].id;
  const currentLevelFolders = folders.filter(f => f.parentId === currentParentId);

  const navigateTo = (folder: Folder) => {
    setPathStack(prev => [...prev, { id: folder.id, name: folder.name }]);
  };

  const navigateUpTo = (index: number) => {
    setPathStack(prev => prev.slice(0, index + 1));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-surface dark:bg-surface-dim w-full max-w-lg rounded-2xl shadow-xl flex flex-col max-h-[80vh] overflow-hidden">
        <div className="p-4 border-b border-outline-variant/30 flex justify-between items-center">
          <h2 className="text-headline-md font-headline-md text-on-surface">폴더 선택</h2>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface p-1 rounded-full hover:bg-surface-variant transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        
        {/* Breadcrumbs */}
        {!loading && !error && session && (
          <div className="px-4 py-3 bg-surface-container-lowest border-b border-outline-variant/30 flex flex-wrap items-center gap-1 overflow-x-auto no-scrollbar">
            {pathStack.map((step, idx) => (
              <div key={step.id} className="flex items-center shrink-0">
                <button
                  onClick={() => navigateUpTo(idx)}
                  className={`text-body-sm font-medium hover:underline ${idx === pathStack.length - 1 ? 'text-on-surface' : 'text-on-surface-variant hover:text-primary'}`}
                >
                  {step.name}
                </button>
                {idx < pathStack.length - 1 && (
                  <span className="material-symbols-outlined text-outline-variant text-sm mx-1">chevron_right</span>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="p-4 flex-1 overflow-y-auto">
          {!session ? (
            <div className="text-center text-on-surface-variant py-8">
              로그인이 필요합니다.
            </div>
          ) : loading ? (
            <div className="text-center text-on-surface-variant py-8 flex items-center justify-center gap-2">
              <span className="material-symbols-outlined animate-spin">refresh</span>
              폴더를 불러오는 중...
            </div>
          ) : error ? (
            <div className="text-error text-center py-8">{error}</div>
          ) : currentLevelFolders.length === 0 ? (
            <div className="text-center text-on-surface-variant py-12 flex flex-col items-center">
              <span className="material-symbols-outlined text-4xl text-outline mb-2">folder_open</span>
              <p>이 위치에는 하위 폴더가 없습니다.</p>
              {currentParentId !== 'root' && (
                <button
                  onClick={() => {
                    onSelectFolder({ id: currentParentId, name: pathStack[pathStack.length - 1].name, parentId: pathStack.length > 1 ? pathStack[pathStack.length - 2].id : 'root' });
                    onClose();
                  }}
                  className="mt-4 px-4 py-2 bg-primary text-on-primary rounded-lg text-label-md font-medium hover:bg-primary/90 transition-colors"
                >
                  현재 위치('{pathStack[pathStack.length - 1].name}') 선택하기
                </button>
              )}
            </div>
          ) : (
            <ul className="space-y-2">
              {currentParentId === 'root' && (
                <li className="mb-4">
                  <button
                    onClick={() => {
                      onSelectFolder({ id: 'root', name: '내 드라이브', parentId: 'root' });
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-3 bg-primary-container/20 border border-primary/30 rounded-lg hover:bg-primary-container/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-primary">cloud</span>
                      <span className="text-body-md font-medium text-primary-dark dark:text-primary-light">내 드라이브 전체 선택</span>
                    </div>
                    <span className="text-label-md font-medium bg-primary text-on-primary px-3 py-1.5 rounded-md">선택</span>
                  </button>
                </li>
              )}
              {currentLevelFolders.map((folder) => {
                // Check if this folder has children to show a visual hint
                const hasChildren = folders.some(f => f.parentId === folder.id);
                
                return (
                  <li key={folder.id} className="flex items-center gap-2 group">
                    <button
                      onClick={() => navigateTo(folder)}
                      className="flex-1 flex items-center gap-3 p-3 text-left bg-surface-container-lowest hover:bg-surface-variant rounded-lg border border-outline-variant/30 transition-colors"
                    >
                      <span className={`material-symbols-outlined ${hasChildren ? 'text-primary' : 'text-outline'}`}>
                        {hasChildren ? 'folder' : 'folder_open'}
                      </span>
                      <span className="text-body-md font-body-md text-on-surface truncate flex-1 group-hover:text-primary transition-colors">
                        {folder.name}
                      </span>
                      {hasChildren && (
                        <span className="material-symbols-outlined text-outline-variant shrink-0">chevron_right</span>
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectFolder(folder);
                        onClose();
                      }}
                      className="shrink-0 flex items-center justify-center bg-secondary-container hover:bg-secondary text-on-secondary-container hover:text-on-secondary px-4 py-3 rounded-lg border border-outline-variant/30 transition-colors"
                      title="이 폴더를 데이터 동기화 대상으로 선택합니다"
                    >
                      <span className="text-label-md font-medium whitespace-nowrap">선택</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
