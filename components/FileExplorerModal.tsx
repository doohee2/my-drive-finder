"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

interface DriveItem {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
}

interface FileExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FileExplorerModal({ isOpen, onClose }: FileExplorerModalProps) {
  const { data: session } = useSession();
  const [folders, setFolders] = useState<DriveItem[]>([]);
  const [files, setFiles] = useState<DriveItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  
  // Navigation state
  const [pathStack, setPathStack] = useState<{id: string, name: string}[]>([{ id: 'root', name: '내 드라이브' }]);

  useEffect(() => {
    if (isOpen && session) {
      fetchContents(pathStack[pathStack.length - 1].id);
    }
    
    // Lock body scroll when modal is open
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      // Reset state on close
      setPathStack([{ id: 'root', name: '내 드라이브' }]);
      setFolders([]);
      setFiles([]);
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, session]);

  const fetchContents = async (folderId: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/drive/explore?folderId=${folderId}`);
      if (!res.ok) throw new Error("Failed to fetch folder contents");
      
      const data = await res.json();
      setFolders(data.folders || []);
      setFiles(data.files || []);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const navigateTo = (folderId: string, folderName: string) => {
    setPathStack(prev => [...prev, { id: folderId, name: folderName }]);
    fetchContents(folderId);
  };

  const navigateUpTo = (index: number) => {
    const newStack = pathStack.slice(0, index + 1);
    setPathStack(newStack);
    fetchContents(newStack[newStack.length - 1].id);
  };

  const handleDownload = async (file: DriveItem) => {
    if (downloadingId) return; // Prevent multiple downloads at once
    setDownloadingId(file.id);
    
    try {
      const res = await fetch(`/api/drive/download?fileId=${file.id}&mimeType=${encodeURIComponent(file.mimeType)}`);
      if (!res.ok) throw new Error("다운로드에 실패했습니다.");
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Determine correct extension for Google Workspace files if needed
      let finalName = file.name;
      if (file.mimeType === 'application/vnd.google-apps.spreadsheet' && !finalName.endsWith('.xlsx')) finalName += '.xlsx';
      if (file.mimeType === 'application/vnd.google-apps.document' && !finalName.endsWith('.docx')) finalName += '.docx';
      if (file.mimeType === 'application/vnd.google-apps.presentation' && !finalName.endsWith('.pptx')) finalName += '.pptx';

      const a = document.createElement('a');
      a.href = url;
      a.download = finalName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDownloadingId(null);
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) return 'data_table';
    if (mimeType.includes('document') || mimeType.includes('word')) return 'description';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'slideshow';
    if (mimeType.includes('image')) return 'image';
    if (mimeType.includes('pdf')) return 'picture_as_pdf';
    return 'insert_drive_file';
  };

  const formatBytes = (bytesStr?: string) => {
    if (!bytesStr) return "";
    const bytes = parseInt(bytesStr, 10);
    if (isNaN(bytes)) return "";
    if (bytes === 0) return "0 KB";
    
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    // Bytes도 최소 KB로 표시하도록 조정 (선택사항이지만 더 깔끔할 수 있음, 여기서는 원본 그대로)
    if (i === 0) return bytes + " Bytes";
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-surface dark:bg-surface-dim w-full max-w-2xl rounded-2xl shadow-xl flex flex-col max-h-[85vh] overflow-hidden">
        <div className="p-4 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-low">
          <h2 className="text-headline-md font-headline-md text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">download</span>
            다운로드 파일 선택
          </h2>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface p-1 rounded-full hover:bg-surface-variant transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        
        {/* Breadcrumbs */}
        {!error && session && pathStack.length > 1 && (
          <div className="px-4 py-3 bg-surface-container-lowest border-b border-outline-variant/30 flex flex-wrap items-center gap-1 overflow-hidden">
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
            <div className="text-center text-on-surface-variant py-8">로그인이 필요합니다.</div>
          ) : loading ? (
            <div className="text-center text-on-surface-variant py-8 flex items-center justify-center gap-2">
              <span className="material-symbols-outlined animate-spin">refresh</span>
              항목을 불러오는 중...
            </div>
          ) : error ? (
            <div className="text-error text-center py-8">{error}</div>
          ) : folders.length === 0 && files.length === 0 ? (
            <div className="text-center text-on-surface-variant py-12 flex flex-col items-center">
              <span className="material-symbols-outlined text-4xl text-outline mb-2">folder_open</span>
              <p>이 위치에는 폴더나 파일이 없습니다.</p>
            </div>
          ) : (
            <ul className="space-y-2 pb-4">
              {folders.map((folder) => (
                <li key={folder.id} className="flex items-center gap-2 group">
                  <button
                    onClick={() => navigateTo(folder.id, folder.name)}
                    className="flex-1 flex items-center gap-3 p-2.5 text-left bg-surface-container-lowest hover:bg-surface-variant rounded-lg border border-outline-variant/30 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px] text-outline icon-fill">folder</span>
                    <span className="text-body-sm font-medium text-on-surface truncate flex-1 group-hover:text-primary transition-colors">
                      {folder.name}
                    </span>
                    <span className="material-symbols-outlined text-outline-variant shrink-0 text-[18px]">chevron_right</span>
                  </button>
                </li>
              ))}
              
              {folders.length > 0 && files.length > 0 && <hr className="border-outline-variant/20 my-2" />}

              {files.map((file) => (
                <li key={file.id} className="flex items-center gap-2 group">
                  <div className="flex-1 min-w-0 flex items-center gap-3 p-2.5 bg-surface-container-lowest border border-outline-variant/30 rounded-lg">
                    <span className="material-symbols-outlined text-[20px] text-secondary icon-fill shrink-0">
                      {getFileIcon(file.mimeType)}
                    </span>
                    <div className="flex-1 min-w-0 flex items-baseline gap-2 truncate">
                      <span className="text-body-sm font-medium text-on-surface truncate">
                        {file.name}
                      </span>
                      {file.size && (
                        <span className="text-[11px] text-on-surface-variant shrink-0">
                          {formatBytes(file.size)}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownload(file)}
                    disabled={downloadingId === file.id}
                    className={`shrink-0 flex items-center justify-center px-3 py-1.5 rounded-lg border border-outline-variant/30 transition-colors ${
                      downloadingId === file.id
                        ? 'bg-surface-variant text-on-surface-variant cursor-not-allowed opacity-70'
                        : 'bg-surface-container-high hover:bg-surface-variant text-on-surface-variant hover:text-on-surface'
                    }`}
                    title="이 파일을 로컬로 다운로드합니다"
                  >
                    {downloadingId === file.id ? (
                      <span className="material-symbols-outlined animate-spin text-[16px]">refresh</span>
                    ) : (
                      <span className="text-[12px] font-medium whitespace-nowrap">다운로드</span>
                    )}
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
