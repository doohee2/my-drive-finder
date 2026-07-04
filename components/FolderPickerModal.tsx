"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

interface Folder {
  id: string;
  name: string;
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

  useEffect(() => {
    if (isOpen && session) {
      fetchFolders();
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
      setFolders(data.folders || []);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-surface dark:bg-surface-dim w-full max-w-md rounded-2xl shadow-xl flex flex-col max-h-[80vh] overflow-hidden">
        <div className="p-4 border-b border-outline-variant/30 flex justify-between items-center">
          <h2 className="text-headline-md font-headline-md text-on-surface">폴더 선택</h2>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        
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
          ) : folders.length === 0 ? (
            <div className="text-center text-on-surface-variant py-8">
              선택 가능한 폴더가 없습니다.
            </div>
          ) : (
            <ul className="space-y-2">
              {folders.map((folder) => (
                <li key={folder.id}>
                  <button
                    onClick={() => {
                      onSelectFolder(folder);
                      onClose();
                    }}
                    className="w-full flex items-center gap-3 p-3 text-left bg-surface-container-lowest hover:bg-surface-variant rounded-lg border border-outline-variant/30 transition-colors"
                  >
                    <span className="material-symbols-outlined text-primary">folder</span>
                    <span className="text-body-md font-body-md text-on-surface truncate">{folder.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
