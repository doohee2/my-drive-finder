"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { useSelectedFolder } from "@/hooks/useSelectedFolder";
import { useDriveSync } from "@/hooks/useDriveSync";

export function Header() {
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  
  const [selectedFolder] = useSelectedFolder();
  const { isSyncing, syncProgress, lastSyncTime, sync } = useDriveSync(selectedFolder?.id);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <>
      <header className="flex justify-between items-center px-margin-mobile md:px-margin-desktop py-4 w-full sticky top-0 z-50 bg-surface dark:bg-surface-dim shadow-sm">
        <div className="flex items-center gap-3">
          <img 
            src="/icon-192x192.png" 
            alt="My Drive Finder Logo" 
            className="w-8 h-8 rounded-lg shadow-sm"
          />
          <div className="flex items-center gap-1">
            <span className="text-headline-md font-headline-md text-on-surface dark:text-inverse-on-surface">
              My Drive Finder
            </span>
            <button 
              onClick={() => setIsInfoOpen(true)}
              className="text-outline hover:text-primary transition-colors flex items-center justify-center p-1 rounded-full hover:bg-surface-variant"
              aria-label="앱 정보"
            >
              <span className="material-symbols-outlined text-[20px]">info</span>
            </button>
          </div>
        </div>
      <div className="flex items-center gap-4">
        {selectedFolder && (
          <div className="hidden md:flex items-center gap-2 text-label-sm font-label-sm text-on-surface-variant bg-surface-container-highest px-3 py-1.5 rounded-full">
            {isSyncing ? (
              <>
                <span className="material-symbols-outlined text-primary animate-spin text-sm">refresh</span>
                <span className="truncate max-w-[200px]">{syncProgress || "동기화 중..."}</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-secondary-fixed"></span>
                {lastSyncTime ? `동기화됨 (${new Date(lastSyncTime).toLocaleTimeString()})` : "동기화 대기 중"}
              </>
            )}
          </div>
        )}
        
        {/* Dark Mode Toggle */}
        <button 
          onClick={toggleTheme}
          className="text-on-surface-variant hover:bg-surface-variant/50 p-2 rounded-full transition-colors flex items-center justify-center"
          aria-label="Toggle Dark Mode"
        >
          {mounted ? (
            <span className="material-symbols-outlined">
              {theme === "dark" ? "light_mode" : "dark_mode"}
            </span>
          ) : (
            <span className="material-symbols-outlined">dark_mode</span>
          )}
        </button>

        <button 
          onClick={() => sync()}
          disabled={!selectedFolder || isSyncing}
          className="text-on-surface-variant hover:bg-surface-variant/50 p-2 rounded-full transition-colors flex items-center justify-center disabled:opacity-50"
        >
          <span className={`material-symbols-outlined ${isSyncing ? "animate-spin" : ""}`} data-icon="sync">
            sync
          </span>
        </button>
        
        {session ? (
          <button 
            onClick={() => signOut()}
            className="text-on-surface-variant hover:bg-surface-variant/50 p-1 rounded-full transition-colors flex items-center justify-center overflow-hidden"
            title="로그아웃"
          >
            <img
              alt="User profile"
              className="w-8 h-8 rounded-full object-cover"
              src={session.user?.image || "https://lh3.googleusercontent.com/aida-public/AB6AXuDqKLuYp2yN9FVaUYYxOoMvjYUCPygVIfzv0nINbGRqEt6HpS27nlmd1HyL3PWm_n47Jh-xxURjXrg_woQenFkJEGc11NP6zLsTL9pfWL3qXkVNaRp6Q2-3xWMGANqa0udiGtEWaRoVFJzrlc9zjrYKVzDTaQ-OFLxVIm8_Wc0fCBjU7F8NlJbXDuYjYPOtVJTEqQ37SY2dfXnJMASWoVq-7U7VXeksJtM75FvPKbb9lBSODrSEqS2G"}
            />
          </button>
        ) : (
          <button 
            onClick={() => signIn("google")}
            className="text-label-md font-label-md text-primary hover:bg-primary/10 px-4 py-2 rounded-full transition-colors font-medium border border-primary/20"
          >
            로그인
          </button>
        )}
      </div>
      </header>

      {/* Info Modal */}
      {isInfoOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={() => setIsInfoOpen(false)}>
          <div className="bg-surface dark:bg-surface-dim w-full max-w-sm rounded-2xl shadow-xl p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-headline-sm font-headline-sm text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">info</span>
                안내
              </h3>
              <button onClick={() => setIsInfoOpen(false)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <p className="text-body-md font-body-md text-on-surface-variant leading-relaxed">
              My Drive Finder 페이지는 구글 드라이브의 특정 폴더를 지정해서 해당 폴더의 csv, xlsx 파일의 내용을 검색하는 반응형 웹 기반 앱입니다. 현재 테스트 계정으로 등록된 사용자만 이용할 수 있습니다.
            </p>
            <div className="mt-6 flex justify-end">
              <button 
                onClick={() => setIsInfoOpen(false)}
                className="bg-primary hover:bg-primary/90 text-on-primary px-4 py-2 rounded-lg text-label-md font-medium transition-colors"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
