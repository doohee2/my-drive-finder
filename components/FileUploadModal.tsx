"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { fetchWithSessionRetry } from "@/lib/fetchWithSessionRetry";

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: File;
  targetFolder: { id: string; name: string };
}

export function FileUploadModal({ isOpen, onClose, file, targetFolder }: FileUploadModalProps) {
  const { data: session } = useSession();
  const [uploadingMode, setUploadingMode] = useState<'proxy' | 'direct' | 'completed' | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 KB";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    if (i === 0) return bytes + " Bytes";
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const stopUpload = () => {
    if (abortController) {
      abortController.abort();
    }
  };

  const handleProxyUpload = async () => {
    if (uploadingMode) return;
    if (file.size > 4.5 * 1024 * 1024) {
      alert("4.5MB 이상의 파일은 Vercel 프록시 제약으로 인해 다이렉트 업로드 방식을 사용해야 합니다.");
      return;
    }
    
    setUploadingMode('proxy');
    setUploadProgress(0);
    const controller = new AbortController();
    setAbortController(controller);
    
    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setUploadProgress(event.loaded);
          }
        };
        
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(xhr.responseText || "업로드 실패"));
          }
        };
        
        xhr.onerror = () => reject(new Error("네트워크 오류"));
        xhr.onabort = () => reject(new Error("AbortError"));
        
        controller.signal.addEventListener('abort', () => xhr.abort());
        
        xhr.open('POST', '/api/drive/upload');
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folderId', targetFolder.id);
        xhr.send(formData);
      });
      
      setUploadingMode('completed');
    } catch (err: any) {
      if (err.message === 'AbortError' || err.name === 'AbortError') {
        // 취소된 경우 조용히 처리하거나 알림 후 리셋
      } else {
        alert("오류: " + err.message);
      }
      setUploadingMode(null);
      setUploadProgress(0);
    } finally {
      setAbortController(null);
    }
  };

  const handleDirectUpload = async () => {
    if (uploadingMode) return;
    if (!session?.accessToken) {
      alert("액세스 토큰이 없습니다. 다시 로그인해 주세요.");
      return;
    }
    
    setUploadingMode('direct');
    setUploadProgress(0);
    const controller = new AbortController();
    setAbortController(controller);
    
    try {
      // Step 1: Initialize Resumable Upload
      const metadata = {
        name: file.name,
        parents: [targetFolder.id]
      };
      
      const initRes = await fetchWithSessionRetry('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
          'X-Upload-Content-Type': file.type || 'application/octet-stream',
          'X-Upload-Content-Length': file.size.toString()
        },
        body: JSON.stringify(metadata),
        signal: controller.signal
      });
      
      if (!initRes.ok) throw new Error("업로드 초기화 실패");
      
      const locationUrl = initRes.headers.get('Location');
      if (!locationUrl) throw new Error("업로드 주소를 받지 못했습니다.");
      
      // Step 2: Upload File Content with Progress
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setUploadProgress(event.loaded);
          }
        };
        
        xhr.onload = () => {
          if (xhr.status === 200 || xhr.status === 201) {
            resolve();
          } else {
            reject(new Error(xhr.responseText || "업로드 실패"));
          }
        };
        
        xhr.onerror = () => reject(new Error("네트워크 오류"));
        xhr.onabort = () => reject(new Error("AbortError"));
        
        controller.signal.addEventListener('abort', () => xhr.abort());
        
        xhr.open('PUT', locationUrl);
        xhr.send(file);
      });
      
      setUploadingMode('completed');
    } catch (err: any) {
      if (err.message === 'AbortError' || err.name === 'AbortError') {
        // 취소된 경우 조용히 리셋
      } else {
        alert("오류: " + err.message);
      }
      setUploadingMode(null);
      setUploadProgress(0);
    } finally {
      setAbortController(null);
    }
  };

  const renderButtonContent = (mode: 'proxy' | 'direct' | 'completed', text: string) => {
    const isThisMode = uploadingMode === mode || (uploadingMode === 'completed' && mode === 'completed');
    if (!isThisMode && uploadingMode !== 'completed') return text;
    
    const percent = file.size > 0 ? Math.min(100, Math.round((uploadProgress / file.size) * 100)) : 100;
    const isCompleted = uploadingMode === 'completed';
    const displayPercent = isCompleted ? 100 : percent;
    const displayProgress = isCompleted ? file.size : uploadProgress;
    
    return (
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-lg">
        <div 
          className={`absolute left-0 top-0 bottom-0 transition-all duration-300 ease-out ${isCompleted ? 'bg-primary/20' : (mode === 'direct' ? 'bg-black/20 dark:bg-white/20' : 'bg-primary/20')}`} 
          style={{ width: `${displayPercent}%` }}
        />
        <span className="relative z-10 flex items-center gap-2">
          {isCompleted ? '업로드 완료' : text} ({displayPercent}%)
          <span className="text-[11px] font-normal opacity-80">
            {formatBytes(displayProgress)} / {formatBytes(file.size)}
          </span>
        </span>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-surface-dim/80 backdrop-blur-sm p-4">
      <div className="bg-surface-container-highest w-full max-w-sm rounded-xl p-6 shadow-2xl flex flex-col gap-4 border border-outline-variant/30">
        <div className="flex justify-between items-center text-primary mb-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-4xl">upload</span>
            <h3 className="text-headline-sm font-bold">업로드 확인</h3>
          </div>
          <button 
            onClick={onClose} 
            disabled={!!uploadingMode}
            className={`p-1 rounded-full transition-colors ${uploadingMode ? 'text-on-surface-variant/30 cursor-not-allowed' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-variant'}`}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <div className="flex flex-col gap-2 my-2 text-center">
          <p className="text-body-sm text-on-surface-variant">대상 폴더: <span className="font-bold text-on-surface">{targetFolder.name}</span></p>
          <p className="text-title-md text-primary break-all font-bold bg-primary/10 py-3 px-4 rounded-lg border border-primary/20 mt-2">
            {file.name}
          </p>
          <p className="text-label-md text-on-surface-variant font-medium">
            (크기: {formatBytes(file.size)})
          </p>
        </div>
        
        <div className="flex flex-col gap-2 w-full mt-2">
          {uploadingMode ? (
             uploadingMode === 'completed' ? (
               <button
                 onClick={() => {
                   setUploadingMode(null);
                   setUploadProgress(0);
                   onClose();
                 }}
                 className="w-full py-3 rounded-lg text-label-lg font-bold bg-primary text-on-primary hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 shadow-sm"
               >
                 <span className="material-symbols-outlined text-[18px]">check</span>
                 완료
               </button>
             ) : (
               <button
                 onClick={stopUpload}
                 className="w-full py-3 rounded-lg text-label-lg font-bold border border-error/30 bg-error/10 text-error hover:bg-error/20 transition-colors flex items-center justify-center gap-2"
               >
                 <span className="material-symbols-outlined text-[18px]">stop</span>
                 취소
               </button>
             )
          ) : (
            <>
              <button 
                onClick={handleProxyUpload}
                disabled={!!uploadingMode}
                className="w-full h-12 rounded-lg text-label-lg font-bold bg-surface-container-high text-on-surface hover:bg-surface-variant border border-outline-variant/30 transition-colors relative overflow-hidden"
              >
                일반 업로드 (Proxy)
              </button>
              
              <button 
                onClick={handleDirectUpload}
                disabled={!!uploadingMode}
                className="w-full h-12 rounded-lg text-label-lg font-bold bg-primary text-on-primary hover:bg-primary/90 transition-colors shadow-sm relative overflow-hidden"
              >
                다이렉트 업로드 (Google API)
              </button>
              
              <button 
                onClick={onClose}
                disabled={!!uploadingMode}
                className="w-full py-3 rounded-lg text-label-lg font-bold text-on-surface-variant hover:bg-surface-variant hover:text-on-surface transition-colors mt-2"
              >
                취소
              </button>
            </>
          )}
          
          {uploadingMode && (
            <div className="mt-4 h-12 rounded-lg bg-surface-container-low border border-outline-variant/30 relative overflow-hidden">
              {uploadingMode === 'completed' 
                ? renderButtonContent('completed', '업로드 완료') 
                : renderButtonContent(uploadingMode, '진행 중')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
