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
      <header className="sticky top-0 z-50 w-full bg-surface-container-lowest border-b border-outline-variant/10 shadow-sm transition-colors duration-300">
        <div className="flex h-12 md:h-16 items-center px-2 md:px-6 w-full max-w-[1440px] mx-auto gap-1.5 md:gap-2">
          <div className="flex items-center gap-2 md:gap-3">
            <img
              src={mounted && theme === "dark" ? "/icon-192x192-dark.png" : "/icon-192x192.png"}
              alt="Drive Finder Logo"
              className="w-8 h-8 rounded-lg shadow-sm transition-opacity duration-300"
            />
            <div className="flex items-center gap-1">
              <svg viewBox="0 0 250 60" className="h-[26px] sm:h-[32px] w-auto drop-shadow-sm ml-1" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ fontFamily: 'var(--font-plus-jakarta-sans), sans-serif' }}>
                <text x="0" y="45" fontWeight="800" fontSize="42" letterSpacing="-0.02em" fill={mounted && theme === 'dark' ? '#ffffff' : '#0058bd'} className="transition-colors duration-300">Drive</text>
                <text x="110" y="45" fontWeight="700" fontSize="42" letterSpacing="-0.02em" fill={mounted && theme === 'dark' ? '#ffffff' : '#191b22'} className="transition-colors duration-300">Finder</text>
              </svg>
              <button
                onClick={() => setIsInfoOpen(true)}
                className="text-outline hover:text-primary transition-colors flex items-center justify-center p-1 rounded-full hover:bg-surface-variant"
                aria-label="앱 정보"
              >
                <span className="material-symbols-outlined text-[20px]">info</span>
              </button>
            </div>
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
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
                className="text-on-surface-variant hover:bg-surface-variant/50 p-1.5 rounded-full transition-colors flex items-center justify-center overflow-hidden ml-1"
                title="로그아웃"
              >
                <img
                  alt="User profile"
                  className="w-7 h-7 rounded-full object-cover"
                  src={session.user?.image || "https://lh3.googleusercontent.com/aida-public/AB6AXuDqKLuYp2yN9FVaUYYxOoMvjYUCPygVIfzv0nINbGRqEt6HpS27nlmd1HyL3PWm_n47Jh-xxURjXrg_woQenFkJEGc11NP6zLsTL9pfWL3qXkVNaRp6Q2-3xWMGANqa0udiGtEWaRoVFJzrlc9zjrYKVzDTaQ-OFLxVIm8_Wc0fCBjU7F8NlJbXDuYjYPOtVJTEqQ37SY2dfXnJMASWoVq-7U7VXeksJtM75FvPKbb9lBSODrSEqS2G"}
                />
              </button>
            ) : (
              <button
                onClick={() => signIn("google")}
                className="text-on-surface-variant hover:bg-surface-variant/50 p-2 rounded-full transition-colors flex items-center justify-center ml-1"
                title="로그인"
              >
                <span className="material-symbols-outlined text-[24px]">account_circle</span>
              </button>
            )}
          </div>
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
