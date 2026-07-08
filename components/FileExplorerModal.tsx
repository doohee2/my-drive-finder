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
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [selectedForDownload, setSelectedForDownload] = useState<DriveItem | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
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

  const handleClose = () => {
    if (downloadingId) return; // Prevent close during download
    onClose();
  };

  const confirmDownload = (file: DriveItem) => {
    setSelectedForDownload(file);
  };

  const cancelDownloadPrompt = () => {
    setSelectedForDownload(null);
  };

  const stopDownload = () => {
    if (abortController) {
      abortController.abort();
    }
  };

  const handleNativeDownload = () => {
    if (!selectedForDownload) return;
    const file = selectedForDownload;
    
    let finalName = file.name;
    if (file.mimeType === 'application/vnd.google-apps.spreadsheet' && !finalName.endsWith('.xlsx')) finalName += '.xlsx';
    if (file.mimeType === 'application/vnd.google-apps.document' && !finalName.endsWith('.docx')) finalName += '.docx';
    if (file.mimeType === 'application/vnd.google-apps.presentation' && !finalName.endsWith('.pptx')) finalName += '.pptx';

    const downloadUrl = `/api/drive/download?fileId=${file.id}&mimeType=${encodeURIComponent(file.mimeType)}&filename=${encodeURIComponent(finalName)}`;
    
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = finalName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    
    setSelectedForDownload(null);
  };

  const handleDirectDownload = async () => {
    if (!selectedForDownload || downloadingId) return;
    const file = selectedForDownload;
    
    if (!session?.accessToken) {
      alert("액세스 토큰이 없습니다. 다시 로그인해 주세요.");
      return;
    }

    setDownloadingId(file.id);
    setSelectedForDownload(null);
    setDownloadProgress(0);
    
    const controller = new AbortController();
    setAbortController(controller);
    
    try {
      let url = "";
      let finalName = file.name;
      
      if (file.mimeType === 'application/vnd.google-apps.spreadsheet') {
        url = `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`;
        if (!finalName.endsWith('.xlsx')) finalName += '.xlsx';
      } else {
        url = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`;
        if (file.mimeType === 'application/vnd.google-apps.document' && !finalName.endsWith('.docx')) finalName += '.docx';
        if (file.mimeType === 'application/vnd.google-apps.presentation' && !finalName.endsWith('.pptx')) finalName += '.pptx';
      }

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`
        },
        signal: controller.signal
      });
      
      if (!res.ok) throw new Error("다이렉트 다운로드에 실패했습니다.");
      
      const reader = res.body?.getReader();
      if (!reader) throw new Error("스트림을 읽을 수 없습니다.");
      
      const chunks = [];
      let receivedLength = 0;
      
      while(true) {
        const {done, value} = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          receivedLength += value.length;
          setDownloadProgress(receivedLength);
        }
      }
      
      const blob = new Blob(chunks);
      const objectUrl = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = finalName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(objectUrl);
      
    } catch (err: any) {
      if (err.name === 'AbortError') {
        alert("다운로드가 취소되었습니다.");
      } else {
        alert(err.message);
      }
    } finally {
      setDownloadingId(null);
      setDownloadProgress(0);
      setAbortController(null);
    }
  };

  const handleDownload = async () => {
    if (!selectedForDownload || downloadingId) return;
    const file = selectedForDownload;
    
    setDownloadingId(file.id);
    setDownloadProgress(0);
    setSelectedForDownload(null);
    
    const controller = new AbortController();
    setAbortController(controller);
    
    try {
      const res = await fetch(`/api/drive/download?fileId=${file.id}&mimeType=${encodeURIComponent(file.mimeType)}`, {
        signal: controller.signal
      });
      if (!res.ok) throw new Error("다운로드에 실패했습니다.");
      
      const reader = res.body?.getReader();
      if (!reader) throw new Error("스트림을 읽을 수 없습니다.");
      
      const chunks = [];
      let receivedLength = 0;
      
      while(true) {
        const {done, value} = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          receivedLength += value.length;
          setDownloadProgress(receivedLength);
        }
      }
      
      const blob = new Blob(chunks);
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
      if (err.name === 'AbortError') {
        alert("다운로드가 취소되었습니다.");
      } else {
        alert(err.message);
      }
    } finally {
      setDownloadingId(null);
      setDownloadProgress(0);
      setAbortController(null);
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
      <div className="bg-surface dark:bg-surface-dim w-full max-w-2xl rounded-2xl shadow-xl flex flex-col max-h-[85vh] overflow-hidden relative">
        <div className="p-4 border-b border-outline-variant/30 bg-surface-container-low shrink-0 flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <h2 className="text-headline-md font-headline-md text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">download</span>
              다운로드 파일 선택
            </h2>
            <button 
              onClick={handleClose} 
              disabled={!!downloadingId}
              className={`p-1 rounded-full transition-colors ${downloadingId ? 'text-on-surface-variant/30 cursor-not-allowed' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-variant'}`}
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          
          {/* Breadcrumbs */}
          {!error && session && (
            <div className="flex items-center overflow-hidden w-full pt-2">
              <div className="flex flex-wrap items-center gap-1 overflow-hidden flex-1 bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-3 py-1.5">
                {pathStack.map((step, idx) => (
                  <div key={step.id} className="flex items-center shrink-0">
                    <button
                      onClick={() => navigateUpTo(idx)}
                      className={`text-body-sm font-medium hover:underline ${idx === pathStack.length - 1 ? 'text-on-surface font-bold' : 'text-on-surface-variant hover:text-primary'}`}
                    >
                      {step.name}
                    </button>
                    {idx < pathStack.length - 1 && (
                      <span className="material-symbols-outlined text-outline-variant text-sm mx-1">chevron_right</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

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

              {files.map((file) => {
                const isDownloading = downloadingId === file.id;
                let progressPercent = 0;
                let progressText = "";
                
                if (isDownloading) {
                  const fileSizeNum = file.size ? parseInt(file.size, 10) : 0;
                  if (fileSizeNum > 0) {
                    progressPercent = Math.min(100, Math.round((downloadProgress / fileSizeNum) * 100));
                    progressText = `${formatBytes(downloadProgress.toString())} / ${formatBytes(file.size)} (${progressPercent}%)`;
                  } else {
                    progressPercent = 100;
                    progressText = `${formatBytes(downloadProgress.toString())} 다운로드 됨...`;
                  }
                }

                return (
                <li key={file.id} className="flex flex-col gap-1 relative group">
                  <div className="flex items-center gap-2 relative z-10">
                    <div className={`flex-1 min-w-0 flex items-center gap-3 p-2.5 rounded-lg border transition-colors relative overflow-hidden ${isDownloading ? 'bg-transparent border-primary/30' : 'bg-surface-container-lowest border-outline-variant/30'}`}>
                      {/* Gauge Bar Background */}
                      {isDownloading && (
                        <div 
                          className="absolute left-0 top-0 bottom-0 bg-primary/10 transition-all duration-300 ease-out z-0" 
                          style={{ width: file.size ? `${progressPercent}%` : '100%' }}
                        />
                      )}
                      <span className="material-symbols-outlined text-[20px] text-secondary icon-fill shrink-0 relative z-10">
                        {getFileIcon(file.mimeType)}
                      </span>
                      <div className="flex-1 min-w-0 flex flex-col justify-center relative z-10">
                        <div className="flex items-baseline gap-2 truncate">
                          <span className="text-body-sm font-medium text-on-surface truncate">
                            {file.name}
                          </span>
                          {!isDownloading && file.size && (
                            <span className="text-[11px] text-on-surface-variant shrink-0">
                              {formatBytes(file.size)}
                            </span>
                          )}
                        </div>
                        {isDownloading && (
                          <span className="text-[11px] text-primary font-medium mt-0.5">
                            {progressText}
                          </span>
                        )}
                      </div>
                    </div>
                    {isDownloading ? (
                      <button
                        onClick={stopDownload}
                        className="shrink-0 flex items-center justify-center px-3 py-1.5 rounded-lg border border-error/30 bg-error/10 text-error hover:bg-error/20 transition-colors"
                        title="다운로드를 취소합니다"
                      >
                        <span className="material-symbols-outlined text-[16px] mr-1">stop</span>
                        <span className="text-[12px] font-medium whitespace-nowrap">정지</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => confirmDownload(file)}
                        disabled={!!downloadingId}
                        className={`shrink-0 flex items-center justify-center px-3 py-1.5 rounded-lg border border-outline-variant/30 transition-colors ${
                          downloadingId
                            ? 'bg-surface-variant text-on-surface-variant cursor-not-allowed opacity-70'
                            : 'bg-surface-container-high hover:bg-surface-variant text-on-surface-variant hover:text-on-surface'
                        }`}
                        title="이 파일을 로컬로 다운로드합니다"
                      >
                        <span className="text-[12px] font-medium whitespace-nowrap">다운로드</span>
                      </button>
                    )}
                  </div>
                </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
      {/* Confirmation Overlay */}
      {selectedForDownload && (
        <div className="absolute inset-0 z-[110] flex items-center justify-center bg-surface-dim/80 backdrop-blur-sm p-4">
          <div className="bg-surface-container-highest w-full max-w-sm rounded-xl p-6 shadow-2xl flex flex-col gap-4 border border-outline-variant/30">
            <div className="flex flex-col items-center gap-2 text-primary mb-2">
              <span className="material-symbols-outlined text-4xl">download</span>
              <h3 className="text-headline-sm font-bold">다운로드 확인</h3>
            </div>
            <div className="flex flex-col gap-2 my-2 text-center">
              <p className="text-title-md text-primary break-all font-bold bg-primary/10 py-3 px-4 rounded-lg border border-primary/20">
                {selectedForDownload.name}
              </p>
              <p className="text-label-md text-on-surface-variant font-medium">
                ({selectedForDownload.size ? formatBytes(selectedForDownload.size) : "구글 워크스페이스 포맷은 다운로드 완료 후 용량이 결정됩니다"})
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full mt-2">
              <button 
                onClick={handleDownload}
                className="w-full py-3 rounded-lg text-label-lg font-bold bg-surface-container-high text-on-surface hover:bg-surface-variant border border-outline-variant/30 transition-colors"
              >
                일반 다운로드 (Proxy)
              </button>
              <button 
                onClick={handleNativeDownload}
                className="w-full py-3 rounded-lg text-label-lg font-bold bg-surface-container-high text-on-surface hover:bg-surface-variant border border-outline-variant/30 transition-colors"
              >
                브라우저 다운로드 (Proxy, 백그라운드)
              </button>
              <button 
                onClick={handleDirectDownload}
                className="w-full py-3 rounded-lg text-label-lg font-bold bg-primary text-on-primary hover:bg-primary/90 transition-colors shadow-sm"
              >
                다이렉트 다운로드 (Google API)
              </button>
              <button 
                onClick={cancelDownloadPrompt}
                className="w-full py-3 rounded-lg text-label-lg font-bold text-on-surface-variant hover:bg-surface-variant hover:text-on-surface transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
